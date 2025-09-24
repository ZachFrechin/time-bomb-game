import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { signToken } from '../utils/jwt';
import { config } from '../config';
import { gameEngine } from '../game/GameEngine';
import { redisService } from './redis.service';
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

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('create_room', async (data, callback) => {
        try {
          const room = gameEngine.createRoom(data.displayName, data.options);
          const playerId = Array.from(room.players.keys())[0];
          const player = room.players.get(playerId)!;
          player.socketId = socket.id;

          const token = signToken({ playerId, roomId: room.id, isMaster: true });

          socket.join(room.id);
          socket.data.playerId = playerId;
          socket.data.roomId = room.id;
          socket.data.displayName = data.displayName;

          await redisService.saveRoom(room);
          await redisService.savePlayerSession(playerId, {
            roomId: room.id,
            token,
            displayName: data.displayName,
          });

          callback({ success: true, roomId: room.id, token, playerId });

          this.broadcastLobbyUpdate(room.id);
        } catch (error) {
          console.error('Error creating room:', error);
          callback({ success: false, error: 'Failed to create room' });
        }
      });

      socket.on('join_room', async (data, callback) => {
        try {
          let room = gameEngine.getRoom(data.roomId);

          if (!room) {
            room = await redisService.getRoom(data.roomId) || undefined;
            if (!room) {
              callback({ success: false, error: 'Room not found' });
              return;
            }
          }

          const result = gameEngine.joinRoom(data.roomId, data.displayName, data.avatar);

          if (!result) {
            callback({ success: false, error: 'Cannot join room' });
            return;
          }

          const { playerId } = result;
          const player = room.players.get(playerId)!;
          player.socketId = socket.id;

          const token = signToken({ playerId, roomId: room.id, isMaster: false });

          socket.join(room.id);
          socket.data.playerId = playerId;
          socket.data.roomId = room.id;
          socket.data.displayName = data.displayName;

          await redisService.saveRoom(room);
          await redisService.savePlayerSession(playerId, {
            roomId: room.id,
            token,
            displayName: data.displayName,
          });

          callback({ success: true, roomId: room.id, token, playerId });

          socket.to(room.id).emit('joined_room', {
            roomId: room.id,
            playerId,
          });

          this.broadcastLobbyUpdate(room.id);
        } catch (error) {
          console.error('Error joining room:', error);
          callback({ success: false, error: 'Failed to join room' });
        }
      });

      socket.on('start_game', async (data) => {
        try {
          const room = gameEngine.getRoom(data.roomId);
          if (!room) return;

          const success = gameEngine.startGame(data.roomId);

          if (success && room.gameState) {
            await redisService.saveRoom(room);

            this.io.to(room.id).emit('game_started', {
              roomId: room.id,
              turnOrder: room.gameState.turnOrder,
              currentPlayerIndex: room.gameState.currentPlayerIndex,
            });

            room.players.forEach((player, _playerId) => {
              const playerSocket = this.io.sockets.sockets.get(player.socketId);
              if (playerSocket) {
                playerSocket.emit('private_hand', {
                  role: player.role!,
                  wireCards: player.wireCards.map((card, index) => ({
                    position: index,
                    isOwn: true,
                    type: card.type,  // Send the card type so player can see their own cards
                    isCut: card.isCut,
                  })),
                });
              }
            });

            const currentPlayerId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];
            const currentPlayer = room.players.get(currentPlayerId);

            this.io.to(room.id).emit('player_turn', {
              playerId: currentPlayerId,
              playerName: currentPlayer?.displayName || '',
            });
          }
        } catch (error) {
          console.error('Error starting game:', error);
          socket.emit('error', { code: 'START_FAILED', message: 'Failed to start game' });
        }
      });

      socket.on('cut_wire', async (data) => {
        try {
          const room = gameEngine.getRoom(data.roomId);
          if (!room) return;

          const playerId = socket.data.playerId;
          if (!playerId) return;

          const result = gameEngine.cutWire(
            data.roomId,
            playerId,
            data.targetPlayerId,
            data.wireIndex
          );

          if (result) {
            await redisService.saveRoom(room);

            // Send wire cut result
            this.io.to(room.id).emit('wire_cut_result', {
              ...result,
              newGameState: {
                currentPlayerIndex: room.gameState?.currentPlayerIndex,
                currentRound: room.gameState?.currentRound,
                defusesFound: room.gameState?.defusesFound,
                bombFound: room.gameState?.bombFound,
                totalDefusesNeeded: room.gameState?.totalDefusesNeeded,
                wiresPerPlayer: room.gameState?.wiresPerPlayer,
                cardsRevealedThisRound: room.gameState?.cardsRevealedThisRound,
              },
            });

            // Send updated player states separately
            this.io.to(room.id).emit('players_update', {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                displayName: p.displayName,
                isConnected: p.isConnected,
                isMaster: p.isMaster,
                wireCards: p.wireCards.map(card => ({
                  position: card.position,
                  isCut: card.isCut,
                  type: card.isCut ? card.type : undefined, // Only show type if cut
                })),
              })),
            });

            // Check if round changed (redistribution happened)
            if (room.gameState && room.gameState.cardsRevealedThisRound === 0 && room.gameState.currentRound > 1) {
              // Cards were redistributed, send new private hands
              room.players.forEach((player) => {
                const playerSocket = this.io.sockets.sockets.get(player.socketId);
                if (playerSocket) {
                  playerSocket.emit('private_hand', {
                    role: player.role!,
                    wireCards: player.wireCards.map((card, index) => ({
                      position: index,
                      isOwn: true,
                      type: card.type,
                      isCut: card.isCut,
                    })),
                  });
                }
              });
            }

            if (result.gameOver && result.winner) {
              const players = Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.displayName,
                role: p.role!,
              }));

              this.io.to(room.id).emit('game_over', {
                winnerTeam: result.winner,
                players,
              });
            } else if (room.gameState) {
              const nextPlayerId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];
              const nextPlayer = room.players.get(nextPlayerId);

              this.io.to(room.id).emit('player_turn', {
                playerId: nextPlayerId,
                playerName: nextPlayer?.displayName || '',
              });
            }
          }
        } catch (error) {
          console.error('Error cutting wire:', error);
          socket.emit('error', { code: 'CUT_FAILED', message: 'Failed to cut wire' });
        }
      });

      socket.on('send_chat', (data) => {
        if (!socket.data.roomId || socket.data.roomId !== data.roomId) return;

        this.io.to(data.roomId).emit('chat_message', {
          playerId: socket.data.playerId || '',
          playerName: socket.data.displayName || 'Unknown',
          message: data.message,
          timestamp: Date.now(),
        });
      });

      socket.on('kick_player', async (data) => {
        try {
          const success = gameEngine.kickPlayer(data.roomId, data.playerId);

          if (success) {
            const room = gameEngine.getRoom(data.roomId);
            if (room) {
              await redisService.saveRoom(room);

              const targetSocket = Array.from(this.io.sockets.sockets.values())
                .find(s => s.data.playerId === data.playerId);

              if (targetSocket) {
                targetSocket.leave(data.roomId);
                targetSocket.emit('player_kicked', {
                  playerId: data.playerId,
                  displayName: targetSocket.data.displayName || '',
                });
              }

              this.broadcastLobbyUpdate(data.roomId);
            }
          }
        } catch (error) {
          console.error('Error kicking player:', error);
        }
      });

      socket.on('leave_room', async (data) => {
        try {
          const room = gameEngine.getRoom(data.roomId);
          if (room && socket.data.playerId) {
            room.players.delete(socket.data.playerId);
            socket.leave(data.roomId);

            if (room.players.size === 0) {
              gameEngine.removeRoom(data.roomId);
              await redisService.deleteRoom(data.roomId);
            } else {
              await redisService.saveRoom(room);
              this.broadcastLobbyUpdate(data.roomId);
            }
          }
        } catch (error) {
          console.error('Error leaving room:', error);
        }
      });

      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);

        if (socket.data.roomId && socket.data.playerId) {
          const room = gameEngine.getRoom(socket.data.roomId);
          if (room) {
            const player = room.players.get(socket.data.playerId);
            if (player) {
              player.isConnected = false;
              await redisService.saveRoom(room);

              socket.to(room.id).emit('player_disconnected', {
                playerId: socket.data.playerId,
                displayName: socket.data.displayName || '',
              });
            }
          }
        }
      });
    });
  }

  private broadcastLobbyUpdate(roomId: string) {
    const room = gameEngine.getRoom(roomId);
    if (!room) return;

    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
      isConnected: p.isConnected,
      isMaster: p.isMaster,
      avatar: p.avatar,
    }));

    const masterId = Array.from(room.players.values())
      .find(p => p.isMaster)?.id || '';

    this.io.to(roomId).emit('lobby_update', {
      roomId,
      players: players as any,
      options: room.options,
      masterId,
    });
  }

  getIO() {
    return this.io;
  }
}

// Export singleton instance for use in GameEngine
export let socketServiceInstance: SocketService | null = null;