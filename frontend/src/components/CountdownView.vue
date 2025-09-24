<template>
  <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
    <div class="text-center">
      <h2 class="text-2xl font-bold mb-6 text-white">
        🚀 La partie commence dans...
      </h2>

      <div class="text-8xl font-bold text-blue-400 mb-4 animate-pulse">
        {{ countdown }}
      </div>

      <p class="text-lg text-gray-300">
        Préparez-vous !
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const countdown = ref(5);
let intervalId: number | null = null;

const emit = defineEmits<{
  finished: [];
}>();

onMounted(() => {
  intervalId = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (intervalId) {
        clearInterval(intervalId);
      }
      emit('finished');
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>