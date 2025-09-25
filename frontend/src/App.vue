<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { socketService } from '@/services/socket'

const gameStore = useGameStore()
const router = useRouter()

// Variable pour tracker si on est sur mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Détecter si c'est une PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              (window.navigator as any).standalone ||
              document.referrer.includes('android-app://')

// Tracker le timestamp de quand l'app devient invisible
let hiddenTimestamp = 0

// Gérer le changement de visibilité de l'app (quand on change d'app sur mobile)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    const now = Date.now()
    const timeSinceHidden = hiddenTimestamp ? now - hiddenTimestamp : 0

    console.log('App became visible - PWA:', isPWA, 'Mobile:', isMobile, 'Time away:', timeSinceHidden + 'ms')

    // Si on était dans une room, forcer la reconnexion pour s'assurer qu'on est synchronisé
    if (gameStore.room?.id && gameStore.playerId) {
      // Pour PWA ou si on a été absent plus de 3 secondes, recharger la page
      if ((isPWA || isMobile) && timeSinceHidden > 3000) {
        console.log('PWA/Mobile detected and was away for', timeSinceHidden, 'ms - reloading page')

        // Sauvegarder les infos dans localStorage avant de recharger
        const sessionData = {
          roomId: gameStore.room.id,
          playerId: gameStore.playerId,
          playerName: gameStore.playerName,
          shouldReconnect: true,
          timestamp: Date.now()
        }
        localStorage.setItem('timebomb-session', JSON.stringify(sessionData))

        // Recharger la page pour forcer une reconnexion propre
        window.location.reload()
        return
      }

      // Sur mobile/PWA avec absence courte, forcer une déconnexion/reconnexion complète
      if (isMobile || isPWA) {
        console.log('Mobile/PWA device - forcing full reconnection')

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
    hiddenTimestamp = Date.now()
    console.log('App became hidden - PWA:', isPWA, 'Mobile:', isMobile)

    // Sur PWA/mobile, sauvegarder l'état au cas où
    if ((isPWA || isMobile) && gameStore.room?.id) {
      console.log('PWA/Mobile app hidden - saving state')
      const sessionData = {
        roomId: gameStore.room.id,
        playerId: gameStore.playerId,
        playerName: gameStore.playerName,
        shouldReconnect: true,
        timestamp: Date.now()
      }
      localStorage.setItem('timebomb-session', JSON.stringify(sessionData))
    }
  }
}

onMounted(async () => {
  // Écouter les changements de visibilité
  document.addEventListener('visibilitychange', handleVisibilityChange)

  console.log('App mounted - PWA:', isPWA, 'Mobile:', isMobile)

  // Essayer de restaurer une session existante au démarrage
  const saved = localStorage.getItem('timebomb-session')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      const now = Date.now()
      const timeSinceSession = now - (data.timestamp || 0)

      // Si la session est récente (moins de 5 minutes) et qu'on doit reconnecter
      if (data.roomId && data.playerId && data.playerName && (data.shouldReconnect || timeSinceSession < 300000)) {
        console.log('Found saved session - reconnecting...')

        // Utiliser la méthode joinRoom du store qui gère tout
        console.log('Using store to rejoin room...')

        try {
          const success = await gameStore.joinRoom(data.roomId, data.playerName, undefined, data.playerId)

          if (success) {
            console.log('Successfully rejoined from saved session')

            // Naviguer vers la room si on n'y est pas déjà
            if (router.currentRoute.value.path !== `/room/${data.roomId}`) {
              console.log('Navigating to room:', data.roomId)
              await router.push(`/room/${data.roomId}`)
            }
          } else {
            console.error('Failed to rejoin from saved session')
            localStorage.removeItem('timebomb-session')
          }
        } catch (error) {
          console.error('Error rejoining room:', error)
          localStorage.removeItem('timebomb-session')
        }
      }
    } catch (e) {
      console.error('Failed to parse saved session:', e)
      localStorage.removeItem('timebomb-session')
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
