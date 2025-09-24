<template>
  <div class="h-full flex flex-col space-y-2">
    <!-- Header compact -->
    <div class="card p-2 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div class="text-left">
          <div v-if="gameStore.lastWireCutResult" class="text-center">
            <div class="text-lg">
              {{ getCardEmoji(gameStore.lastWireCutResult.cardType) }}
            </div>
            <div class="text-xs text-gray-400">
              {{ getLastCutPlayerName() }}
            </div>
          </div>
        </div>

        <div class="text-center flex-1">
          <!-- Timer avant redistribution -->
          <div v-if="showPreRedistributionCountdown" class="text-2xl font-bold text-yellow-400 animate-pulse">
            {{ preRedistributionCountdown }}
          </div>
          <!-- Timer de redistribution -->
          <div v-else-if="showRedistributionCountdown" class="text-2xl font-bold text-orange-400 animate-pulse">
            {{ redistributionCountdown }}
          </div>
          <!-- Timer de fin de partie -->
          <div v-else-if="showEndGameCountdown" class="text-2xl font-bold text-red-500 animate-pulse">
            {{ endGameCountdown }} 💥
          </div>
          <!-- Affichage normal -->
          <div v-else class="text-2xl font-bold text-red-400 animate-pulse">
            {{ safeWiresRemaining }} 🔷
          </div>
          <div v-if="!showPreRedistributionCountdown && !showRedistributionCountdown && !showEndGameCountdown" class="text-xs text-gray-400">fils sûrs restants</div>
          <div v-else-if="showPreRedistributionCountdown" class="text-xs text-gray-400">analyse...</div>
          <div v-else-if="showRedistributionCountdown" class="text-xs text-gray-400">redistribution...</div>
          <div v-else class="text-xs text-gray-400">💥 BOOM!</div>
        </div>

        <div class="text-right">
          <div class="text-xs text-gray-400">Tour:</div>
          <div class="text-sm font-bold" :class="gameStore.isMyTurn ? 'text-green-400 animate-pulse' : 'text-blue-400'">
            {{ gameStore.isMyTurn ? 'VOUS' : gameStore.currentTurnPlayerName }}
          </div>
        </div>
      </div>
      <div v-if="gameStore.room?.gameState?.bombFound" class="text-red-500 font-bold text-center text-xs mt-1">
        💣 Bombe trouvée!
      </div>
    </div>

    <!-- Rôle compact -->
    <div v-if="gameStore.playerRole" class="card p-2 bg-gradient-to-r flex-shrink-0"
         :class="gameStore.playerRole === 'good' ? 'from-blue-900 to-blue-800' : 'from-red-900 to-red-800'">
      <p class="text-center text-sm font-bold">
        {{ gameStore.playerRole === 'good' ? '🕵️ Détective' : '💀 Saboteur' }}
      </p>
    </div>


    <!-- Zone de jeu principale -->
    <div class="flex-1 min-h-0 overflow-y-auto space-y-2 px-1 pb-4">
      <div v-for="player in orderedPlayers" :key="player.id"
           class="card p-2"
           :class="{
             'border-2 border-green-400 bg-green-900/20': gameStore.currentTurnPlayerName === player.displayName && !gameStore.isMyTurn,
             'border-2 border-yellow-400 bg-yellow-900/20': player.id === gameStore.playerId && gameStore.isMyTurn
           }">
        <!-- Header joueur compact -->
        <div class="mb-3">
          <div class="flex justify-between items-center mb-1">
            <div class="flex items-center space-x-2">
              <div :class="[
                'w-2 h-2 rounded-full flex-shrink-0',
                player.isConnected ? 'bg-green-500' : 'bg-gray-500'
              ]"></div>
              <span class="text-sm font-semibold">{{ player.displayName }}</span>
            </div>

            <!-- Étoile maître à droite -->
            <div v-if="gameStore.room?.masterId === player.id" class="text-xs bg-yellow-600 px-1 py-0.5 rounded flex-shrink-0">
              ⭐
            </div>
          </div>

          <!-- Tags déclarations sous le nom -->
          <div v-if="gameStore.playerDeclarations[player.id]" class="flex space-x-1 justify-center">
            <!-- Badge fils sûrs avec emojis répétés -->
            <span v-if="gameStore.playerDeclarations[player.id].safeWires > 0" class="text-sm bg-indigo-700 px-2 py-1 rounded font-bold border-2 border-indigo-500">
              {{ Array(gameStore.playerDeclarations[player.id].safeWires).fill('🔷').join(' ') }}
            </span>
            <!-- Badge bombe si déclarée -->
            <span v-if="gameStore.playerDeclarations[player.id].hasBomb" class="text-sm bg-red-600 px-2 py-1 rounded font-bold animate-pulse border-2 border-red-400">
              💣
            </span>
          </div>
        </div>

        <!-- Cartes -->
        <div class="flex space-x-1 justify-center">
          <div v-for="(wire, index) in (gameStore.room?.gameState?.wiresPerPlayer || 5)" :key="`${player.id}-${index}-${gameStore.room?.gameState?.currentRound || 1}`">
            <WireCard
              :is-cut="isWireCut(player.id, index)"
              :card-type="getWireType(player.id, index)"
              :can-cut="canCutWire(player.id)"
              :is-own="player.id === gameStore.playerId"
              @click="() => cutWire(player.id, index)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Message d'attente de déclaration -->
    <div v-if="gameStore.isMyTurn && !gameStore.playerDeclarations[gameStore.playerId] && gameStore.room?.state === 'game'"
         class="fixed top-4 left-4 right-4 bg-orange-900/90 border border-orange-500 rounded p-3 text-center z-40">
      <div class="text-orange-300 font-bold text-sm">⚠️ Vous devez faire votre déclaration avant de jouer</div>
      <div class="text-orange-400 text-xs mt-1">Appuyez sur "Déclarer" pour commencer</div>
    </div>

    <!-- Écran de déclaration -->
    <DeclarationView
      v-if="showDeclaration"
      @close="handleDeclaration"
    />

    <!-- Décompte avant début -->
    <CountdownView
      v-if="showCountdown"
      @finished="hideCountdown"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/game';
