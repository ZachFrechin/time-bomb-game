import { v4 as uuidv4 } from 'uuid';
import {
  Room,
  Player,
  RoomOptions,
  GameState,
  WireCard,
  CardType,
  RoleType,
  WireCutResult,
} from '../types/game.types';
import { config } from '../config';

export class GameEngine {
  private rooms: Map<string, Room> = new Map();

  generateRoomId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < config.game.roomIdLength; i++) {
      roomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomId;
  }

  createRoom(displayName: string, options?: Partial<RoomOptions>): Room {
    const roomId = this.generateRoomId();
    const playerId = uuidv4();

    const defaultOptions: RoomOptions = {
      maxPlayers: 6,
      isPublic: true,
      wiresPerPlayer: config.game.defaultWiresPerPlayer,
      timerPerPhase: undefined,
    };

    const roomOptions = { ...defaultOptions, ...options };

    const master: Player = {
      id: playerId,
      displayName,
      socketId: '',
      wireCards: [],
      isConnected: true,
      isMaster: true,
    };

    const room: Room = {
      id: roomId,
      state: 'lobby',
      players: new Map([[playerId, master]]),
      options: roomOptions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, displayName: string, avatar?: string): { room: Room; playerId: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.state !== 'lobby') return null;

    // Vérifier si le joueur existe déjà par nom
    const existingPlayer = Array.from(room.players.values()).find(p => p.displayName === displayName);
    if (existingPlayer) {
      // Réactiver le joueur existant
      existingPlayer.isConnected = true;
      room.updatedAt = new Date();
      return { room, playerId: existingPlayer.id };
    }

    if (room.players.size >= room.options.maxPlayers) return null;

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      displayName,
      socketId: '',
      wireCards: [],
      isConnected: true,
      isMaster: false,
      avatar,
    };

    room.players.set(playerId, player);
    room.updatedAt = new Date();

    return { room, playerId };
  }

  private calculateGameParameters(playerCount: number) {
    // Moriarty count based on rules
    let evilCount: number;
    if (playerCount <= 4) {
      evilCount = 1;
    } else if (playerCount === 5) {
      evilCount = 1; // Could be 1 or 2, default to 1 for balance
    } else {
      evilCount = 2;
    }

    const goodCount = playerCount - evilCount;
    const bombCount = 1;
    const safeWireCount = playerCount; // Always equals number of players
    const totalCards = playerCount * 5; // 5 cards per player initially
    const neutralCount = totalCards - bombCount - safeWireCount;

    return {
      evilCount,
      goodCount,
      safeWireCount,
      bombCount,
      neutralCount,
      totalCards,
    };
  }

  private distributeRoles(playerCount: number): RoleType[] {
    const { evilCount, goodCount } = this.calculateGameParameters(playerCount);
    const roles: RoleType[] = [];

    for (let i = 0; i < evilCount; i++) {
      roles.push('evil');
    }
    for (let i = 0; i < goodCount; i++) {
      roles.push('good');
    }

    return this.shuffle(roles);
  }

  private createWireDeck(playerCount: number): CardType[] {
    const { safeWireCount, bombCount, neutralCount } = this.calculateGameParameters(playerCount);
    const deck: CardType[] = [];

    // Always 1 bomb
    for (let i = 0; i < bombCount; i++) {
      deck.push('bomb');
    }

    // Safe wires = number of players
    for (let i = 0; i < safeWireCount; i++) {
      deck.push('safe');
    }

    // Remaining cards are neutral
    for (let i = 0; i < neutralCount; i++) {
      deck.push('neutral');
    }

    return this.shuffle(deck);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private redistributeCards(room: Room): boolean {
    if (!room.gameState) return false;

    const players = Array.from(room.players.values());
    const gameState = room.gameState;

    // Collect all uncut cards
    const uncutCards: CardType[] = [];
    players.forEach(player => {
      player.wireCards.forEach(wire => {
        if (!wire.isCut) {
          uncutCards.push(wire.type);
        }
      });
    });

    // Calculate new cards per player (reduce by 1 each round)
    const newCardsPerPlayer = Math.max(1, gameState.wiresPerPlayer - 1);
    const totalCardsNeeded = players.length * newCardsPerPlayer;

    // Check if we have enough cards to continue
    if (uncutCards.length < totalCardsNeeded) {
      // Not enough cards - evil wins
      return false;
    }

    // Shuffle the uncut cards
    const shuffledCards = this.shuffle(uncutCards);

    // Redistribute cards to players
    players.forEach(player => {
      player.wireCards = [];
      for (let i = 0; i < newCardsPerPlayer; i++) {
        const cardType = shuffledCards.pop()!;
        const wireCard: WireCard = {
          id: uuidv4(),
          type: cardType,
          isCut: false,
          position: i,
        };
        player.wireCards.push(wireCard);
      }
    });

    // Update game state
    gameState.currentRound++;
    gameState.wiresPerPlayer = newCardsPerPlayer;
    gameState.cardsRevealedThisRound = 0;

    // Set first player for new round to the last targeted player
    if (gameState.lastTargetedPlayerId) {
      const targetIndex = gameState.turnOrder.indexOf(gameState.lastTargetedPlayerId);
      if (targetIndex !== -1) {
        gameState.currentPlayerIndex = targetIndex;
      }
    }

    return true;
  }

  startGame(roomId: string, _masterToken?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.state !== 'lobby' && room.state !== 'finished') return false;
    if (room.players.size < config.game.minPlayers) return false;

    const playerCount = room.players.size;
    const players = Array.from(room.players.values());

    const roles = this.distributeRoles(playerCount);
    const wireDeck = this.createWireDeck(playerCount);

    players.forEach((player, index) => {
      player.role = roles[index];
      player.wireCards = [];

      // Each player gets 5 cards initially
      for (let i = 0; i < 5; i++) {
        const cardType = wireDeck.pop()!;
        const wireCard: WireCard = {
          id: uuidv4(),
          type: cardType,
          isCut: false,
          position: i,
        };
        player.wireCards.push(wireCard);
      }
    });

    const turnOrder = this.shuffle(players.map(p => p.id));
    const { safeWireCount } = this.calculateGameParameters(playerCount);

    const gameState: GameState = {
      currentPlayerIndex: 0,
      currentRound: 1,
      defusesFound: 0, // This will track safe wires found
      bombFound: false,
      turnOrder,
      wiresPerPlayer: 5, // Start with 5 cards per player
      totalDefusesNeeded: safeWireCount, // Need to find ALL safe wires
      cardsRevealedThisRound: 0,
    };

    room.state = 'in_game';
    room.gameState = gameState;
    room.updatedAt = new Date();

    return true;
  }

  cutWire(roomId: string, cutterId: string, targetId: string, wireIndex: number): WireCutResult | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return null;
    if (room.state !== 'in_game') return null;

    const gameState = room.gameState;
    const currentPlayerId = gameState.turnOrder[gameState.currentPlayerIndex];

    if (currentPlayerId !== cutterId) return null;
    if (cutterId === targetId) return null;

    const targetPlayer = room.players.get(targetId);
    if (!targetPlayer) return null;

    const wire = targetPlayer.wireCards[wireIndex];
    if (!wire || wire.isCut) return null;

    wire.isCut = true;
    const cardType = wire.type;
    gameState.cardsRevealedThisRound++;
    gameState.lastTargetedPlayerId = targetId;

    let gameOver = false;
    let winner: 'good' | 'evil' | undefined;

    if (cardType === 'bomb') {
      gameState.bombFound = true;
      gameOver = true;
      winner = 'evil';
    } else if (cardType === 'safe') {
      gameState.defusesFound++;
      if (gameState.defusesFound >= gameState.totalDefusesNeeded) {
        gameOver = true;
        winner = 'good';
      }
    }
    // Neutral cards do nothing special

    if (!gameOver) {
      // Check if round should end (revealed = player count)
      const playerCount = room.players.size;
      if (gameState.cardsRevealedThisRound >= playerCount) {
        // Round ends - wait 5 seconds then redistribute cards
        console.log('🎯 SERVER: Round complete, starting 5s timer before redistribution');
        setTimeout(() => {
          console.log('🔄 SERVER: 5s elapsed, redistributing cards...');
          const canContinue = this.redistributeCards(room);
          console.log('📊 SERVER: Redistribution result:', canContinue);
          console.log('📋 SERVER: New cards per player:', room.gameState?.wiresPerPlayer);

          if (!canContinue) {
            // Not enough cards to continue - evil wins
            console.log('❌ SERVER: Not enough cards, evil wins');
            gameOver = true;
            winner = 'evil';
            room.state = 'finished';
            gameState.winner = winner;
          } else {
            // Send updated cards to clients
            console.log('📡 SERVER: Sending players_update to clients');
            const { socketServiceInstance } = require('../services/socket.service');
            if (socketServiceInstance?.getIO) {
              const playersData = Array.from(room.players.values()).map(p => ({
                id: p.id,
                displayName: p.displayName,
                isConnected: p.isConnected,
                isMaster: p.isMaster,
                wireCards: p.wireCards.map(card => ({
                  position: card.position,
                  isCut: card.isCut,
                  type: card.isCut ? card.type : undefined, // Only show type if cut
                })),
              }));
              console.log('📦 SERVER: Players data:', playersData[0]?.wireCards?.length, 'cards per player');
              socketServiceInstance.getIO().to(roomId).emit('players_update', {
                players: playersData,
                gameState: {
                  wiresPerPlayer: gameState.wiresPerPlayer,
                  cardsRevealedThisRound: 0,
                  currentRound: gameState.currentRound
                }
              });

              // Send new private hands to each player
              console.log('🎴 SERVER: Sending private hands to players');
              room.players.forEach((player) => {
                const playerSocket = socketServiceInstance.getIO().sockets.sockets.get(player.socketId);
                if (playerSocket) {
                  playerSocket.emit('private_hand', {
                    role: player.role!,
                    wireCards: player.wireCards.map((card, index) => ({
                      position: index,
                      isOwn: true,
                      type: card.type,
                      isCut: card.isCut,
                    })),
                  });
                }
              });
            } else {
              console.log('❌ SERVER: socketServiceInstance not available');
            }
          }
        }, 5000); // 5 seconds delay for client timers
      } else {
        // Continue round - targeted player becomes active
        const targetPlayerIndex = gameState.turnOrder.indexOf(targetId);
        if (targetPlayerIndex !== -1) {
          gameState.currentPlayerIndex = targetPlayerIndex;
        }
      }
    } else {
      room.state = 'finished';
      gameState.winner = winner;
    }

    room.updatedAt = new Date();

    return {
      cutterId,
      targetId,
      wireIndex,
      cardType,
      defusesFound: gameState.defusesFound,
      bombFound: gameState.bombFound,
      gameOver,
      winner,
    };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(
      room => room.options.isPublic && room.state === 'lobby'
    );
  }

  kickPlayer(roomId: string, playerId: string, _masterToken?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.state !== 'lobby') return false;

    const player = room.players.get(playerId);
    if (!player || player.isMaster) return false;

    room.players.delete(playerId);
    room.updatedAt = new Date();

    return true;
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}

export const gameEngine = new GameEngine();