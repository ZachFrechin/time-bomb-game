<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div class="card max-w-md w-full mx-4 p-4 sm:p-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 text-blue-400">Time Bomb</h1>

      <div v-if="!showForm" class="space-y-4">
        <button @click="showCreateRoom = true; showForm = true" class="w-full btn-primary text-base sm:text-lg py-2 sm:py-3">
          Créer une partie
        </button>
        <button @click="showJoinRoom = true; showForm = true" class="w-full btn-secondary text-base sm:text-lg py-2 sm:py-3">
          Rejoindre une partie
        </button>
      </div>

      <div v-else-if="showCreateRoom" class="space-y-4">
        <h2 class="text-xl sm:text-2xl font-semibold text-center">Créer une partie</h2>
        <input
          v-model="playerName"
          type="text"
          placeholder="Votre pseudo"
          class="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          maxlength="20"
        />

        <div>
          <label class="block text-sm font-medium mb-2">Nombre de joueurs max</label>
          <select
            v-model.number="maxPlayers"
            class="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option :value="4">4 joueurs</option>
            <option :value="5">5 joueurs</option>
            <option :value="6">6 joueurs</option>
            <option :value="7">7 joueurs</option>
            <option :value="8">8 joueurs</option>
          </select>
        </div>

        <div>
          <label class="flex items-center space-x-2">
            <input v-model="isPublic" type="checkbox" class="rounded">
            <span>Partie publique</span>
          </label>
        </div>

        <div class="flex space-x-2">
          <button @click="createRoom" :disabled="!playerName" class="flex-1 btn-primary">
            Créer
          </button>
          <button @click="resetForm" class="flex-1 btn-secondary">
            Annuler
          </button>
        </div>
      </div>

      <div v-else-if="showJoinRoom" class="space-y-4">
        <h2 class="text-2xl font-semibold text-center">Rejoindre une partie</h2>
        <input
          v-model="playerName"
          type="text"
          placeholder="Votre pseudo"
          class="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          maxlength="20"
        />
        <input
          v-model="roomCode"
          type="text"
          placeholder="Code de la salle"
          class="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none uppercase"
          maxlength="8"
        />

        <div class="flex space-x-2">
          <button @click="joinRoom" :disabled="!playerName || !roomCode" class="flex-1 btn-primary">
            Rejoindre
          </button>
          <button @click="resetForm" class="flex-1 btn-secondary">
            Annuler
          </button>
        </div>
      </div>

      <div v-if="error" class="mt-4 p-3 bg-red-900 text-red-200 rounded">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const gameStore = useGameStore();

const showForm = ref(false);
const showCreateRoom = ref(false);
const showJoinRoom = ref(false);
const playerName = ref('');
const roomCode = ref('');
const maxPlayers = ref(6);
const isPublic = ref(true);
const error = ref('');

const resetForm = () => {
  showForm.value = false;
  showCreateRoom.value = false;
  showJoinRoom.value = false;
  playerName.value = '';
  roomCode.value = '';
  error.value = '';
};

const createRoom = async () => {
  if (!playerName.value) return;

  try {
    error.value = '';
    const roomId = await gameStore.createRoom(playerName.value, {
      maxPlayers: maxPlayers.value,
      isPublic: isPublic.value,
      wiresPerPlayer: 5,
    });

    router.push(`/room/${roomId}`);
  } catch (err) {
    error.value = 'Erreur lors de la création de la partie';
    console.error(err);
  }
};

const joinRoom = async () => {
  if (!playerName.value || !roomCode.value) return;

  try {
    error.value = '';
    const success = await gameStore.joinRoom(roomCode.value.toUpperCase(), playerName.value);

    if (success) {
      router.push(`/room/${roomCode.value.toUpperCase()}`);
    } else {
      error.value = 'Impossible de rejoindre la partie';
    }
  } catch (err) {
    error.value = 'Partie introuvable ou complète';
    console.error(err);
  }
};
</script>