import { RoleType, Player } from '../types/game.types';
import { cardService } from './card.service';

export class RoleService {
    /**
     * Distribute roles among players based on player count
     */
    distributeRoles(playerCount: number): RoleType[] {
        const { evilCount, goodCount } = cardService.calculateGameParameters(playerCount);
        const roles: RoleType[] = [];

        // Add evil roles
        for (let i = 0; i < evilCount; i++) {
            roles.push('evil');
        }

        // Add good roles
        for (let i = 0; i < goodCount; i++) {
            roles.push('good');
        }

        return this.shuffle(roles);
    }

    /**
     * Assign roles to players
     */
    assignRolesToPlayers(players: Player[]): void {
        const roles = this.distributeRoles(players.length);

        players.forEach((player, index) => {
            player.role = roles[index];
        });
    }

    /**
     * Check if a player is evil
     */
    isEvil(player: Player): boolean {
        return player.role === 'evil';
    }

    /**
     * Check if a player is good
     */
    isGood(player: Player): boolean {
        return player.role === 'good';
    }

    /**
     * Get all players with a specific role
     */
    getPlayersByRole(players: Player[], role: RoleType): Player[] {
        return players.filter(p => p.role === role);
    }

    /**
     * Get role distribution stats
     */
    getRoleDistribution(players: Player[]): { good: number; evil: number } {
        const good = players.filter(p => this.isGood(p)).length;
        const evil = players.filter(p => this.isEvil(p)).length;
        return { good, evil };
    }

    /**
     * Generic shuffle function
     */
    private shuffle<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export const roleService = new RoleService();