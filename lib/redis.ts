import Redis from "ioredis";

function getRedisUrl() {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) throw new Error("Falta UPSTASH_REDIS_URL en las variables de entorno");
  return url;
}

const globalForRedis = globalThis as unknown as {
  redisPublisher: Redis | undefined;
};

/**
 * Cliente compartido, solo para publish. Se crea recién en el primer uso
 * (no al importar el módulo) para no abrir una conexión real durante el
 * build de Next.js (Vercel evalúa los módulos al "recolectar datos de
 * página" y no siempre tiene las env vars ahí, ni hace falta una conexión
 * real en ese paso).
 */
export function getRedisPublisher(): Redis {
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = new Redis(getRedisUrl());
  }
  return globalForRedis.redisPublisher;
}

/**
 * Un cliente en modo subscribe no puede ejecutar otros comandos, así que
 * cada ruta SSE necesita su propia conexión (no se puede compartir con el
 * singleton de publish).
 */
export function createRedisSubscriber() {
  return new Redis(getRedisUrl());
}
