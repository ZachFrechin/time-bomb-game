<template>
  <div class="flex flex-col h-full max-h-screen space-y-2 overflow-hidden">
    <!-- Code de salle et bouton copier en haut -->
    <div class="card p-3">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-300">Code salle</h3>
          <p class="text-lg font-mono font-bold text-blue-400">{{ gameStore.room?.id }}</p>
        </div>
        <button @click="copyRoomId" class="btn-secondary text-xs px-3 py-1">
          📋 Copier
        </button>
      </div>
    </div>

    <!-- Liste des joueurs compacte -->
    <div class="card p-3 flex-shrink-0">
      <h2 class="text-base font-semibold mb-2">Joueurs ({{ gameStore.room?.players.length }}/{{ gameStore.room?.options.maxPlayers }})</h2>
      <div class="space-y-1">
        <div v-for="player in gameStore.room?.players" :key="player.id"
             class="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
          <div class="flex items-center space-x-2">
            <div :class="[
              'w-2 h-2 rounded-full',
              player.isConnected ? 'bg-green-500' : 'bg-gray-500'
            ]"></div>
            <span class="truncate max-w-24">{{ player.displayName }}</span>
            <span v-if="player.isMaster" class="text-xs bg-blue-600 px-1 py-0.5 rounded">
              👑
            </span>
          </div>
          <button v-if="gameStore.isMaster && !player.isMaster"
                  @click="gameStore.kickPlayer(player.id)"
                  class="text-red-400 hover:text-red-300 text-xs px-1">
            ❌
          </button>
        </div>
      </div>
    </div>

    <!-- Options compactes -->
    <div v-if="gameStore.isMaster" class="card p-3">
      <h3 class="text-sm font-semibold mb-2 text-gray-300">Options</h3>
      <div class="text-xs text-gray-400 space-y-1">
        <p>Max: {{ gameStore.room?.options.maxPlayers }} • Fils: {{ gameStore.room?.options.wiresPerPlayer }}</p>
        <p>{{ gameStore.room?.options.isPublic ? 'Publique' : 'Privée' }}</p>
      </div>
    </div>

    <!-- Bouton lancer/attente en bas -->
    <div class="card p-3">
      <div v-if="gameStore.isMaster">
        <button
          @click="startGame"
          :disabled="!canStartGame"
          :class="[
            'w-full py-3 text-base font-semibold rounded',
            canStartGame
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          ]"
        >
          {{ canStartGame ? '🚀 Lancer la partie' : `${4 - (gameStore.room?.players.length || 0)} joueur(s) manquant(s)` }}
        </button>
      </div>
      <div v-else>
        <p class="text-center text-gray-400 text-sm py-2">
          ⏳ En attente du maître de partie...
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGameStore } from '@/stores/game';
import QRCode from 'qrcode';

const gameStore = useGameStore();
const qrCodeUrl = ref('');

const canStartGame = computed(() => {
  const playerCount = gameStore.room?.players.length || 0;
  return playerCount >= 4 && playerCount <= 8;
});

const startGame = () => {
  if (canStartGame.value && gameStore.isMaster) {
    gameStore.startGame();
  }
};

const copyRoomId = async () => {
  if (gameStore.room?.id) {
    try {
      await navigator.clipboard.writeText(gameStore.room.id);
      // TODO: Afficher un toast de confirmation
    } catch (err) {
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = gameStore.room.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
};

const generateQRCode = async () => {
  if (gameStore.room) {
    const url = `${window.location.origin}/join/${gameStore.room.id}`;
    try {
      qrCodeUrl.value = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }
};

onMounted(() => {
  generateQRCode();
});
</script>