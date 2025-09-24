export type CardType = 'bomb' | 'safe' | 'neutral';
export type RoleType = 'good' | 'evil';
export type RoomState = 'lobby' | 'in_game' | 'finished';

export interface WireCard {
  id: string;
  type: CardType;
  isCut: boolean;
  position: number;
}

export interface Player {
  id: string;
  displayName: string;
  socketId: string;
  role?: RoleType;
  wireCards: WireCard[];
  isConnected: boolean;
  isMaster: boolean;
  avatar?: string;
}

export interface RoomOptions {
  maxPlayers: number;
  isPublic: boolean;
  timerPerPhase?: number;
  wiresPerPlayer: number;
  defuseCount?: number;
}

export interface GameState {
  currentPlayerIndex: number;
  currentRound: number;
  defusesFound: number;
  bombFound: boolean;
  turnOrder: string[];
  winner?: 'good' | 'evil';
  wiresPerPlayer: number;
  totalDefusesNeeded: number;
  cardsRevealedThisRound: number;
  lastTargetedPlayerId?: string;
}

export interface Room {
  id: string;
  state: RoomState;
  players: Map<string, Player>;
  options: RoomOptions;
  gameState?: GameState;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomRequest {
  displayName: string;
  options?: Partial<RoomOptions>;
  avatar?: string;
}

export interface JoinRoomRequest {
  roomId: string;
  displayName: string;
  avatar?: string;
}

export interface CutWireRequest {
  roomId: string;
  targetPlayerId: string;
  wireIndex: number;
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