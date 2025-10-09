import { Server, Socket } from 'socket.io';
import { Room, Player, GameState, WireCutResult } from '../types/game.types';
import { SocketMessage, BroadcastOptions } from '../types/service.types';

/**
 * Service responsible for all Socket.IO communications
 * Centralizes broadcast logic and message formatting
 */
export class CommunicatorService {
    private io: Server | null = null;

    /**
     * Initialize the communicator with Socket.IO server instance
     */
    initialize(io: Server): void {
        this.io = io;
    }

    /**
     * Broadcast lobby update to all players in a room
     */
    broadcastLobbyUpdate(room: Room, options?: BroadcastOptions): void {
        if (!this.io) return;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            displayName: p.displayName,
            isConnected: p.isConnected,
            isMaster: p.isMaster,
            avatar: p.avatar
        }));

        const message: SocketMessage = {
            type: 'lobby_update',
            data: {
                roomId: room.id,
                players,
                state: room.state,
                options: room.options
            },
            timestamp: Date.now()
        };

        if (options?.excludeSocketId) {
            this.io.to(room.id).except(options.excludeSocketId).emit('lobby_update', message.data);
        } else {
            this.io.to(room.id).emit('lobby_update', message.data);
        }
    }

    /**
     * Broadcast game start to all players in a room
     */
    broadcastGameStart(room: Room): void {
        if (!this.io || !room.gameState) return;

        // Calculate total cards from all players' wireCards
        const totalCards = Array.from(room.players.values())
            .reduce((sum, player) => sum + player.wireCards.length, 0);

        const message: SocketMessage = {
            type: 'game_started',
            data: {
                roomId: room.id,
                gameState: this.getPublicGameState(room, room.gameState),
                totalCards
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('game_started', message.data);

        // Send private hands to each player
        room.players.forEach(player => {
            const socket = this.getPlayerSocket(room.id, player.id);
            if (socket) {
                this.sendPrivateHand(socket, player);
            }
        });
    }

    /**
     * Send private hand information to a specific player
     */
    sendPrivateHand(socket: Socket, player: Player): void {
        socket.emit('receive_hand', {
            hand: player.wireCards,
            role: player.role,
            playerId: player.id
        });
    }

    /**
     * Broadcast game state update to all players
     */
    broadcastGameStateUpdate(room: Room): void {
        if (!this.io || !room.gameState) return;

        const currentPlayerId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];

        const message: SocketMessage = {
            type: 'game_state_update',
            data: {
                gameState: this.getPublicGameState(room, room.gameState),
                currentRound: room.gameState.currentRound,
                currentTurn: room.gameState.currentPlayerIndex,
                currentPlayerId
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('game_state_update', message.data);
    }

    /**
     * Broadcast card cut action
     */
    broadcastCardCut(room: Room, playerId: string, targetId: string, cardId: string, cardType: string): void {
        if (!this.io) return;

        const targetPlayer = room.players.get(targetId);
        const cardsRemaining = targetPlayer ?
            targetPlayer.wireCards.filter(w => !w.isCut).length : 0;

        const message: SocketMessage = {
            type: 'card_cut',
            data: {
                playerId,
                targetId,
                cardId,
                cardType,
                cardsRemaining
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('card_cut', message.data);
    }

    /**
     * Broadcast round end with results
     */
    broadcastRoundEnd(room: Room, roundNumber: number, success: boolean, nextRound: boolean): void {
        if (!this.io || !room.gameState) return;

        const message: SocketMessage = {
            type: 'round_ended',
            data: {
                roundNumber,
                success,
                cardsRevealed: room.gameState.cardsRevealedThisRound,
                nextRound
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('round_ended', message.data);
    }

    /**
     * Broadcast game over with final results
     */
    broadcastGameOver(room: Room, winners: 'good' | 'evil'): void {
        if (!this.io || !room.gameState) return;

        const playerRoles = Array.from(room.players.values()).map(p => ({
            id: p.id,
            displayName: p.displayName,
            role: p.role,
            wasWinner: p.role === winners
        }));

        const message: SocketMessage = {
            type: 'game_over',
            data: {
                winners,
                playerRoles,
                finalState: this.getPublicGameState(room, room.gameState)
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('game_over', message.data);
    }

    /**
     * Broadcast player reconnection
     */
    broadcastPlayerReconnected(room: Room, playerId: string): void {
        if (!this.io) return;

        const player = room.players.get(playerId);
        if (!player) return;

        const message: SocketMessage = {
            type: 'player_reconnected',
            data: {
                playerId,
                displayName: player.displayName
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('player_reconnected', message.data);
    }

    /**
     * Broadcast player disconnection
     */
    broadcastPlayerDisconnected(room: Room, playerId: string): void {
        if (!this.io) return;

        const player = room.players.get(playerId);
        if (!player) return;

        const message: SocketMessage = {
            type: 'player_disconnected',
            data: {
                playerId,
                displayName: player.displayName
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('player_disconnected', message.data);
    }

    /**
     * Broadcast chat message
     */
    broadcastChatMessage(roomId: string, playerId: string, displayName: string, message: string): void {
        if (!this.io) return;

        const chatMessage: SocketMessage = {
            type: 'chat_message',
            data: {
                playerId,
                displayName,
                message,
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        this.io.to(roomId).emit('chat_message', chatMessage.data);
    }

    /**
     * Send error message to specific socket
     */
    sendError(socket: Socket, error: string, details?: any): void {
        socket.emit('error', {
            message: error,
            details,
            timestamp: Date.now()
        });
    }

    /**
     * Send success message to specific socket
     */
    sendSuccess(socket: Socket, message: string, data?: any): void {
        socket.emit('success', {
            message,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get public game state (without revealing hidden information)
     */
    private getPublicGameState(room: Room, gameState: GameState): any {
        const currentPlayerId = gameState.turnOrder[gameState.currentPlayerIndex];
        const isGameOver = gameState.winner !== undefined;

        const playerHandCounts = Array.from(room.players.entries()).map(([playerId, player]) => ({
            playerId,
            cardCount: player.wireCards.filter(w => !w.isCut).length
        }));

        return {
            currentRound: gameState.currentRound,
            currentTurn: gameState.currentPlayerIndex,
            currentPlayerId,
            cardsRevealed: gameState.cardsRevealedThisRound,
            defusesFound: gameState.defusesFound,
            bombFound: gameState.bombFound,
            playerHandCounts,
            isGameOver,
            winner: gameState.winner
        };
    }

    /**
     * Get socket for a specific player
     */
    private getPlayerSocket(roomId: string, playerId: string): Socket | null {
        if (!this.io) return null;

        const sockets = this.io.sockets.adapter.rooms.get(roomId);
        if (!sockets) return null;

        for (const socketId of sockets) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.data.playerId === playerId) {
                return socket;
            }
        }

        return null;
    }

    /**
     * Notify room that it will expire soon
     */
    notifyRoomExpiring(roomId: string, minutesLeft: number): void {
        if (!this.io) return;

        const message: SocketMessage = {
            type: 'room_expiring',
            data: {
                minutesLeft,
                message: `This room will expire in ${minutesLeft} minutes due to inactivity`
            },
            timestamp: Date.now()
        };

        this.io.to(roomId).emit('room_expiring', message.data);
    }

    /**
     * Broadcast player update (generic update for any player change)
     */
    broadcastPlayerUpdate(room: Room): void {
        if (!this.io) return;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            displayName: p.displayName,
            isConnected: p.isConnected,
            isMaster: p.isMaster,
            avatar: p.avatar,
            handCount: p.wireCards.filter(w => !w.isCut).length
        }));

        const message: SocketMessage = {
            type: 'players_update',
            data: {
                players
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('players_update', message.data);
    }

    /**
     * Broadcast redistribution complete and send new hands
     */
    broadcastRedistribution(room: Room): void {
        if (!this.io || !room.gameState) return;

        // Broadcast the game state update to all players
        this.broadcastGameStateUpdate(room);

        // Send new private hands to each player
        room.players.forEach(player => {
            const socket = this.getPlayerSocket(room.id, player.id);
            if (socket) {
                this.sendPrivateHand(socket, player);
            }
        });
    }

    /**
     * Broadcast wire cut result
     */
    broadcastWireCutResult(room: Room, result: any): void {
        if (!this.io) return;

        const message: SocketMessage = {
            type: 'wire_cut_result',
            data: result,
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('wire_cut_result', message.data);
    }

    /**
     * Broadcast players update
     */
    broadcastPlayersUpdate(room: Room): void {
        this.broadcastPlayerUpdate(room);
    }

    /**
     * Announce player turn
     */
    announcePlayerTurn(room: Room): void {
        if (!this.io || !room.gameState) return;

        const currentPlayerId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];

        const message: SocketMessage = {
            type: 'player_turn',
            data: {
                currentPlayerId,
                currentTurn: room.gameState.currentPlayerIndex,
                currentRound: room.gameState.currentRound
            },
            timestamp: Date.now()
        };

        this.io.to(room.id).emit('player_turn', message.data);
    }

    /**
     * Broadcast player declaration
     */
    broadcastPlayerDeclaration(roomId: string, playerId: string, declaration: { safeWires: number; hasBomb: boolean }): void {
        if (!this.io) return;

        const message: SocketMessage = {
            type: 'player_declaration',
            data: {
                playerId,
                declaration
            },
            timestamp: Date.now()
        };

        this.io.to(roomId).emit('player_declaration', message.data);
    }

    /**
     * Send reconnection data to a player
     */
    sendReconnectionData(socket: Socket, room: Room, playerId: string): void {
        const player = room.players.get(playerId);
        if (!player) return;

        // Send room state
        socket.emit('reconnected', {
            roomId: room.id,
            playerId,
            roomState: room.state,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                displayName: p.displayName,
                isConnected: p.isConnected,
                isMaster: p.isMaster,
                avatar: p.avatar
            }))
        });

        // If in game, send game state and hand
        if (room.state === 'in_game' && room.gameState) {
            socket.emit('game_state', this.getPublicGameState(room, room.gameState));
            this.sendPrivateHand(socket, player);
        }

        // Broadcast reconnection to others
        this.broadcastPlayerReconnected(room, playerId);
    }

    /**
     * Notify that a player joined the room
     */
    notifyRoomJoined(roomId: string, playerId: string): void {
        if (!this.io) return;

        const message: SocketMessage = {
            type: 'player_joined',
            data: {
                playerId
            },
            timestamp: Date.now()
        };

        this.io.to(roomId).emit('player_joined', message.data);
    }

    /**
     * Notify a player they were kicked
     */
    notifyPlayerKicked(socket: Socket, playerId: string, displayName: string): void {
        socket.emit('kicked', {
            playerId,
            displayName,
            message: 'You have been kicked from the room'
        });
    }
}

export const communicatorService = new CommunicatorService();