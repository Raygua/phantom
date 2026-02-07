import express from 'express';
import morgan from 'morgan';
import routes from './routes/card.js';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';

const app = express();

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
  app.listen(PORT, async () => {
    console.log('Card service running…');
  });
}

startServer().catch((err) => {
  console.error("Erreur au démarrage du serveur :", err);
  process.exit(1);
});