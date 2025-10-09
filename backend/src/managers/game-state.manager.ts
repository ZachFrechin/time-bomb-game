import { GameState, Room, Player } from '../types/game.types';
import { cardService } from '../services/card.service';

export class GameStateManager {
    /**
     * Create initial game state
     */
    createInitialState(players: Player[], playerCount: number): GameState {
        const turnOrder = this.createTurnOrder(players);
        const { safeWireCount } = cardService.calculateGameParameters(playerCount);

        return {
            currentPlayerIndex: 0,
            currentRound: 1,
            defusesFound: 0,
            bombFound: false,
            turnOrder,
            wiresPerPlayer: 5,
            totalDefusesNeeded: safeWireCount,
            cardsRevealedThisRound: 0,
        };
    }

    /**
     * Create randomized turn order
     */
    private createTurnOrder(players: Player[]): string[] {
        const playerIds = players.map(p => p.id);
        return this.shuffle(playerIds);
    }

    /**
     * Move to next player turn
     */
    nextTurn(gameState: GameState, targetPlayerId?: string): void {
        if (targetPlayerId) {
            const targetIndex = gameState.turnOrder.indexOf(targetPlayerId);
            if (targetIndex !== -1) {
                gameState.currentPlayerIndex = targetIndex;
            }
        } else {
            gameState.currentPlayerIndex =
                (gameState.currentPlayerIndex + 1) % gameState.turnOrder.length;
        }
    }

    /**
     * Get current player ID
     */
    getCurrentPlayerId(gameState: GameState): string {
        return gameState.turnOrder[gameState.currentPlayerIndex];
    }

    /**
     * Check if it's a specific player's turn
     */
    isPlayerTurn(gameState: GameState, playerId: string): boolean {
        return this.getCurrentPlayerId(gameState) === playerId;
    }

    /**
     * Start new round
     */
    startNewRound(gameState: GameState, newCardsPerPlayer: number): void {
        gameState.currentRound++;
        gameState.wiresPerPlayer = newCardsPerPlayer;
        gameState.cardsRevealedThisRound = 0;

        // Reset player declarations
        gameState.playerDeclarations = {};

        // Set turn to last targeted player if exists
        if (gameState.lastTargetedPlayerId) {
            const targetIndex = gameState.turnOrder.indexOf(gameState.lastTargetedPlayerId);
            if (targetIndex !== -1) {
                gameState.currentPlayerIndex = targetIndex;
            }
        }
    }

    /**
     * Check if round is complete
     */
    isRoundComplete(gameState: GameState, playerCount: number): boolean {
        return gameState.cardsRevealedThisRound >= playerCount;
    }

    /**
     * Record wire cut
     */
    recordWireCut(gameState: GameState, targetPlayerId: string): void {
        gameState.cardsRevealedThisRound++;
        gameState.lastTargetedPlayerId = targetPlayerId;
    }

    /**
     * Record defuse found
     */
    recordDefuseFound(gameState: GameState): void {
        gameState.defusesFound++;
    }

    /**
     * Record bomb found
     */
    recordBombFound(gameState: GameState): void {
        gameState.bombFound = true;
    }

    /**
     * Check if good team wins
     */
    checkGoodWin(gameState: GameState): boolean {
        return gameState.defusesFound >= gameState.totalDefusesNeeded;
    }

    /**
     * Check if evil team wins
     */
    checkEvilWin(gameState: GameState): boolean {
        return gameState.bombFound;
    }

    /**
     * Set game winner
     */
    setWinner(gameState: GameState, winner: 'good' | 'evil'): void {
        gameState.winner = winner;
    }

    /**
     * Add player declaration
     */
    addPlayerDeclaration(
        gameState: GameState,
        playerId: string,
        declaration: { safeWires: number; hasBomb: boolean }
    ): void {
        if (!gameState.playerDeclarations) {
            gameState.playerDeclarations = {};
        }
        gameState.playerDeclarations[playerId] = declaration;
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

export const gameStateManager = new GameStateManager();