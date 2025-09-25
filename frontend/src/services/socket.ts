import { io, Socket } from 'socket.io-client';
import type { Player, RoleType, WireCard, WireCutResult } from '@/types/game';

interface ServerToClientEvents {
  room_created: (data: { roomId: string; token: string }) => void;
  joined_room: (data: { roomId: string; playerId: string }) => void;
  join_error: (data: { error: string }) => void;
  lobby_update: (data: {
    roomId: string;
    players: Player[];
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
    wireCards: WireCard[];
  }) => void;
  player_turn: (data: { playerId: string; playerName: string }) => void;
  wire_cut_result: (data: WireCutResult & { newGameState: any }) => void;
  game_over: (data: {
    winnerTeam: 'good' | 'evil';
    players: Array<{ id: string; name: string; role: RoleType }>;
  }) => void;
  player_disconnected: (data: { playerId: string; displayName: string }) => void;
  player_reconnected: (data: { playerId: string; displayName: string }) => void;
  player_kicked: (data: { playerId: string; displayName: string }) => void;
  error: (data: { code: string; message: string }) => void;
  chat_message: (data: { playerId: string; playerName: string; message: string; timestamp: number }) => void;
  reconnect_success: (data: { roomId: string; playerId: string; gameState: any }) => void;
  reconnect_failed: (data: { reason: string }) => void;
}

interface ClientToServerEvents {
  create_room: (data: { displayName: string; options?: any }, callback: (response: any) => void) => void;
  join_room: (data: { roomId: string; displayName: string; avatar?: string }, callback: (response: any) => void) => void;
  start_game: (data: { roomId: string; masterToken: string }) => void;
  cut_wire: (data: { roomId: string; targetPlayerId: string; wireIndex: number }) => void;
  send_chat: (data: { roomId: string; message: string }) => void;
  kick_player: (data: { roomId: string; playerId: string; masterToken: string }) => void;
  leave_room: (data: { roomId: string }) => void;
  reconnect_attempt: (data: { roomId: string; playerId: string; token: string }) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected, skipping connection')
      return;
    }

    // Si un socket existe mais n'est pas connecté, le détruire et recréer
    if (this.socket) {
      console.log('Destroying existing disconnected socket')
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    console.log('Creating new socket connection...')
    this.socket = io({
      transports: ['websocket', 'polling'], // Ajouter polling comme fallback pour mobile
      reconnection: true,
      reconnectionAttempts: Infinity, // Toujours essayer de se reconnecter
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true, // Forcer une nouvelle connexion
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server - Socket ID:', this.socket?.id);
      // Émettre un événement custom pour notifier la reconnexion
      this.emit('socket_reconnected' as any);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Gérer les tentatives de reconnexion
    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt #' + attemptNumber);
    });

    this.socket.io.on('reconnect', (attemptNumber) => {
      console.log('✅ Reconnected after ' + attemptNumber + ' attempts');
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (this.socket) {
      this.socket.emit(event, ...args as any);
    }
  }

  on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }
}

export const socketService = new SocketService();
export type { ServerToClientEvents, ClientToServerEvents };