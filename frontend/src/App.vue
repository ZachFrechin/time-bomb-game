<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { socketService } from '@/services/socket'

const gameStore = useGameStore()

// Variable pour tracker si on est sur mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Gérer le changement de visibilité de l'app (quand on change d'app sur mobile)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('App became visible - checking connection (mobile:', isMobile, ')')

    // Si on était dans une room, forcer la reconnexion pour s'assurer qu'on est synchronisé
    if (gameStore.room?.id && gameStore.playerId) {
      // Sur mobile, forcer une déconnexion/reconnexion complète
      if (isMobile) {
        console.log('Mobile device detected - forcing full reconnection')

        // Déconnecter complètement
        socketService.disconnect()

        // Attendre un peu puis reconnecter
        setTimeout(() => {
          console.log('Reconnecting socket...')
          socketService.connect()

          // Attendre que le socket soit connecté puis rejoindre
          setTimeout(() => {
            const socket = socketService.getSocket()
            if (socket?.connected) {
              console.log('Socket connected, rejoining room...')
              socketService.emit('join_room', {
                roomId: gameStore.room.id,
                playerName: gameStore.playerName,
                playerId: gameStore.playerId,
              }, (result: any) => {
                if (result?.success) {
                  console.log('Successfully rejoined room on mobile')
                } else {
                  console.error('Failed to rejoin room on mobile:', result)
                }
              })
            }
          }, 500)
        }, 200)
      } else {
        // Sur desktop, utiliser la logique existante
        const socket = socketService.getSocket()

        if (!socket?.connected) {
          console.log('Socket disconnected - reconnecting...')
          socketService.connect()
        } else {
          // Même si le socket semble connecté, on force un rejoin pour se resynchroniser
          console.log('Socket seems connected but forcing rejoin to sync state...')

          // Envoyer directement la demande de rejoin
          socketService.emit('join_room', {
            roomId: gameStore.room.id,
            playerName: gameStore.playerName,
            playerId: gameStore.playerId,
          }, (result: any) => {
            if (result?.success) {
              console.log('Successfully resynced with room')
            } else {
              console.log('Failed to resync, trying full reconnect...')
              // Si échec, déconnecter et reconnecter
              socketService.disconnect()
              setTimeout(() => {
                socketService.connect()
              }, 100)
            }
          })
        }
      }
    }
  } else if (document.visibilityState === 'hidden') {
    console.log('App became hidden (mobile:', isMobile, ')')

    // Sur mobile, on peut optionnellement déconnecter quand l'app est cachée
    // pour forcer une reconnexion propre au retour
    if (isMobile && gameStore.room?.id) {
      console.log('Mobile app hidden - preparing for reconnection')
      // Ne pas déconnecter ici, laisser le socket timeout naturellement
    }
  }
}

onMounted(() => {
  // Écouter les changements de visibilité
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Essayer de restaurer une session existante au démarrage
  const saved = localStorage.getItem('timebomb-session')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.roomId && data.playerId && data.playerName) {
        console.log('Found saved session - attempting to restore...')
        socketService.connect()
        // Le reste sera géré par la reconnexion automatique
      }
    } catch (e) {
      console.error('Failed to parse saved session:', e)
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style>
#app {
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}
</style>
