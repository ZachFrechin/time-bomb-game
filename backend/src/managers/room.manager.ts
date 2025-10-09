import { v4 as uuidv4 } from 'uuid';
import { Room, Player, RoomOptions, RoomState } from '../types/game.types';
import { config } from '../config';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    /**
     * Generate unique room ID
     */
    generateRoomId(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let roomId = '';

        for (let i = 0; i < config.game.roomIdLength; i++) {
            roomId += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Ensure uniqueness
        if (this.rooms.has(roomId)) {
            return this.generateRoomId();
        }

        return roomId;
    }

    /**
     * Create room options with defaults
     */
    createRoomOptions(options?: Partial<RoomOptions>): RoomOptions {
        const defaultOptions: RoomOptions = {
            maxPlayers: 6,
            isPublic: true,
            wiresPerPlayer: config.game.defaultWiresPerPlayer,
            timerPerPhase: undefined,
        };

        return { ...defaultOptions, ...options };
    }

    /**
     * Create a new room
     */
    createRoom(masterId: string, displayName: string, options?: Partial<RoomOptions>): Room {
        const roomId = this.generateRoomId();
        const roomOptions = this.createRoomOptions(options);

        const master: Player = {
            id: masterId,
            displayName,
            socketId: '',
            wireCards: [],
            isConnected: true,
            isMaster: true,
        };

        const room: Room = {
            id: roomId,
            state: 'lobby',
            players: new Map([[masterId, master]]),
            options: roomOptions,
            masterId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.rooms.set(roomId, room);
        return room;
    }

    /**
     * Get room by ID
     */
    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get all rooms
     */
    getAllRooms(): Room[] {
        return Array.from(this.rooms.values());
    }

    /**
     * Get public rooms in lobby state
     */
    getPublicLobbyRooms(): Room[] {
        return this.getAllRooms().filter(
            room => room.options.isPublic && room.state === 'lobby'
        );
    }

    /**
     * Update room state
     */
    updateRoomState(roomId: string, state: RoomState): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.state = state;
        room.updatedAt = new Date();
        return true;
    }

    /**
     * Remove room
     */
    removeRoom(roomId: string): boolean {
        return this.rooms.delete(roomId);
    }

    /**
     * Check if room exists
     */
    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    /**
     * Check if room can be joined
     */
    canJoinRoom(room: Room): { canJoin: boolean; reason?: string } {
        if (room.state !== 'lobby') {
            return { canJoin: false, reason: 'Game already started' };
        }

        if (room.players.size >= room.options.maxPlayers) {
            return { canJoin: false, reason: 'Room is full' };
        }

        return { canJoin: true };
    }

    /**
     * Check if game can start
     */
    canStartGame(room: Room): { canStart: boolean; reason?: string } {
        if (room.state !== 'lobby' && room.state !== 'finished') {
            return { canStart: false, reason: 'Game already in progress' };
        }

        if (room.players.size < config.game.minPlayers) {
            return {
                canStart: false,
                reason: `Need at least ${config.game.minPlayers} players to start`
            };
        }

        return { canStart: true };
    }

    /**
     * Update room timestamp
     */
    touchRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.updatedAt = new Date();
        }
    }

    /**
     * Clean up old rooms
     */
    cleanupOldRooms(maxAgeMinutes: number = 60): number {
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        let removedCount = 0;

        this.rooms.forEach((room, roomId) => {
            if (now - room.updatedAt.getTime() > maxAge) {
                this.rooms.delete(roomId);
                removedCount++;
            }
        });

        return removedCount;
    }

    /**
     * Get room statistics
     */
    getStats(): {
        totalRooms: number;
        publicRooms: number;
        privateRooms: number;
        inLobby: number;
        inGame: number;
        finished: number;
    } {
        const rooms = this.getAllRooms();

        return {
            totalRooms: rooms.length,
            publicRooms: rooms.filter(r => r.options.isPublic).length,
            privateRooms: rooms.filter(r => !r.options.isPublic).length,
            inLobby: rooms.filter(r => r.state === 'lobby').length,
            inGame: rooms.filter(r => r.state === 'in_game').length,
            finished: rooms.filter(r => r.state === 'finished').length,
        };
    }
}

export const roomManager = new RoomManager();