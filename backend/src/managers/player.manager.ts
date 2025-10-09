import { v4 as uuidv4 } from 'uuid';
import { Player, Room } from '../types/game.types';

export class PlayerManager {
    /**
     * Create a new player
     */
    createPlayer(displayName: string, isMaster: boolean = false, avatar?: string): Player {
        return {
            id: uuidv4(),
            displayName,
            socketId: '',
            wireCards: [],
            isConnected: true,
            isMaster,
            avatar,
        };
    }

    /**
     * Add player to room
     */
    addPlayerToRoom(room: Room, player: Player): boolean {
        if (room.players.has(player.id)) {
            return false;
        }

        room.players.set(player.id, player);
        room.updatedAt = new Date();
        return true;
    }

    /**
     * Remove player from room
     */
    removePlayerFromRoom(room: Room, playerId: string): boolean {
        const result = room.players.delete(playerId);
        if (result) {
            room.updatedAt = new Date();
        }
        return result;
    }

    /**
     * Find player by display name in room
     */
    findPlayerByName(room: Room, displayName: string): Player | undefined {
        return Array.from(room.players.values()).find(
            p => p.displayName === displayName
        );
    }

    /**
     * Get player from room
     */
    getPlayer(room: Room, playerId: string): Player | undefined {
        return room.players.get(playerId);
    }

    /**
     * Update player connection status
     */
    updatePlayerConnection(room: Room, playerId: string, isConnected: boolean, socketId?: string): boolean {
        const player = room.players.get(playerId);
        if (!player) return false;

        player.isConnected = isConnected;
        if (socketId !== undefined) {
            player.socketId = socketId;
        }
        room.updatedAt = new Date();
        return true;
    }

    /**
     * Reconnect existing player
     */
    reconnectPlayer(room: Room, playerId: string, socketId: string): boolean {
        return this.updatePlayerConnection(room, playerId, true, socketId);
    }

    /**
     * Disconnect player
     */
    disconnectPlayer(room: Room, playerId: string): boolean {
        return this.updatePlayerConnection(room, playerId, false);
    }

    /**
     * Get all connected players
     */
    getConnectedPlayers(room: Room): Player[] {
        return Array.from(room.players.values()).filter(p => p.isConnected);
    }

    /**
     * Get all disconnected players
     */
    getDisconnectedPlayers(room: Room): Player[] {
        return Array.from(room.players.values()).filter(p => !p.isConnected);
    }

    /**
     * Check if player is master
     */
    isMaster(player: Player): boolean {
        return player.isMaster;
    }

    /**
     * Transfer master role
     */
    transferMaster(room: Room, newMasterId: string): boolean {
        const newMaster = room.players.get(newMasterId);
        if (!newMaster) return false;

        // Remove master from current master
        room.players.forEach(player => {
            player.isMaster = false;
        });

        // Set new master
        newMaster.isMaster = true;
        room.masterId = newMasterId;
        room.updatedAt = new Date();

        return true;
    }

    /**
     * Auto-select new master if current master leaves
     */
    autoSelectMaster(room: Room): string | null {
        const connectedPlayers = this.getConnectedPlayers(room);
        if (connectedPlayers.length === 0) return null;

        // Prefer the first connected player
        const newMaster = connectedPlayers[0];
        this.transferMaster(room, newMaster.id);
        return newMaster.id;
    }

    /**
     * Get player statistics
     */
    getPlayerStats(player: Player): {
        totalCards: number;
        cutCards: number;
        uncutCards: number;
        hasBomb: boolean;
        safeWires: number;
    } {
        const cutCards = player.wireCards.filter(w => w.isCut).length;
        const uncutCards = player.wireCards.filter(w => !w.isCut).length;
        const hasBomb = player.wireCards.some(w => w.type === 'bomb' && !w.isCut);
        const safeWires = player.wireCards.filter(w => w.type === 'safe' && !w.isCut).length;

        return {
            totalCards: player.wireCards.length,
            cutCards,
            uncutCards,
            hasBomb,
            safeWires,
        };
    }

    /**
     * Check if player can be kicked
     */
    canKickPlayer(room: Room, playerId: string, requesterId: string): boolean {
        const requester = room.players.get(requesterId);
        const target = room.players.get(playerId);

        if (!requester || !target) return false;
        if (!requester.isMaster) return false;
        if (target.isMaster) return false;
        if (room.state !== 'lobby') return false;

        return true;
    }

    /**
     * Get players as array
     */
    getPlayersArray(room: Room): Player[] {
        return Array.from(room.players.values());
    }

    /**
     * Count players
     */
    getPlayerCount(room: Room): number {
        return room.players.size;
    }
}

export const playerManager = new PlayerManager();