<template>
  <!-- Overlay semi-transparent en bas -->
  <div class="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-50 p-4">
    <div class="card max-w-md mx-auto p-4">
      <h2 class="text-lg font-bold text-center mb-3">🔍 Déclaration</h2>

      <div class="text-center mb-3">
        <p class="text-sm text-gray-400">Déclarez vos cartes aux autres</p>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-2 text-center">
            Fils sûrs déclarés:
          </label>
          <div class="flex justify-center space-x-2 flex-wrap gap-2">
            <button
              v-for="n in maxSafeWires"
              :key="n-1"
              @click="declaredSafeWires = n-1"
              :class="[
                'w-12 h-12 rounded-lg font-bold text-lg',
                declaredSafeWires === n-1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              {{ n-1 }}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1 text-center">
            Max: {{ maxSafeWires - 1 }} fils
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-center">
            Avez-vous la bombe?
          </label>
          <div class="flex space-x-3 justify-center">
            <button
              @click="hasBomb = false"
              :class="[
                'py-3 px-6 rounded-lg font-bold text-lg flex items-center space-x-2',
                !hasBomb ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              <span>✅</span>
              <span>Non</span>
            </button>
            <button
              @click="hasBomb = true"
              :class="[
                'py-3 px-6 rounded-lg font-bold text-lg flex items-center space-x-2',
                hasBomb ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              <span>💣</span>
              <span>Oui</span>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-center">
        <button
          @click="submitDeclaration"
          class="btn-primary py-3 px-8 text-lg font-bold"
        >
          ✓ Valider
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();
const declaredSafeWires = ref(0);
const hasBomb = ref(false);

const emit = defineEmits<{
  close: [declaration: { safeWires: number; hasBomb: boolean }];
}>();

// Calculer le maximum de fils sûrs qu'on peut déclarer
const maxSafeWires = computed(() => {
  const remaining = gameStore.room?.gameState?.totalDefusesNeeded || 0;
  const found = gameStore.room?.gameState?.defusesFound || 0;
  return Math.max(1, remaining - found + 1); // +1 pour inclure 0
});

const submitDeclaration = () => {
  emit('close', {
    safeWires: declaredSafeWires.value,
    hasBomb: hasBomb.value
  });
};
</script>