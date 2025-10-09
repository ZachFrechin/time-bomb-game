import { v4 as uuidv4 } from 'uuid';
import { CardType, WireCard, Player } from '../types/game.types';
import { GameParameters } from '../types/service.types';

export class CardService {
    /**
     * Calculate game parameters based on player count
     */
    calculateGameParameters(playerCount: number): GameParameters {
        let evilCount: number;

        if (playerCount <= 3) {
            evilCount = 1;
        } else if (playerCount === 4) {
            evilCount = Math.random() < 0.5 ? 1 : 2;
        } else if (playerCount === 5) {
            evilCount = 2;
        } else if (playerCount === 7) {
            evilCount = Math.random() < 0.5 ? 2 : 3;
        } else if (playerCount === 8) {
            evilCount = 3;
        } else {
            evilCount = 2;
        }

        const goodCount = playerCount - evilCount;
        const bombCount = 1;
        const safeWireCount = playerCount;
        const totalCards = playerCount * 5;
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

    /**
     * Create a shuffled deck of wire cards
     */
    createWireDeck(playerCount: number): CardType[] {
        const { safeWireCount, bombCount, neutralCount } = this.calculateGameParameters(playerCount);
        const deck: CardType[] = [];

        // Add bombs
        for (let i = 0; i < bombCount; i++) {
            deck.push('bomb');
        }

        // Add safe wires
        for (let i = 0; i < safeWireCount; i++) {
            deck.push('safe');
        }

        // Add neutral wires
        for (let i = 0; i < neutralCount; i++) {
            deck.push('neutral');
        }

        return this.shuffle(deck);
    }

    /**
     * Create wire cards for a player
     */
    createPlayerWireCards(cardTypes: CardType[]): WireCard[] {
        return cardTypes.map((type, index) => ({
            id: uuidv4(),
            type,
            isCut: false,
            position: index,
        }));
    }

    /**
     * Distribute cards to players from a deck
     */
    distributeCardsToPlayers(players: Player[], cardsPerPlayer: number): void {
        const playerCount = players.length;
        const deck = this.createWireDeck(playerCount);

        players.forEach(player => {
            player.wireCards = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const cardType = deck.pop()!;
                const wireCard: WireCard = {
                    id: uuidv4(),
                    type: cardType,
                    isCut: false,
                    position: i,
                };
                player.wireCards.push(wireCard);
            }
        });
    }

    /**
     * Collect all uncut cards from players
     */
    collectUncutCards(players: Player[]): CardType[] {
        const uncutCards: CardType[] = [];

        players.forEach(player => {
            player.wireCards.forEach(wire => {
                if (!wire.isCut) {
                    uncutCards.push(wire.type);
                }
            });
        });

        return uncutCards;
    }

    /**
     * Redistribute uncut cards among players
     */
    redistributeCards(players: Player[], newCardsPerPlayer: number): CardType[] {
        const uncutCards = this.collectUncutCards(players);
        const shuffledCards = this.shuffle(uncutCards);

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

        return shuffledCards;
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

    /**
     * Check if there are enough cards for redistribution
     */
    canRedistributeCards(players: Player[], newCardsPerPlayer: number): boolean {
        const uncutCards = this.collectUncutCards(players);
        const totalCardsNeeded = players.length * newCardsPerPlayer;
        return uncutCards.length >= totalCardsNeeded;
    }
}

export const cardService = new CardService();