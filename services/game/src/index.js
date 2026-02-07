import express from 'express';
import morgan from 'morgan';
import routes from './routes/game.js';
import { connectRedis } from "./config/redisClient.js";
import { createServer } from 'http';
import { initGameSocket } from './controllers/gameController.js';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';

const app = express();
const httpServer = createServer(app);

app.use(morgan('dev'));
app.use(express.json());
app.use('/', routes);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

const PORT = 80;
async function startServer() {
  const redisClient = await connectRedis();

  const io = new Server(httpServer, {
    cors: { 
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io'
  });

  initGameSocket(io, redisClient);
  httpServer.listen(PORT, () => {
    console.log(`Game service (WebSocket) running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erreur au démarrage du serveur :", err);
  process.exit(1);
});