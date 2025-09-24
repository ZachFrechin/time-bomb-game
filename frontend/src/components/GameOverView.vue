<template>
  <div class="flex flex-col h-full max-h-screen overflow-hidden">
    <!-- Header compact avec résultat -->
    <div class="card p-4 mb-2 flex-shrink-0">
      <h1 class="text-lg sm:text-2xl font-bold text-center"
          :class="gameStore.winner === 'good' ? 'text-blue-400' : 'text-red-400'">
        {{ gameStore.winner === 'good' ? '🕵️ Détectives gagnent!' : '💀 Saboteurs gagnent!' }}
      </h1>
      <p class="text-sm text-center mt-1 text-gray-400">
        {{ gameStore.winner === 'good' ? 'Bombe désamorcée' : 'Bombe explosée' }}
      </p>
    </div>

    <!-- Zone scrollable pour les détails -->
    <div class="flex-1 overflow-y-auto px-4 pb-2">
      <!-- Équipes en une seule ligne sur mobile -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div class="card p-3">
          <h2 class="text-sm font-semibold mb-2 text-blue-400 text-center">🕵️ Détectives</h2>
          <div class="space-y-1">
            <div v-for="player in goodPlayers" :key="player.id"
                 class="px-2 py-1 bg-blue-900 rounded text-xs text-center">
              {{ player.name }}
            </div>
          </div>
        </div>

        <div class="card p-3">
          <h2 class="text-sm font-semibold mb-2 text-red-400 text-center">💀 Saboteurs</h2>
          <div class="space-y-1">
            <div v-for="player in evilPlayers" :key="player.id"
                 class="px-2 py-1 bg-red-900 rounded text-xs text-center">
              {{ player.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats compactes -->
      <div class="card p-3 mb-4">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <p class="text-xs text-gray-400">Trouvés</p>
            <p class="text-lg font-bold text-blue-400">
              {{ gameStore.room?.gameState?.defusesFound || 0 }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Nécessaires</p>
            <p class="text-lg font-bold">
              {{ gameStore.room?.gameState?.totalDefusesNeeded || 0 }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons fixes en bas -->
    <div class="card p-3 flex-shrink-0">
      <div v-if="gameStore.isMaster" class="flex flex-col space-y-2">
        <button @click="restartGame" class="btn-primary py-3 px-4 text-base font-semibold">
          🔄 Relancer la partie
        </button>
        <button @click="newGame" class="btn-secondary py-3 px-4 text-base">
          🏠 Retour au menu
        </button>
      </div>
      <div v-else>
        <button @click="newGame" class="btn-secondary w-full py-3 px-4 text-base">
          🏠 Retour au menu
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