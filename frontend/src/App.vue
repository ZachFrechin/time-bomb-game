<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import socketService from '@/services/socket'

const gameStore = useGameStore()

// Gérer le changement de visibilité de l'app (quand on change d'app sur mobile)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('App became visible - checking connection')

    // Si on était dans une room et qu'on n'est pas connecté, reconnecter
    if (gameStore.room?.id && !socketService.getSocket()?.connected) {
      console.log('Was in room but disconnected - reconnecting...')
      socketService.connect()
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
