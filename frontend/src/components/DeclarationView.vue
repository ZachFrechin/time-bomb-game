<template>
  <!-- Overlay semi-transparent compact centré -->
  <div class="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-2">
    <div class="card max-w-sm w-full mx-auto p-3 bg-gray-800">
      <h2 class="text-sm font-bold text-center mb-2">🔍 Déclaration</h2>

      <div class="space-y-2">
        <!-- Fils sûrs sur une ligne -->
        <div>
          <label class="text-xs font-medium text-gray-400 block mb-1 text-center">
            Fils sûrs: <span class="text-blue-400">🔷</span>
          </label>
          <div class="flex justify-center space-x-1">
            <button
              v-for="n in Math.min(maxSafeWires, 6)"
              :key="n-1"
              @click="declaredSafeWires = n-1"
              :class="[
                'w-9 h-9 rounded font-bold text-sm',
                declaredSafeWires === n-1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              {{ n-1 }}
            </button>
          </div>
        </div>

        <!-- Bombe sur une ligne -->
        <div>
          <label class="text-xs font-medium text-gray-400 block mb-1 text-center">
            Bombe: <span class="text-red-400">💣</span>
          </label>
          <div class="flex space-x-2 justify-center">
            <button
              @click="hasBomb = false"
              :class="[
                'py-2 px-4 rounded font-bold text-sm flex items-center space-x-1',
                !hasBomb ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              <span>✅</span>
              <span>Non</span>
            </button>
            <button
              @click="hasBomb = true"
              :class="[
                'py-2 px-4 rounded font-bold text-sm flex items-center space-x-1',
                hasBomb ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              <span>💣</span>
              <span>Oui</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bouton de validation compact -->
      <div class="mt-3 flex justify-center">
        <button
          @click="submitDeclaration"
          class="btn-primary py-2 px-6 text-sm font-bold"
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