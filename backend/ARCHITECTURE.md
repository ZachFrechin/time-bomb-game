# Backend Architecture Documentation

## Overview
The backend has been refactored to follow a clean, maintainable architecture with clear separation of concerns.

## Directory Structure

```
backend/src/
├── config/              # Configuration files
├── controllers/         # HTTP request handlers
│   ├── room.controller.ts
│   └── auth.controller.ts
├── game/               # Core game logic
│   └── GameEngine.refactored.ts
├── handlers/           # Socket.IO event handlers
│   ├── room.handler.ts
│   ├── game.handler.ts
│   ├── chat.handler.ts
│   └── connection.handler.ts
├── managers/           # Business logic managers
│   ├── room.manager.ts
│   ├── player.manager.ts
│   └── game-state.manager.ts
├── routes/             # Express route definitions
│   └── api.routes.ts
├── services/           # External service integrations
│   ├── socket.service.refactored.ts
│   ├── communicator.service.ts
│   ├── card.service.ts
│   ├── role.service.ts
│   └── redis.service.ts
├── types/              # TypeScript type definitions
│   ├── game.types.ts
│   ├── socket.types.ts
│   └── service.types.ts
├── utils/              # Utility functions
│   └── jwt.ts
└── index.refactored.ts # Application entry point
```

## Architecture Layers

### 1. **Controllers** (HTTP Layer)
- Handle HTTP requests and responses
- Validate input data
- Call appropriate services
- Return formatted responses

### 2. **Handlers** (WebSocket Layer)
- Handle Socket.IO events
- Manage real-time communication
- Delegate to services and managers

### 3. **Managers** (Business Logic Layer)
- Encapsulate business rules
- Manage domain entities (rooms, players, game state)
- Provide high-level operations

### 4. **Services** (Utility Layer)
- Provide reusable functionality
- Handle specific concerns (cards, roles, communication)
- Integrate with external services

### 5. **GameEngine** (Core Game Logic)
- Orchestrates game flow
- Uses managers and services
- Maintains game rules

## Key Components

### GameEngine
- **Responsibility**: Core game orchestration
- **Dependencies**: All managers and services
- **Methods**:
  - `createRoom()`: Create new game room
  - `joinRoom()`: Join existing room
  - `startGame()`: Initialize game
  - `cutWire()`: Process wire cutting action

### RoomManager
- **Responsibility**: Room lifecycle management
- **Key Methods**:
  - `generateRoomId()`: Create unique room IDs
  - `createRoom()`: Initialize room structure
  - `canJoinRoom()`: Validate join conditions
  - `cleanupOldRooms()`: Remove inactive rooms

### PlayerManager
- **Responsibility**: Player management
- **Key Methods**:
  - `createPlayer()`: Create player entity
  - `reconnectPlayer()`: Handle reconnections
  - `transferMaster()`: Change room master
  - `getPlayerStats()`: Calculate player statistics

### GameStateManager
- **Responsibility**: Game state transitions
- **Key Methods**:
  - `createInitialState()`: Initialize game state
  - `nextTurn()`: Advance turn order
  - `startNewRound()`: Begin new round
  - `checkWinConditions()`: Evaluate victory

### CommunicatorService
- **Responsibility**: All Socket.IO broadcasts
- **Key Methods**:
  - `broadcastLobbyUpdate()`: Update lobby state
  - `broadcastGameStart()`: Notify game start
  - `sendPrivateHand()`: Send player cards
  - `broadcastGameOver()`: Announce winner

### CardService
- **Responsibility**: Card and deck management
- **Key Methods**:
  - `calculateGameParameters()`: Determine game settings
  - `createWireDeck()`: Generate shuffled deck
  - `redistributeCards()`: Handle round transitions

### RoleService
- **Responsibility**: Role assignment and management
- **Key Methods**:
  - `distributeRoles()`: Assign team roles
  - `assignRolesToPlayers()`: Apply roles
  - `getRoleDistribution()`: Get team stats

## Data Flow

### Room Creation
1. HTTP Request → `RoomController.createRoom()`
2. `GameEngine.createRoom()` → `RoomManager.createRoom()`
3. Save to Redis → `RedisService.saveRoom()`
4. Return token → HTTP Response

### Joining Room
1. Socket Event → `RoomHandler.handleJoinRoom()`
2. `GameEngine.joinRoom()` → Check room availability
3. `PlayerManager.addPlayerToRoom()` → Add player
4. `CommunicatorService.broadcastLobbyUpdate()` → Notify all

### Starting Game
1. Socket Event → `GameHandler.handleStartGame()`
2. `GameEngine.startGame()` → Validate conditions
3. `RoleService.assignRoles()` → Distribute roles
4. `CardService.distributeCards()` → Deal cards
5. `GameStateManager.createInitialState()` → Initialize state
6. `CommunicatorService.broadcastGameStart()` → Notify all

### Wire Cutting
1. Socket Event → `GameHandler.handleCutWire()`
2. `GameEngine.cutWire()` → Validate action
3. Update wire state → Check win conditions
4. `GameStateManager.nextTurn()` → Advance turn
5. `CommunicatorService.broadcastWireCutResult()` → Notify all

## Benefits of New Architecture

1. **Separation of Concerns**: Each component has a single responsibility
2. **Testability**: Components can be tested in isolation
3. **Maintainability**: Easy to locate and modify specific functionality
4. **Scalability**: New features can be added without affecting existing code
5. **Reusability**: Services and managers can be reused across different contexts
6. **Type Safety**: Strong typing with TypeScript interfaces and types

## Migration Notes

- Original files are backed up in `/backup` directory
- Use `npm run migrate` to apply refactoring
- Use `npm run migrate:rollback` to restore original files
- All functionality remains identical to original implementation