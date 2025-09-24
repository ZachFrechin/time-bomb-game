import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { socketService } from '@/services/socket';
import type { Room, Player, RoleType, WireCard, WireCutResult } from '@/types/game';

export const useGameStore = defineStore('game', () => {
  const room = ref<Room | null>(null);
  const playerId = ref<string>('');
  const playerName = ref<string>('');
  const playerToken = ref<string>('');
  const playerRole = ref<RoleType | null>(null);
  const playerWireCards = ref<WireCard[]>([]);
  const currentTurnPlayerId = ref<string>('');
  const currentTurnPlayerName = ref<string>('');
  const chatMessages = ref<Array<{
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
  }>>([]);
  const lastWireCutResult = ref<WireCutResult | null>(null);
  const gameOver = ref(false);
  const winner = ref<'good' | 'evil' | null>(null);
  const allPlayersWithRoles = ref<Array<{ id: string; name: string; role: RoleType }>>([]);
  const socketListenersSetup = ref(false);

  const isMyTurn = computed(() => {
    return currentTurnPlayerId.value === playerId.value;
  });

  const isMaster = computed(() => {
    return room.value?.masterId === playerId.value;
  });

  const currentPlayer = computed(() => {
    return room.value?.players.find(p => p.id === playerId.value);
  });

  const otherPlayers = computed(() => {
    return room.value?.players.filter(p => p.id !== playerId.value) || [];
  });

  const setupSocketListeners = () => {
    if (socketListenersSetup.value) return;
    socketListenersSetup.value = true;
    socketService.on('lobby_update', (data) => {
      if (room.value) {
        room.value.players = data.players;
        room.value.options = data.options;
        room.value.masterId = data.masterId;
      } else {
        // Créer la room si elle n'existe pas (pour les reconnexions)
        room.value = {
          id: data.roomId,
          state: 'lobby',
          players: data.players,
          options: data.options,
          masterId: data.masterId,
        };
      }
    });

    socketService.on('game_started', (data) => {
      if (room.value) {
        // Clean up any previous game state
        if (room.value.players) {
          room.value.players.forEach(player => {
            player.wireCards = undefined;
          });
        }

        room.value.state = 'in_game';
        if (!room.value.gameState) {
          room.value.gameState = {
            currentPlayerIndex: data.currentPlayerIndex,
            currentPlayerId: data.turnOrder[data.currentPlayerIndex],
            defusesFound: 0,
            bombFound: false,
            totalDefusesNeeded: room.value.players.length,
            turnOrder: data.turnOrder,
          };
        }
      }
    });

    socketService.on('private_hand', (data) => {
      playerRole.value = data.role;
      // Ensure all cards are reset with isCut = false
      playerWireCards.value = data.wireCards.map(card => ({
        ...card,
        isCut: false
      }));
    });

    socketService.on('player_turn', (data) => {
      currentTurnPlayerId.value = data.playerId;
      currentTurnPlayerName.value = data.playerName;
    });

    socketService.on('wire_cut_result', (data) => {
      lastWireCutResult.value = data;
      if (room.value?.gameState && data.newGameState) {
        // Update full game state
        Object.assign(room.value.gameState, data.newGameState);
      }

      // Mettre à jour playerWireCards si c'est notre carte qui a été coupée
      if (data.targetId === playerId.value && data.wireIndex !== undefined) {
        if (playerWireCards.value[data.wireIndex]) {
          playerWireCards.value[data.wireIndex].isCut = true;
        }
      }
    });

    socketService.on('players_update', (data) => {
      // Update players with their wire cards
      if (data.players && room.value) {
        // If we're starting a new game, ensure all wire cards are reset
        room.value.players = data.players.map(player => ({
          ...player,
          wireCards: player.wireCards ? player.wireCards.map(card => ({
            ...card,
            // Reset isCut if it's a new game (no cuts yet)
            isCut: room.value?.gameState?.cardsRevealedThisRound ? card.isCut : false
          })) : undefined
        }));
      }
    });

    socketService.on('game_over', (data) => {
      gameOver.value = true;
      winner.value = data.winnerTeam;
      allPlayersWithRoles.value = data.players;
      if (room.value) {
        room.value.state = 'finished';
      }
    });

    socketService.on('chat_message', (data) => {
      chatMessages.value.push(data);
      if (chatMessages.value.length > 100) {
        chatMessages.value.shift();
      }
    });

    socketService.on('player_disconnected', (data) => {
      const player = room.value?.players.find(p => p.id === data.playerId);
      if (player) {
        player.isConnected = false;
      }
    });

    socketService.on('player_reconnected', (data) => {
      const player = room.value?.players.find(p => p.id === data.playerId);
      if (player) {
        player.isConnected = true;
      }
    });

    socketService.on('error', (data) => {
      console.error('Socket error:', data);
    });
  };

  const createRoom = async (displayName: string, options?: any) => {
    try {
      socketService.connect();
      setupSocketListeners();

      return new Promise<string>((resolve, reject) => {
        socketService.emit('create_room', { displayName, options }, (result) => {
          if (result.success) {
            playerId.value = result.playerId;
            playerName.value = displayName;
            playerToken.value = result.token;

            // Créer la room côté frontend
            room.value = {
              id: result.roomId,
              state: 'lobby',
              players: [{
                id: result.playerId,
                displayName,
                isConnected: true,
                isMaster: true,
              }],
              options: options || {
                maxPlayers: 6,
                isPublic: true,
                wiresPerPlayer: 5,
              },
              masterId: result.playerId,
            };

            resolve(result.roomId);
          } else {
            reject(new Error(result.error || 'Failed to create room'));
          }
        });
      });
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };

  const joinRoom = async (roomId: string, displayName: string, avatar?: string) => {
    try {
      socketService.connect();
      setupSocketListeners();

      return new Promise<boolean>((resolve, reject) => {
        socketService.emit('join_room', { roomId, displayName, avatar }, (result) => {
          if (result.success) {
            playerId.value = result.playerId;
            playerName.value = displayName;
            playerToken.value = result.token;

            // Initialiser une room temporaire, elle sera mise à jour par lobby_update
            room.value = {
              id: roomId,
              state: 'lobby',
              players: [],
              options: {
                maxPlayers: 6,
                isPublic: true,
                wiresPerPlayer: 5,
              },
              masterId: '',
            };

            resolve(true);
          } else {
            reject(new Error(result.error || 'Failed to join room'));
          }
        });
      });
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };

  const startGame = () => {
    if (room.value && isMaster.value) {
      socketService.emit('start_game', {
        roomId: room.value.id,
        masterToken: playerToken.value,
      });
    }
  };

  const cutWire = (targetPlayerId: string, wireIndex: number) => {
    if (room.value && isMyTurn.value) {
      socketService.emit('cut_wire', {
        roomId: room.value.id,
        targetPlayerId,
        wireIndex,
      });
    }
  };

  const sendChatMessage = (message: string) => {
    if (room.value) {
      socketService.emit('send_chat', {
        roomId: room.value.id,
        message,
      });
    }
  };

  const kickPlayer = (targetPlayerId: string) => {
    if (room.value && isMaster.value) {
      socketService.emit('kick_player', {
        roomId: room.value.id,
        playerId: targetPlayerId,
        masterToken: playerToken.value,
      });
    }
  };

  const leaveRoom = () => {
    if (room.value) {
      socketService.emit('leave_room', {
        roomId: room.value.id,
      });
      reset();
    }
  };

  const restartGame = () => {
    if (room.value && isMaster.value) {
      // Reset only game state, keep the room and players
      playerRole.value = null;
      playerWireCards.value = [];
      currentTurnPlayerId.value = '';
      currentTurnPlayerName.value = '';
      lastWireCutResult.value = null;
      gameOver.value = false;
      winner.value = null;
      allPlayersWithRoles.value = [];

      // Reset wire cards for all players
      if (room.value.players) {
        room.value.players.forEach(player => {
          player.wireCards = undefined;
        });
      }

      // Clear declarations from localStorage
      const declarationsKey = `declarations_${room.value.id}_round_*`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`declarations_${room.value.id}_`)) {
          localStorage.removeItem(key);
        }
      });

      // Send restart game request to server
      socketService.emit('start_game', {
        roomId: room.value.id,
        masterToken: playerToken.value,
      });
    }
  };

  const reset = () => {
    room.value = null;
    playerId.value = '';
    playerName.value = '';
    playerToken.value = '';
    playerRole.value = null;
    playerWireCards.value = [];
    currentTurnPlayerId.value = '';
    currentTurnPlayerName.value = '';
    chatMessages.value = [];
    lastWireCutResult.value = null;
    gameOver.value = false;
    winner.value = null;
    allPlayersWithRoles.value = [];
    socketListenersSetup.value = false;
    socketService.disconnect();
  };

  return {
    room,
    playerId,
    playerName,
    playerRole,
    playerWireCards,
    currentTurnPlayerId,
    currentTurnPlayerName,
    chatMessages,
    lastWireCutResult,
    gameOver,
    winner,
    allPlayersWithRoles,
    isMyTurn,
    isMaster,
    currentPlayer,
    otherPlayers,
    createRoom,
    joinRoom,
    startGame,
    cutWire,
    sendChatMessage,
    kickPlayer,
    leaveRoom,
    restartGame,
    reset,
  };
});