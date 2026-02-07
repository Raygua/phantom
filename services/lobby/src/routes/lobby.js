import { Router } from 'express';
import { createLobby, getDefaultLobby, joinLobby } from '../controllers/lobbyController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Lobby
 *     description: Gestion des Lobby
 */

// crée un lobby avec des paramètres
router.get('/createLobby', createLobby);

// donne les infos par défaut d'un lobby
router.get('/getDefaultLobby', getDefaultLobby);

// rejoins un lobby avec un code
router.get('/joinLobby', joinLobby);

export default router;