import WireCard from './WireCard.vue';
import DeclarationView from './DeclarationView.vue';
import CountdownView from './CountdownView.vue';

const gameStore = useGameStore();

// État pour les modals et timers
const showDeclaration = ref(false);
const showCountdown = ref(false);
const showRedistributionCountdown = ref(false);
const showEndGameCountdown = ref(false);
const redistributionCountdown = ref(5);
const endGameCountdown = ref(3);
const showPreRedistributionCountdown = ref(false);
const preRedistributionCountdown = ref(5);

// Calculer les fils sûrs restants
const safeWiresRemaining = computed(() => {
  const total = gameStore.room?.gameState?.totalDefusesNeeded || 0;
  const found = gameStore.room?.gameState?.defusesFound || 0;
  return total - found;
});

// Réorganiser la liste des joueurs avec soi-même en premier
const orderedPlayers = computed(() => {
  const players = gameStore.room?.players || [];
  const myPlayer = players.find(p => p.id === gameStore.playerId);
  const otherPlayers = players.filter(p => p.id !== gameStore.playerId);

  return myPlayer ? [myPlayer, ...otherPlayers] : players;
});

// Variables pour suivre l'état
const currentRound = ref(gameStore.room?.gameState?.currentRound || 1);
const lastCardsLength = ref(gameStore.playerWireCards.length);
const hasShownInitialCountdown = ref(false);
const frozenPlayerCards = ref(null);
const frozenOtherPlayersCards = ref(null);

// Démarrer le décompte au montage si on est en jeu
onMounted(() => {
  if (gameStore.room?.state === 'in_game' && !hasShownInitialCountdown.value) {
    hasShownInitialCountdown.value = true;
    showCountdown.value = true;
  }
});

// Debug: surveiller les changements des déclarations
watch(() => gameStore.playerDeclarations, (newDeclarations) => {
  console.log('Declaration changes:', newDeclarations);
}, { deep: true });

// Surveiller les résultats de coupe pour décrémenter les badges et déclencher les timers
watch(() => gameStore.lastWireCutResult, (result) => {
  if (result) {
    // Si c'est un fil sûr, décrémenter le badge du joueur concerné
    if (result.cardType === 'safe' && gameStore.playerDeclarations[result.targetId]) {
      const declaration = gameStore.playerDeclarations[result.targetId];
      if (declaration.safeWires > 0) {
        declaration.safeWires--;
      }
    }

    // Si c'est une bombe, démarrer le timer de fin de partie et empêcher l'affichage immédiat
    if (result.cardType === 'bomb') {
      // Empêcher temporairement le changement d'état vers 'finished'
      gameStore.preventGameOverDisplay = true;
      startEndGameCountdown();

      // Permettre l'affichage de l'écran de fin après 3 secondes
      setTimeout(() => {
        gameStore.preventGameOverDisplay = false;
      }, 3000);
    }
  }
});

