import { Router } from 'express';
import { createLobby, getDefaultLobby, joinLobby } from '../controllers/lobbyController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Lobby
 *     description: Gestion des Lobby
 */

/**
 * @swagger
 * /create:
 * post:
 * summary: Crée un nouveau lobby
 */
router.post('/create', createLobby);

/**
 * @swagger
 * /join:
 * get:
 * summary: Vérifie si on peut rejoindre un lobby (HTTP check)
 */
router.get('/joinLobby', joinLobby);

/**
 * @swagger
 * /default:
 * get:
 * summary: Récupère la configuration par défaut
 */
router.get('/getDefaultLobby', getDefaultLobby);

export default router;