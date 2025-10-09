import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { SocketService } from './services/socket.service';
import { redisService } from './services/redis.service';
import { apiRouter } from './routes/api.routes';

const app = express();
const server = createServer(app);

// Initialize Socket Service
const socketService = new SocketService(server);

// Set the singleton instance for backward compatibility
const { socketServiceInstance } = require('./services/socket.service');
require('./services/socket.service').socketServiceInstance = socketService;

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Serve API documentation
app.use('/docs', express.static(path.join(__dirname, 'static')));

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRouter);

// Redirect root to docs
app.get('/', (_req, res) => {
    res.redirect('/docs/api-docs.html');
});

/**
 * Start the server
 */
async function startServer() {
    try {
        await redisService.connect();
        console.log('Connected to Redis');

        server.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
            console.log(`📚 API Documentation: http://localhost:${config.port}/docs/api-docs.html`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await redisService.disconnect();
    server.close();
    process.exit(0);
});

// Start the server
startServer();