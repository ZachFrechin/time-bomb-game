<template>
  <div class="card p-2 h-full flex flex-col">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold">💬 Chat</h3>
      <button @click="toggleChat" class="text-xs text-gray-400">
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>

    <div v-if="isExpanded" class="flex-1 flex flex-col min-h-0">
      <div ref="chatContainer" class="bg-gray-700 rounded p-2 flex-1 overflow-y-auto mb-2">
        <div v-if="gameStore.chatMessages.length === 0" class="text-gray-400 text-center text-xs">
          Aucun message
        </div>
        <div v-for="(msg, index) in gameStore.chatMessages" :key="index" class="mb-1">
          <div class="text-xs">
            <span class="font-semibold" :class="msg.playerId === gameStore.playerId ? 'text-blue-400' : 'text-gray-300'">
              {{ msg.playerName }}:
            </span>
            <span class="text-gray-100 ml-1">{{ msg.message }}</span>
          </div>
        </div>
      </div>
      <form @submit.prevent="sendMessage" class="flex space-x-1">
        <input
          v-model="message"
          type="text"
          placeholder="Message..."
          class="flex-1 px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          maxlength="100"
        />
        <button type="submit" :disabled="!message.trim()" class="btn-primary px-2 py-1 text-xs">
          ➤
        </button>
      </form>
    </div>

    <div v-else class="text-xs text-gray-400">
      {{ gameStore.chatMessages.length }} message(s)
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();
const message = ref('');
const chatContainer = ref<HTMLDivElement>();
const isExpanded = ref(false);

const toggleChat = () => {
  isExpanded.value = !isExpanded.value;
};

const sendMessage = () => {
  if (message.value.trim()) {
    gameStore.sendChatMessage(message.value.trim());
    message.value = '';
  }
};

watch(() => gameStore.chatMessages.length, async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
});
</script>