// Surveiller le début de partie pour le décompte
watch(() => gameStore.room?.state, (newState) => {
  if (newState === 'in_game' && !hasShownInitialCountdown.value) {
    hasShownInitialCountdown.value = true;
    showCountdown.value = true;
  }
});

// Surveiller les changements de cartes pour déclencher les déclarations
watch(() => gameStore.playerWireCards.length, (newLength) => {
  if (newLength > 0 && newLength !== lastCardsLength.value) {
    lastCardsLength.value = newLength;
    // Si c'est la première fois qu'on reçoit des cartes et qu'on n'a pas encore montré le décompte
    if (!hasShownInitialCountdown.value && gameStore.room?.state === 'in_game') {
      hasShownInitialCountdown.value = true;
      showCountdown.value = true;
    }
  }
}, { immediate: true });

// Debug: surveiller les résultats de coupe pour info seulement
watch(() => gameStore.lastWireCutResult, (result, oldResult) => {
  if (result) {
    const totalPlayers = gameStore.room?.players?.length || 0;
    const cardsRevealed = gameStore.room?.gameState?.cardsRevealedThisRound || 0;
    console.log('Wire cut result - Cards revealed:', cardsRevealed, 'total:', totalPlayers);
  }
});

// Surveiller le changement de round pour afficher l'écran de déclaration
watch(() => gameStore.room?.gameState?.currentRound, (newRound) => {
  if (newRound && newRound !== currentRound.value) {
    currentRound.value = newRound;
  }
});

// Surveiller si toutes les cartes ont été retournées pour déclencher la redistribution
watch(() => gameStore.room?.gameState?.cardsRevealedThisRound, (cardsRevealed, oldValue) => {
  const totalPlayers = gameStore.room?.players?.length || 0;
  console.log('CARDS WATCH:', cardsRevealed, 'old:', oldValue, 'total:', totalPlayers);

  // Conditions pour déclencher
  const reachedMax = cardsRevealed === totalPlayers; // Atteint le maximum (4 pour 4 joueurs)
  const hasPlayers = totalPlayers > 0;
  const justReached = cardsRevealed !== oldValue; // Éviter les doublons

  console.log('Detection conditions: reachedMax=', reachedMax, '(', cardsRevealed, '===', totalPlayers, ') justReached=', justReached, 'hasPlayers=', hasPlayers);

  // Détection: on vient d'atteindre le maximum de cartes révélées
  if (reachedMax && hasPlayers && justReached) {
    console.log('🎯 END OF ROUND DETECTED! Starting countdown sequence...');

    // Attendre un tout petit peu pour que players_update arrive et mette à jour la dernière carte
    setTimeout(() => {
      // Sauvegarder l'état actuel des cartes APRÈS que la dernière carte soit mise à jour
      frozenPlayerCards.value = [...gameStore.playerWireCards];
      frozenOtherPlayersCards.value = gameStore.room?.players?.map(p => ({
        ...p,
        wireCards: p.wireCards ? [...p.wireCards] : undefined
      })) || [];

      // Démarrer le timer
      if (!showPreRedistributionCountdown.value && !showRedistributionCountdown.value && !showCountdown.value && !showDeclaration.value) {
        console.log('✅ Starting pre-redistribution countdown for new round');
        startPreRedistributionCountdown();
      } else {
        console.log('❌ Timer already running or declaration showing, skipping');
      }
    }, 100); // Petit délai pour laisser le temps à players_update d'arriver
  } else {
    console.log('⏳ Not end of round yet, continuing...');
  }
});

// Note: Les déclarations sont maintenant gérées dans le game store global

const hideCountdown = () => {
  showCountdown.value = false;
  // Démarrer le timer d'analyse pour le premier round aussi
  startPreRedistributionCountdown();
};

const handleDeclaration = (declaration: { safeWires: number; hasBomb: boolean }) => {
  // Utiliser la fonction du store pour sauvegarder et synchroniser
  gameStore.saveDeclaration(declaration);

  showDeclaration.value = false;
};

