<template>
  <div
    @click="handleClick"
    :class="[
      'wire-card flex items-center justify-center',
      cardClasses,
      { 'animate-pulse': canCut && !isCut }
    ]"
    :style="isCut && isOwn ? 'border: 4px solid #d946ef !important; box-shadow: 0 0 20px rgba(217, 70, 239, 0.5) !important;' : ''"
  >
    <div v-if="cardType && (isCut || isOwn)" class="flex flex-col items-center justify-center h-full relative">
      <!-- Show card type if it's cut OR if it's the player's own card -->
      <span v-if="cardType === 'bomb'" class="text-lg sm:text-3xl">💣</span>
      <span v-else-if="cardType === 'safe'" class="text-lg sm:text-3xl">🔷</span>
      <span v-else class="text-lg sm:text-3xl">⚡</span>

      <!-- Indication pour ses propres cartes pas encore retournées -->
      <span v-if="!isCut && isOwn" class="text-xs font-bold mt-0.5 text-center leading-none px-0.5">
        {{ cardType === 'bomb' ? 'BOMB' : cardType === 'safe' ? 'SÛR' : 'NEUT' }}
      </span>

    </div>
    <div v-else class="flex items-center justify-center h-full">
      <!-- Show ? for unrevealed cards that aren't yours -->
      <span class="text-lg sm:text-2xl text-gray-500">?</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CardType } from '@/types/game';

const props = defineProps<{
  isCut: boolean;
  cardType?: CardType;
  canCut: boolean;
  isOwn: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const cardClasses = computed(() => {
  if (props.isCut) {
    // Toutes les cartes retournées ont le même style de base
    if (props.cardType === 'bomb') return 'wire-card-bomb wire-card-cut';
    if (props.cardType === 'safe') return 'wire-card-safe wire-card-cut';
    if (props.cardType === 'neutral') return 'wire-card-neutral wire-card-cut';
    return 'wire-card-cut';
  }

  // Show colored background for own cards (not cut)
  if (props.isOwn && props.cardType && !props.isCut) {
    if (props.cardType === 'bomb') return 'wire-card-bomb wire-card-uncut';
    if (props.cardType === 'safe') return 'wire-card-safe wire-card-uncut';
    if (props.cardType === 'neutral') return 'wire-card-neutral wire-card-uncut';
  }

  if (props.canCut) {
    return 'wire-card-uncut hover:shadow-lg cursor-pointer';
  }

  // Always show normal style for uncut cards, regardless of whether we can cut them
  return 'wire-card-uncut';
});

const handleClick = () => {
  if (props.canCut && !props.isCut && !props.isOwn) {
    emit('click');
  }
};
</script>