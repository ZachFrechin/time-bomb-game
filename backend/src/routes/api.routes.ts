import { Router } from 'express';
import { roomController } from '../controllers/room.controller';

export const apiRouter = Router();

// Room routes
apiRouter.post('/room/create', (req, res) => roomController.createRoom(req, res));
apiRouter.post('/room/join', (req, res) => roomController.joinRoom(req, res));
apiRouter.get('/room/:roomId/status', (req, res) => roomController.getRoomStatus(req, res));
apiRouter.get('/rooms', (req, res) => roomController.getAllRooms(req, res));