const canCutWire = (playerId: string) => {
  const hasPlayerDeclared = gameStore.playerDeclarations[gameStore.playerId] !== undefined;
  return gameStore.isMyTurn && playerId !== gameStore.playerId && hasPlayerDeclared;
};

const isWireCut = (playerId: string, wireIndex: number) => {
  if (playerId === gameStore.playerId) {
    // For own cards, use frozen cards during first timer, otherwise normal cards
    const cards = frozenPlayerCards.value || gameStore.playerWireCards;
    const wire = cards[wireIndex];
    return wire?.isCut || false;
  }
  // For other players, use frozen cards during first timer
  const players = frozenOtherPlayersCards.value || gameStore.room?.players || [];
  const player = players.find(p => p.id === playerId);
  const wire = player?.wireCards?.[wireIndex];
  return wire?.isCut || false;
};

const getWireType = (playerId: string, wireIndex: number) => {
  if (playerId === gameStore.playerId) {
    // For own cards, use frozen cards during first timer, otherwise normal cards
    const cards = frozenPlayerCards.value || gameStore.playerWireCards;
    const wire = cards[wireIndex];
    return wire?.type;
  }
  // For other players, use frozen cards during first timer
  const players = frozenOtherPlayersCards.value || gameStore.room?.players || [];
  const player = players.find(p => p.id === playerId);
  const wire = player?.wireCards?.[wireIndex];
  return wire?.isCut ? wire.type : undefined;
};

const cutWire = (playerId: string, wireIndex: number) => {
  if (canCutWire(playerId)) {
    gameStore.cutWire(playerId, wireIndex);
  }
};

const getCardEmoji = (cardType: string) => {
  switch (cardType) {
    case 'bomb': return '💣';
    case 'safe': return '🔷';
    case 'neutral': return '⚡';
    default: return '❓';
  }
};

const getLastCutPlayerName = () => {
  if (!gameStore.lastWireCutResult) return '';

  const targetId = gameStore.lastWireCutResult.targetId;
  if (targetId === gameStore.playerId) {
    return 'Vous';
  }

  const player = gameStore.room?.players.find(p => p.id === targetId);
  return player?.displayName || 'Inconnu';
};

// Premier timer: 5 secondes d'analyse avant redistribution
const startPreRedistributionCountdown = () => {
  console.log('Starting pre-redistribution countdown');
  showPreRedistributionCountdown.value = true;
  preRedistributionCountdown.value = 5;

  const interval = setInterval(() => {
    preRedistributionCountdown.value--;
    console.log('Pre-redistribution countdown:', preRedistributionCountdown.value);
    if (preRedistributionCountdown.value <= 0) {
      clearInterval(interval);
      showPreRedistributionCountdown.value = false;
      console.log('Pre-redistribution finished, starting redistribution countdown');

      // Maintenant libérer les cartes gelées pour montrer les nouvelles
      frozenPlayerCards.value = null;
      frozenOtherPlayersCards.value = null;

      // Démarrer le second timer seulement si c'est pas la première manche
      const currentRound = gameStore.room?.gameState?.currentRound || 1;
      if (currentRound > 1) {
        startRedistributionCountdown();
      } else {
        // Première manche: montrer directement la déclaration
        console.log('First round - showing declaration directly');
        showDeclaration.value = true;
      }
    }
  }, 1000);
};

// Second timer: 5 secondes pendant la redistribution
const startRedistributionCountdown = () => {
  console.log('Starting redistribution countdown');
  showRedistributionCountdown.value = true;
  redistributionCountdown.value = 5;

  // Reset des déclarations au début de la redistribution
  gameStore.playerDeclarations = {};

  const interval = setInterval(() => {
    redistributionCountdown.value--;
    console.log('Redistribution countdown:', redistributionCountdown.value);
    if (redistributionCountdown.value <= 0) {
      clearInterval(interval);
      showRedistributionCountdown.value = false;
      console.log('Showing declaration screen');

      // Afficher l'écran de déclaration après le second timer
      showDeclaration.value = true;
    }
  }, 1000);
};

const startEndGameCountdown = () => {
  showEndGameCountdown.value = true;
  endGameCountdown.value = 3;

  const interval = setInterval(() => {
    endGameCountdown.value--;
    if (endGameCountdown.value <= 0) {
      clearInterval(interval);
      showEndGameCountdown.value = false;
      // Laisser le serveur gérer l'affichage de l'écran de fin
      // Ne pas masquer l'interface immédiatement
    }
  }, 1000);
};
</script>