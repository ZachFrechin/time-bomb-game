export type CardType = 'bomb' | 'safe' | 'neutral';
export type RoleType = 'good' | 'evil';
export type RoomState = 'lobby' | 'in_game' | 'finished';

export interface WireCard {
  position: number;
  isOwn: boolean;
  isCut?: boolean;
  type?: CardType;
}

export interface Player {
  id: string;
  displayName: string;
  isConnected: boolean;
  isMaster: boolean;
  avatar?: string;
  role?: RoleType;
  wireCards?: WireCard[];
}

export interface RoomOptions {
  maxPlayers: number;
  isPublic: boolean;
  timerPerPhase?: number;
  wiresPerPlayer: number;
}

export interface GameState {
  currentPlayerIndex: number;
  currentRound: number;
  currentPlayerId?: string;
  defusesFound: number;
  bombFound: boolean;
  totalDefusesNeeded: number;
  turnOrder: string[];
  winner?: 'good' | 'evil';
  wiresPerPlayer: number;
  cardsRevealedThisRound: number;
  lastTargetedPlayerId?: string;
}

export interface Room {
  id: string;
  state: RoomState;
  players: Player[];
  options: RoomOptions;
  gameState?: GameState;
  masterId: string;
}

export interface WireCutResult {
  cutterId: string;
  targetId: string;
  wireIndex: number;
  cardType: CardType;
  defusesFound: number;
  bombFound: boolean;
  gameOver: boolean;
  winner?: 'good' | 'evil';
}