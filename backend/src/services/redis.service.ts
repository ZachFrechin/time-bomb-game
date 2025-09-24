import { createClient } from 'redis';
import { config } from '../config';
import { Room } from '../types/game.types';

export class RedisService {
  private client;
  private subscriber;
  private publisher;

  constructor() {
    this.client = createClient({ url: config.redis.url });
    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
    this.publisher.on('error', (err) => console.error('Redis Publisher Error', err));
  }

  async connect() {
    await Promise.all([
      this.client.connect(),
      this.subscriber.connect(),
      this.publisher.connect(),
    ]);
    console.log('Redis connected successfully');
  }

  async disconnect() {
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
  }

  private roomKey(roomId: string): string {
    return `room:${roomId}`;
  }

  private playerKey(playerId: string): string {
    return `player:${playerId}`;
  }

  async saveRoom(room: Room): Promise<void> {
    const roomData = {
      ...room,
      players: Array.from(room.players.entries()).map(([_id, player]) => player),
    };

    await this.client.set(
      this.roomKey(room.id),
      JSON.stringify(roomData),
      {
        EX: config.game.roomExpiration,
      }
    );
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const data = await this.client.get(this.roomKey(roomId));
    if (!data) return null;

    const roomData = JSON.parse(data);
    const room: Room = {
      ...roomData,
      players: new Map(
        roomData.players.map((p: any) => [p.id, p])
      ),
      createdAt: new Date(roomData.createdAt),
      updatedAt: new Date(roomData.updatedAt),
    };

    return room;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.client.del(this.roomKey(roomId));
  }

  async getAllRooms(): Promise<Room[]> {
    const keys = await this.client.keys('room:*');
    const rooms: Room[] = [];

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        const roomData = JSON.parse(data);
        const room: Room = {
          ...roomData,
          players: new Map(
            roomData.players.map((p: any) => [p.id, p])
          ),
          createdAt: new Date(roomData.createdAt),
          updatedAt: new Date(roomData.updatedAt),
        };
        rooms.push(room);
      }
    }

    return rooms;
  }

  async savePlayerSession(playerId: string, data: any): Promise<void> {
    await this.client.set(
      this.playerKey(playerId),
      JSON.stringify(data),
      {
        EX: 86400,
      }
    );
  }

  async getPlayerSession(playerId: string): Promise<any | null> {
    const data = await this.client.get(this.playerKey(playerId));
    return data ? JSON.parse(data) : null;
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel, (message) => {
      callback(JSON.parse(message));
    });
  }
}

export const redisService = new RedisService();