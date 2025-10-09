// Types for service layer responses and parameters

export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface CreateRoomResult {
    room: any; // Will use Room from game.types
    playerId: string;
}

export interface JoinRoomResult {
    room: any; // Will use Room from game.types
    playerId: string;
}

export interface GameParameters {
    evilCount: number;
    goodCount: number;
    safeWireCount: number;
    bombCount: number;
    neutralCount: number;
    totalCards: number;
}

export interface RedistributionResult {
    success: boolean;
    newCardsPerPlayer: number;
    message?: string;
}

export interface PlayerSession {
    roomId: string;
    displayName: string;
}

export interface BroadcastOptions {
    excludeSocketId?: string;
    includePrivateData?: boolean;
}

export interface SocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface RoomValidation {
    canJoin: boolean;
    canStart: boolean;
    reason?: string;
}