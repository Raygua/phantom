import { createClient } from 'redis';

// Création du client avec l'URL fournie par Docker
const redis = createClient({
  url: process.env.REDIS_URI
});

redis.on('error', (err) => console.log('Redis Client Error', err));
redis.on('connect', () => console.log('Redis Client Connecté'));

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}

export { redis, connectRedis };