import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { config } from '../config';
import { roomHandler } from '../handlers/room.handler';
import { gameHandler } from '../handlers/game.handler';
import { chatHandler } from '../handlers/chat.handler';
import { connectionHandler } from '../handlers/connection.handler';
import { communicatorService } from './communicator.service';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
} from '../types/socket.types';

export class SocketService {
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

    constructor(server: Server) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: config.cors.origin,
                credentials: config.cors.credentials,
            },
        });

        // Initialize communicator with Socket.IO instance
        communicatorService.initialize(this.io);

        this.setupEventHandlers();
    }

    /**
     * Setup all socket event handlers
     */
    private setupEventHandlers(): void {
        this.io.on('connection', (socket) => {
            // Connection events
            connectionHandler.handleConnection(socket);

            // Room events
            socket.on('create_room', (data, callback) =>
                roomHandler.handleCreateRoom(socket, data, callback));

            socket.on('join_room', (data, callback) =>
                roomHandler.handleJoinRoom(socket, data, callback));

            socket.on('leave_room', (data) =>
                roomHandler.handleLeaveRoom(socket, data));

            socket.on('kick_player', (data) =>
                roomHandler.handleKickPlayer(socket, data));

            // Game events
            socket.on('start_game', (data) =>
                gameHandler.handleStartGame(socket, data));

            socket.on('cut_wire', (data) =>
                gameHandler.handleCutWire(socket, data));

            socket.on('declare_wires', (data, callback) =>
                gameHandler.handleDeclareWires(socket, data, callback));

            // Chat events
            socket.on('send_chat', (data) =>
                chatHandler.handleSendChat(socket, data));

            // Disconnection
            socket.on('disconnect', () =>
                connectionHandler.handleDisconnect(socket));
        });
    }

    /**
     * Get Socket.IO instance
     */
    getIO(): SocketIOServer {
        return this.io;
    }
}

// Export singleton instance
export let socketServiceInstance: SocketService | null = null;