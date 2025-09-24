<template>
  <div class="h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-2 sm:p-4 flex flex-col">
    <div v-if="gameStore.room" class="max-w-7xl mx-auto w-full flex flex-col h-full">
      <div class="mb-3 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 flex-shrink-0">
        <h1 class="text-lg sm:text-3xl font-bold text-blue-400 text-center sm:text-left">
          Salle: {{ gameStore.room.id }}
        </h1>
        <button @click="leaveRoom" class="btn-danger text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2">
          Quitter
        </button>
      </div>

      <div v-if="gameStore.room.state === 'lobby'" class="flex-1 min-h-0">
        <LobbyView />
      </div>

      <div v-else-if="gameStore.room.state === 'in_game'" class="flex-1 min-h-0">
        <GameView />
      </div>

      <div v-else-if="gameStore.room.state === 'finished'">
        <GameOverView />
      </div>
    </div>
    <div v-else class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <p class="text-lg sm:text-xl mb-4">Chargement...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import LobbyView from '@/components/LobbyView.vue';
import GameView from '@/components/GameView.vue';
import GameOverView from '@/components/GameOverView.vue';

const router = useRouter();
const gameStore = useGameStore();

const leaveRoom = () => {
  gameStore.leaveRoom();
  router.push('/');
};

onMounted(() => {
  // Donner un délai pour que la room soit créée via Socket
  if (!gameStore.room) {
    setTimeout(() => {
      if (!gameStore.room) {
        router.push('/');
      }
    }, 1000);
  }
});

onUnmounted(() => {
  if (gameStore.room) {
    gameStore.leaveRoom();
  }
});
</script>