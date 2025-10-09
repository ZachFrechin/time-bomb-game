import { v4 as uuidv4 } from 'uuid';
import { Room, RoomOptions, WireCutResult, CardType } from '../types/game.types';
import { config } from '../config';
import { roomManager } from '../managers/room.manager';
import { playerManager } from '../managers/player.manager';
import { gameStateManager } from '../managers/game-state.manager';
import { cardService } from '../services/card.service';
import { roleService } from '../services/role.service';
import { communicatorService } from '../services/communicator.service';

export class GameEngine {
    /**
     * Create a new room
     */
    createRoom(displayName: string, options?: Partial<RoomOptions>): Room {
        const playerId = uuidv4();
        const room = roomManager.createRoom(playerId, displayName, options);
        return room;
    }

    /**
     * Join an existing room
     */
    joinRoom(roomId: string, displayName: string, avatar?: string): { room: Room; playerId: string } | null {
        const room = roomManager.getRoom(roomId);
        if (!room) return null;

        // Check if can join
        const { canJoin, reason } = roomManager.canJoinRoom(room);
        if (!canJoin) {
            console.log(`Cannot join room: ${reason}`);
            return null;
        }

        // Check for existing player
        const existingPlayer = playerManager.findPlayerByName(room, displayName);
        if (existingPlayer) {
            // Reconnect existing player
            existingPlayer.isConnected = true;
            roomManager.touchRoom(roomId);
            return { room, playerId: existingPlayer.id };
        }

        // Create new player
        const player = playerManager.createPlayer(displayName, false, avatar);
        playerManager.addPlayerToRoom(room, player);

        return { room, playerId: player.id };
    }

    /**
     * Start the game
     */
    startGame(roomId: string): boolean {
        const room = roomManager.getRoom(roomId);
        if (!room) return false;

        // Check if can start
        const { canStart, reason } = roomManager.canStartGame(room);
        if (!canStart) {
            console.log(`Cannot start game: ${reason}`);
            return false;
        }

        const players = playerManager.getPlayersArray(room);

        // Assign roles
        roleService.assignRolesToPlayers(players);

        // Distribute initial cards
        cardService.distributeCardsToPlayers(players, 5);

        // Create game state
        const gameState = gameStateManager.createInitialState(players, players.length);
        room.gameState = gameState;

        // Update room state
        roomManager.updateRoomState(roomId, 'in_game');

        return true;
    }

    /**
     * Handle wire cutting
     */
    cutWire(roomId: string, cutterId: string, targetId: string, wireIndex: number): WireCutResult | null {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.gameState) return null;
        if (room.state !== 'in_game') return null;

        // Validate turn
        if (!gameStateManager.isPlayerTurn(room.gameState, cutterId)) {
            console.log('Not player turn');
            return null;
        }

        // Validate target
        if (cutterId === targetId) {
            console.log('Cannot cut own wire');
            return null;
        }

        const targetPlayer = playerManager.getPlayer(room, targetId);
        if (!targetPlayer) return null;

        // Validate wire
        const wire = targetPlayer.wireCards[wireIndex];
        if (!wire || wire.isCut) return null;

        // Cut the wire
        wire.isCut = true;
        const cardType = wire.type;

        // Update game state
        gameStateManager.recordWireCut(room.gameState, targetId);

        // Process result
        const result = this.processWireCutResult(room, cutterId, targetId, wireIndex, cardType);

        // Handle round completion
        if (!result.gameOver && gameStateManager.isRoundComplete(room.gameState, room.players.size)) {
            this.scheduleRoundTransition(room);
        } else if (!result.gameOver) {
            // Move to next turn
            gameStateManager.nextTurn(room.gameState, targetId);
        }

        roomManager.touchRoom(roomId);
        return result;
    }

    /**
     * Process wire cut result
     */
    private processWireCutResult(
        room: Room,
        cutterId: string,
        targetId: string,
        wireIndex: number,
        cardType: CardType
    ): WireCutResult {
        const gameState = room.gameState!;
        let gameOver = false;
        let winner: 'good' | 'evil' | undefined;

        if (cardType === 'bomb') {
            gameStateManager.recordBombFound(gameState);
            gameOver = true;
            winner = 'evil';
        } else if (cardType === 'safe') {
            gameStateManager.recordDefuseFound(gameState);
            if (gameStateManager.checkGoodWin(gameState)) {
                gameOver = true;
                winner = 'good';
            }
        }

        if (gameOver && winner) {
            roomManager.updateRoomState(room.id, 'finished');
            gameStateManager.setWinner(gameState, winner);
        }

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

    /**
     * Schedule round transition
     */
    private scheduleRoundTransition(room: Room): void {
        console.log('🎯 SERVER: Round complete, will start 5s timer after returning result');

        setTimeout(() => {
            console.log('🔄 SERVER: 5s elapsed, redistributing cards...');
            const success = this.redistributeCards(room);

            if (!success) {
                console.log('❌ SERVER: Not enough cards, evil wins');
                roomManager.updateRoomState(room.id, 'finished');
                if (room.gameState) {
                    gameStateManager.setWinner(room.gameState, 'evil');
                }
                communicatorService.broadcastGameOver(room, 'evil');
            } else {
                console.log('📡 SERVER: Sending updates to clients');
                // Broadcast the redistribution with new hands
                communicatorService.broadcastRedistribution(room);
            }
        }, 5000);
    }

    /**
     * Redistribute cards for new round
     */
    private redistributeCards(room: Room): boolean {
        if (!room.gameState) return false;

        const players = playerManager.getPlayersArray(room);
        const newCardsPerPlayer = Math.max(1, room.gameState.wiresPerPlayer - 1);

        // Check if redistribution is possible
        if (!cardService.canRedistributeCards(players, newCardsPerPlayer)) {
            return false;
        }

        // Redistribute cards
        cardService.redistributeCards(players, newCardsPerPlayer);

        // Start new round
        gameStateManager.startNewRound(room.gameState, newCardsPerPlayer);

        return true;
    }

    /**
     * Kick a player from room
     */
    kickPlayer(roomId: string, playerId: string, requesterId: string): boolean {
        const room = roomManager.getRoom(roomId);
        if (!room) return false;

        if (!playerManager.canKickPlayer(room, playerId, requesterId)) {
            return false;
        }

        return playerManager.removePlayerFromRoom(room, playerId);
    }

    /**
     * Handle player declaration
     */
    declareWires(
        roomId: string,
        playerId: string,
        declaration: { safeWires: number; hasBomb: boolean }
    ): boolean {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.gameState) return false;

        gameStateManager.addPlayerDeclaration(room.gameState, playerId, declaration);
        roomManager.touchRoom(roomId);

        return true;
    }

    /**
     * Get room
     */
    getRoom(roomId: string): Room | undefined {
        return roomManager.getRoom(roomId);
    }

    /**
     * Get all public rooms
     */
    getAllPublicRooms(): Room[] {
        return roomManager.getPublicLobbyRooms();
    }

    /**
     * Remove room
     */
    removeRoom(roomId: string): void {
        roomManager.removeRoom(roomId);
    }
}

export const gameEngine = new GameEngine();