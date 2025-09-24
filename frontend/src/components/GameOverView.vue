<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="card text-center p-8">
      <h1 class="text-2xl sm:text-4xl font-bold mb-4 text-center"
          :class="gameStore.winner === 'good' ? 'text-blue-400' : 'text-red-400'">
        {{ gameStore.winner === 'good' ? '🕵️ Victoire des Détectives!' : '💀 Victoire des Saboteurs!' }}
      </h1>

      <p class="text-lg sm:text-xl mb-8 text-center">
        {{ gameStore.winner === 'good'
          ? 'Les détectives ont désamorcé la bombe avec succès!'
          : 'Les saboteurs ont fait exploser la bombe!' }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 class="text-2xl font-semibold mb-4 text-blue-400">🕵️ Détectives</h2>
          <div class="space-y-2">
            <div v-for="player in goodPlayers" :key="player.id"
                 class="p-3 bg-blue-900 rounded">
              {{ player.name }}
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4 text-red-400">💀 Saboteurs</h2>
          <div class="space-y-2">
            <div v-for="player in evilPlayers" :key="player.id"
                 class="p-3 bg-red-900 rounded">
              {{ player.name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card text-center">
      <p class="mb-4">Statistiques de la partie:</p>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-gray-400">Fils sûrs trouvés</p>
          <p class="text-2xl font-bold text-blue-400">
            {{ gameStore.room?.gameState?.defusesFound || 0 }}
          </p>
        </div>
        <div>
          <p class="text-gray-400">Fils sûrs nécessaires</p>
          <p class="text-2xl font-bold">
            {{ gameStore.room?.gameState?.totalDefusesNeeded || 0 }}
          </p>
        </div>
      </div>
    </div>

    <div class="card text-center space-y-4">
      <div v-if="gameStore.isMaster" class="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
        <button @click="restartGame" class="btn-primary text-base sm:text-lg py-2 sm:py-3 px-4 sm:px-8 w-full sm:w-auto">
          Relancer la partie
        </button>
        <button @click="newGame" class="btn-secondary text-base sm:text-lg py-2 sm:py-3 px-4 sm:px-8 w-full sm:w-auto">
          Retour au menu
        </button>
      </div>
      <div v-else class="flex justify-center">
        <button @click="newGame" class="btn-secondary text-base sm:text-lg py-2 sm:py-3 px-4 sm:px-8 w-full sm:w-auto">
          Retour au menu
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useRouter } from 'vue-router';

const gameStore = useGameStore();
const router = useRouter();

const goodPlayers = computed(() => {
  return gameStore.allPlayersWithRoles.filter(p => p.role === 'good');
});

const evilPlayers = computed(() => {
  return gameStore.allPlayersWithRoles.filter(p => p.role === 'evil');
});

const restartGame = () => {
  gameStore.restartGame();
};

const newGame = () => {
  gameStore.reset();
  router.push('/');
};
</script>