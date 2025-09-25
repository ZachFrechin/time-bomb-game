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

// Gérer le changement de visibilité de l'app (quand on change d'app sur mobile)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('App became visible - checking connection')

    // Si on était dans une room, forcer la reconnexion pour s'assurer qu'on est synchronisé
    if (gameStore.room?.id && gameStore.playerId) {
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
  } else if (document.visibilityState === 'hidden') {
    console.log('App became hidden')
    // Optionnel : on peut noter quand l'app est cachée
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
