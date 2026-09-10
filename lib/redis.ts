import Redis from "ioredis";

function getRedisUrl() {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) throw new Error("Falta UPSTASH_REDIS_URL en las variables de entorno");
  return url;
}

const globalForRedis = globalThis as unknown as {
  redisPublisher: Redis | undefined;
};

/** Cliente compartido, solo para publish. */
export const redisPublisher =
  globalForRedis.redisPublisher ?? new Redis(getRedisUrl());

if (process.env.NODE_ENV !== "production") globalForRedis.redisPublisher = redisPublisher;

/**
 * Un cliente en modo subscribe no puede ejecutar otros comandos, así que
 * cada ruta SSE necesita su propia conexión (no se puede compartir con el
 * singleton de publish).
 */
export function createRedisSubscriber() {
  return new Redis(getRedisUrl());
}
