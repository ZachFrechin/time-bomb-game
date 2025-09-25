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
  const playerDeclarations = ref<Record<string, { safeWires: number; hasBomb: boolean }>>({});
  const preventGameOverDisplay = ref(false);

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

  const handleReconnection = async () => {
    console.log('Attempting to restore game state after reconnection...');

    // Si on était dans une room, essayer de la rejoindre à nouveau
    if (room.value?.id && playerId.value && playerName.value) {
      const currentRoomId = room.value.id;

      try {
        console.log('Rejoining room:', currentRoomId);
        // Utiliser un callback pour s'assurer que la reconnexion fonctionne
        socketService.emit('join_room', {
          roomId: currentRoomId,
          playerName: playerName.value,
          playerId: playerId.value,
        }, (result: any) => {
          if (result.success) {
            console.log('Successfully rejoined room');
            // Forcer une mise à jour de l'état
            saveToLocalStorage();
          } else {
            console.error('Failed to rejoin:', result.error);
            // Si échec, essayer de charger depuis localStorage
            const saved = localStorage.getItem('timebomb-session');
            if (saved) {
              const data = JSON.parse(saved);
              if (data.roomId === currentRoomId) {
                // Réessayer avec les données sauvegardées
                setTimeout(() => handleReconnection(), 2000);
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to rejoin room after reconnection:', error);
      }
    }
  };

  // Heartbeat pour vérifier la connexion
  let heartbeatInterval: any = null;

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
      if (room.value?.id && playerId.value) {
        const socket = socketService.getSocket();
        if (!socket?.connected) {
          console.log('Heartbeat detected disconnection - reconnecting...');
          socketService.connect();
        }
      }
    }, 5000); // Vérifier toutes les 5 secondes
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const setupSocketListeners = () => {
    if (socketListenersSetup.value) return;
    socketListenersSetup.value = true;

    // Gérer la reconnexion automatique via notre événement custom
    socketService.on('socket_reconnected' as any, () => {
      console.log('Socket reconnected - checking if we need to rejoin room');
      if (room.value?.id && playerId.value) {
        console.log('Rejoining room after reconnection:', room.value.id);
        handleReconnection();
      }
    });

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

        // Reset player declarations for new game
        playerDeclarations.value = {};

        room.value.state = 'in_game';
        // Always reset game state for a new game
        room.value.gameState = {
          currentPlayerIndex: data.currentPlayerIndex,
          currentPlayerId: data.turnOrder[data.currentPlayerIndex],
          defusesFound: 0,
          bombFound: false,
          totalDefusesNeeded: room.value.players.length,
          turnOrder: data.turnOrder,
          wiresPerPlayer: 5, // Reset to 5 cards per player when game starts
          cardsRevealedThisRound: 0,
          currentRound: 1,
        };
      }
    });

    socketService.on('private_hand', (data) => {
      playerRole.value = data.role;
      // Use the isCut state from server (important for reconnection)
      playerWireCards.value = data.wireCards;
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
        // Update each player individually to preserve Vue reactivity
        data.players.forEach(newPlayer => {
          const existingPlayer = room.value.players.find(p => p.id === newPlayer.id);
          if (existingPlayer) {
            // Update only the properties that changed
            existingPlayer.displayName = newPlayer.displayName;
            existingPlayer.isConnected = newPlayer.isConnected;
            existingPlayer.isMaster = newPlayer.isMaster;
            if (newPlayer.wireCards) {
              existingPlayer.wireCards = newPlayer.wireCards;
            }
          } else {
            // New player, add them
            room.value.players.push(newPlayer);
          }
        });
      }

      // Update game state if provided (happens after redistribution)
      if (data.gameState && room.value?.gameState) {
        console.log('📊 CLIENT: Updating wiresPerPlayer to', data.gameState.wiresPerPlayer);
        room.value.gameState.wiresPerPlayer = data.gameState.wiresPerPlayer;
        if (data.gameState.cardsRevealedThisRound !== undefined) {
          room.value.gameState.cardsRevealedThisRound = data.gameState.cardsRevealedThisRound;
        }
        if (data.gameState.currentRound !== undefined) {
          room.value.gameState.currentRound = data.gameState.currentRound;
        }
      }
    });

    socketService.on('game_over', (data) => {
      gameOver.value = true;
      winner.value = data.winnerTeam;
      allPlayersWithRoles.value = data.players;
      if (room.value && !preventGameOverDisplay.value) {
        room.value.state = 'finished';
      } else if (room.value && preventGameOverDisplay.value) {
        // Attendre que preventGameOverDisplay devienne false
        const checkInterval = setInterval(() => {
          if (!preventGameOverDisplay.value) {
            clearInterval(checkInterval);
            if (room.value) {
              room.value.state = 'finished';
            }
          }
        }, 100);
      }
    });

    socketService.on('chat_message', (data) => {
      chatMessages.value.push(data);
      if (chatMessages.value.length > 100) {
        chatMessages.value.shift();
      }

      // Traiter les déclarations qui arrivent via chat
      if (data.message.startsWith('DECLARATION:')) {
        try {
          const declarationData = JSON.parse(data.message.replace('DECLARATION:', ''));
          playerDeclarations.value[declarationData.playerId] = declarationData.declaration;
        } catch (e) {
          console.error('Error parsing declaration:', e);
        }
      }
    });

    socketService.on('player_disconnected', (data) => {
      if (room.value?.players) {
        const playerIndex = room.value.players.findIndex(p => p.id === data.playerId);
        if (playerIndex !== -1) {
          // Use Vue's reactivity system properly - create a new object
          const player = room.value.players[playerIndex];
          room.value.players[playerIndex] = {
            ...player,
            isConnected: false,
            // Explicitly preserve wire cards with their types
            wireCards: player.wireCards ? [...player.wireCards] : undefined
          };
          console.log('Player disconnected, preserved cards:', room.value.players[playerIndex].wireCards);
        }
      }
    });

    socketService.on('player_reconnected', (data) => {
      const player = room.value?.players.find(p => p.id === data.playerId);
      if (player) {
        player.isConnected = true;
      }
    });

    socketService.on('game_state_update', (data) => {
      console.log('Received game state update:', data);

      if (room.value && data.gameState) {
        room.value.gameState = {
          ...data.gameState,
          currentPlayerId: data.gameState.turnOrder?.[data.gameState.currentPlayerIndex],
        };

        // Si le serveur envoie des déclarations, les utiliser
        if (data.gameState.playerDeclarations) {
          playerDeclarations.value = data.gameState.playerDeclarations;
          console.log('Received declarations from server:', data.gameState.playerDeclarations);
        }
      }
    });

    socketService.on('room_joined', (data) => {
      console.log('Room rejoined after reconnection:', data);
      if (data.room) {
        // Clear declarations first, they will be sent by server
        playerDeclarations.value = {};

        room.value = data.room;
        playerId.value = data.playerId;
        playerToken.value = data.token;

        // Restaurer le tour actuel si on est en jeu
        if (data.room.state === 'in_game' && data.room.gameState) {
          const turnOrder = data.room.gameState.turnOrder;
          const currentIndex = data.room.gameState.currentPlayerIndex;
          if (turnOrder && currentIndex >= 0 && currentIndex < turnOrder.length) {
            currentTurnPlayerId.value = turnOrder[currentIndex];
            const currentPlayerData = data.room.players.find(p => p.id === turnOrder[currentIndex]);
            if (currentPlayerData) {
              currentTurnPlayerName.value = currentPlayerData.displayName || currentPlayerData.name;
              console.log('Restored current turn:', {
                playerId: currentTurnPlayerId.value,
                playerName: currentTurnPlayerName.value,
                isMyTurn: currentTurnPlayerId.value === playerId.value
              });
            }
          } else {
            console.warn('Could not restore turn - invalid index or turnOrder');
          }
        }

        // Les déclarations seront envoyées par le serveur via player_declared
        console.log('Waiting for declarations from server...');
      }
    });

    socketService.on('player_declared', (data) => {
      console.log('Player declared:', data);
      if (data.playerId && data.declaration) {
        playerDeclarations.value[data.playerId] = data.declaration;
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

  // Sauvegarder dans localStorage
  const saveToLocalStorage = () => {
    if (room.value?.id && playerId.value && playerName.value) {
      const data = {
        roomId: room.value.id,
        playerId: playerId.value,
        playerName: playerName.value,
        token: playerToken.value,
      };
      localStorage.setItem('timebomb-session', JSON.stringify(data));
    }
  };

  const joinRoom = async (roomId: string, displayName: string, avatar?: string, existingPlayerId?: string) => {
    try {
      socketService.connect();
      setupSocketListeners();

      return new Promise<boolean>((resolve, reject) => {
        const joinData: any = { roomId, displayName, avatar };

        // Include existing playerId for reconnection
        if (existingPlayerId || playerId.value) {
          joinData.playerId = existingPlayerId || playerId.value;
          console.log('Rejoining with existing player ID:', joinData.playerId);
        }

        socketService.emit('join_room', joinData, (result) => {
          if (result?.success) {
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

            // Sauvegarder la session dans localStorage
            saveToLocalStorage();

            // Démarrer le heartbeat pour détecter les déconnexions
            startHeartbeat();

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
    console.log('cutWire called:', {
      targetPlayerId,
      wireIndex,
      roomId: room.value?.id,
      isMyTurn: isMyTurn.value,
      currentTurn: currentTurnPlayerId.value,
      myId: playerId.value
    });

    if (room.value && isMyTurn.value) {
      socketService.emit('cut_wire', {
        roomId: room.value.id,
        targetPlayerId,
        wireIndex,
      });
    } else {
      console.log('Cannot cut wire - conditions not met');
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
      preventGameOverDisplay.value = false;

      // Reset wire cards for all players
      if (room.value.players) {
        room.value.players.forEach(player => {
          player.wireCards = undefined;
        });
      }

      // Clear declarations
      playerDeclarations.value = {};

      // Send restart game request to server
      socketService.emit('start_game', {
        roomId: room.value.id,
        masterToken: playerToken.value,
      });
    }
  };

  const declareWires = (declaration: { safeWires: number; hasBomb: boolean }) => {
    // Envoyer au serveur
    socketService.emit('declare_wires', declaration, (response: any) => {
      if (response?.success) {
        console.log('Declaration sent successfully');
        // La déclaration sera mise à jour via l'événement player_declared
      } else {
        console.error('Failed to send declaration:', response?.error);
      }
    });
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
    playerDeclarations.value = {};
    preventGameOverDisplay.value = false;
    socketListenersSetup.value = false;

    // Arrêter le heartbeat
    stopHeartbeat();

    // Effacer la session locale
    localStorage.removeItem('timebomb-session');

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
    declareWires,
    sendChatMessage,
    kickPlayer,
    leaveRoom,
    restartGame,
    reset,
    playerDeclarations,
    preventGameOverDisplay,
  };
});