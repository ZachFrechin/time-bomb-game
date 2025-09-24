<template>
  <div class="h-full flex flex-col space-y-2">
    <!-- Header compact -->
    <div class="card p-2 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div class="text-center flex-1">
          <div class="text-2xl font-bold text-red-400 animate-pulse">
            {{ safeWiresRemaining }} 🔷
          </div>
          <div class="text-xs text-gray-400">fils sûrs restants</div>
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
    <div class="flex-1 min-h-0 overflow-y-auto space-y-2 px-1">
      <div v-for="player in orderedPlayers" :key="player.id"
           class="card p-2"
           :class="{
             'border-2 border-green-400 bg-green-900/20': gameStore.currentTurnPlayerName === player.displayName && !gameStore.isMyTurn,
             'border-2 border-yellow-400 bg-yellow-900/20': player.id === gameStore.playerId && gameStore.isMyTurn
           }">
        <!-- Header joueur compact -->
        <div class="mb-2">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-1 min-w-0">
              <div :class="[
                'w-2 h-2 rounded-full flex-shrink-0',
                player.isConnected ? 'bg-green-500' : 'bg-gray-500'
              ]"></div>
              <span class="text-xs font-semibold truncate max-w-[50px]">{{ player.displayName }}</span>
            </div>
            <div class="flex items-center space-x-1">
              <!-- Tags déclarations séparés -->
              <div v-if="playerDeclarations[player.id]" class="flex space-x-1">
                <!-- Badge fils sûrs avec X fois l'emoji -->
                <span v-if="playerDeclarations[player.id].safeWires > 0" class="inline-block text-xs bg-indigo-700 px-1 py-0.5 rounded font-bold">
                  {{ playerDeclarations[player.id].safeWires }}🔷
                </span>
                <!-- Badge bombe si déclarée -->
                <span v-if="playerDeclarations[player.id].hasBomb" class="inline-block text-xs bg-red-600 px-1 py-0.5 rounded font-bold animate-pulse">
                  💣
                </span>
              </div>
              <div v-if="gameStore.room?.masterId === player.id" class="text-xs bg-yellow-600 px-1 py-0.5 rounded">
                ⭐
              </div>
            </div>
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
    <div v-if="gameStore.isMyTurn && !playerDeclarations[gameStore.playerId] && gameStore.room?.state === 'game'"
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

// État pour les modals
const showDeclaration = ref(false);
const showCountdown = ref(false);
const playerDeclarations = ref<Record<string, { safeWires: number; hasBomb: boolean }>>({});

// Clé pour synchroniser les déclarations entre joueurs
const declarationsKey = computed(() => `declarations_${gameStore.room?.id}_round_${gameStore.room?.gameState?.currentRound}`);

// Charger les déclarations existantes
const loadDeclarations = () => {
  if (typeof window !== 'undefined' && declarationsKey.value) {
    const stored = localStorage.getItem(declarationsKey.value);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        playerDeclarations.value = parsed;
        console.log('Declarations loaded:', parsed);
      } catch (e) {
        console.error('Error loading declarations:', e);
      }
    }
  }
};

// Sauvegarder les déclarations
const saveDeclarations = () => {
  if (typeof window !== 'undefined' && declarationsKey.value) {
    localStorage.setItem(declarationsKey.value, JSON.stringify(playerDeclarations.value));
  }
};

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

// Polling pour synchroniser les déclarations
let pollInterval: number | null = null;

// Démarrer le décompte au montage si on est en jeu
onMounted(() => {
  if (gameStore.room?.state === 'in_game' && !hasShownInitialCountdown.value) {
    hasShownInitialCountdown.value = true;
    showCountdown.value = true;
  }
  // Charger les déclarations existantes
  loadDeclarations();

  // Démarrer le polling pour synchroniser les déclarations
  pollInterval = setInterval(() => {
    loadDeclarations();
  }, 1000); // Vérifier toutes les secondes
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
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

    // RESET COMPLET des déclarations à chaque nouvelle distribution
    playerDeclarations.value = {};

    // Si c'est la première fois qu'on reçoit des cartes et qu'on n'a pas encore montré le décompte
    if (!hasShownInitialCountdown.value && gameStore.room?.state === 'in_game') {
      hasShownInitialCountdown.value = true;
      showCountdown.value = true;
    } else if (!showCountdown.value) {
      // Sinon, afficher directement l'écran de déclaration (redistribution)
      showDeclaration.value = true;
    }
  }
}, { immediate: true });

// Surveiller le changement de round pour afficher l'écran de déclaration
watch(() => gameStore.room?.gameState?.currentRound, (newRound) => {
  if (newRound && newRound !== currentRound.value) {
    currentRound.value = newRound;
    showDeclaration.value = true;
    // Charger les déclarations du nouveau round
    loadDeclarations();
  }
});

// Surveiller les changements de clé pour recharger les déclarations
watch(declarationsKey, () => {
  loadDeclarations();
});

const hideCountdown = () => {
  showCountdown.value = false;
  // Afficher l'écran de déclaration après le décompte
  showDeclaration.value = true;
};

const handleDeclaration = (declaration: { safeWires: number; hasBomb: boolean }) => {
  // Sauvegarder la déclaration du joueur LOCALEMENT pour tous (hack temporaire)
  playerDeclarations.value[gameStore.playerId] = declaration;

  // Sauvegarder dans localStorage pour partager avec autres joueurs (même si imparfait)
  saveDeclarations();

  // Pour les autres joueurs, simuler des déclarations aléatoires basées sur leur rôle (debug temporaire)
  gameStore.room?.players.forEach(player => {
    if (player.id !== gameStore.playerId && !playerDeclarations.value[player.id]) {
      // Déclaration factice pour test
      playerDeclarations.value[player.id] = {
        safeWires: Math.floor(Math.random() * 3) + 1,
        hasBomb: Math.random() > 0.7
      };
    }
  });

  showDeclaration.value = false;
};

const canCutWire = (playerId: string) => {
  const hasPlayerDeclared = playerDeclarations.value[gameStore.playerId] !== undefined;
  return gameStore.isMyTurn && playerId !== gameStore.playerId && hasPlayerDeclared;
};

const isWireCut = (playerId: string, wireIndex: number) => {
  if (playerId === gameStore.playerId) {
    // For own cards, check playerWireCards
    const wire = gameStore.playerWireCards[wireIndex];
    return wire?.isCut || false;
  }
  // For other players, we can't see their cards unless they're revealed
  const player = gameStore.room?.players.find(p => p.id === playerId);
  const wire = player?.wireCards?.[wireIndex];
  return wire?.isCut || false;
};

const getWireType = (playerId: string, wireIndex: number) => {
  if (playerId === gameStore.playerId) {
    // For own cards, always show the type
    const wire = gameStore.playerWireCards[wireIndex];
    return wire?.type;
  }
  // For other players, only show type if the card is cut (revealed)
  const player = gameStore.room?.players.find(p => p.id === playerId);
  const wire = player?.wireCards?.[wireIndex];
  return wire?.isCut ? wire.type : undefined;
};

const cutWire = (playerId: string, wireIndex: number) => {
  if (canCutWire(playerId)) {
    gameStore.cutWire(playerId, wireIndex);
  }
};
</script>