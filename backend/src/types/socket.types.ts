import { Player, RoleType, WireCutResult } from './game.types';

export interface ServerToClientEvents {
  room_created: (data: { roomId: string; token: string }) => void;
  joined_room: (data: { roomId: string; playerId: string }) => void;
  join_error: (data: { error: string }) => void;
  lobby_update: (data: {
    roomId: string;
    players: Omit<Player, 'role' | 'wireCards'>[];
    options: any;
    masterId: string;
  }) => void;
  game_started: (data: {
    roomId: string;
    turnOrder: string[];
    currentPlayerIndex: number;
  }) => void;
  private_hand: (data: {
    role: RoleType;
    wireCards: Array<{ position: number; isOwn: boolean; type?: string; isCut?: boolean }>;
  }) => void;
  player_turn: (data: { playerId: string; playerName: string }) => void;
  wire_cut_result: (data: WireCutResult & { newGameState: any }) => void;
  players_update: (data: {
    players: Array<{
      id: string;
      displayName: string;
      isConnected: boolean;
      isMaster: boolean;
      wireCards: Array<{ position: number; isCut: boolean; type?: string }>;
    }>;
  }) => void;
  game_over: (data: {
    winnerTeam: 'good' | 'evil';
    players: Array<{ id: string; name: string; role: RoleType }>;
  }) => void;
  player_disconnected: (data: { playerId: string; displayName: string }) => void;
  player_reconnected: (data: { playerId: string; playerName: string }) => void;
  player_kicked: (data: { playerId: string; displayName: string }) => void;
  error: (data: { code: string; message: string }) => void;
  chat_message: (data: { playerId: string; playerName: string; message: string; timestamp: number }) => void;
  reconnect_success: (data: { roomId: string; playerId: string; gameState: any }) => void;
  reconnect_failed: (data: { reason: string }) => void;
  room_joined: (data: {
    room: any;
    playerId: string;
    token: string;
  }) => void;
  game_state_update: (data: {
    gameState: any;
  }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { displayName: string; options?: any }, callback: (response: any) => void) => void;
  join_room: (data: {
    roomId: string;
    displayName?: string;
    playerName?: string;
    avatar?: string;
    playerId?: string;
  }, callback: (response: any) => void) => void;
  start_game: (data: { roomId: string; masterToken: string }) => void;
  cut_wire: (data: { roomId: string; targetPlayerId: string; wireIndex: number }) => void;
  send_chat: (data: { roomId: string; message: string }) => void;
  kick_player: (data: { roomId: string; playerId: string; masterToken: string }) => void;
  leave_room: (data: { roomId: string }) => void;
  reconnect_attempt: (data: { roomId: string; playerId: string; token: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  roomId?: string;
  displayName?: string;
}