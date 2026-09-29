import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";
import { createRedisSubscriber } from "@/lib/redis";
import { CHANNELS } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, role } = await getCurrentUser();
  if (!userId || !role || !ROUTE_ROLES["/cocina"].includes(role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscriber = createRedisSubscriber();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      await subscriber.subscribe(CHANNELS.VENTAS);
      subscriber.on("message", (_channel, message) => {
        try {
          send(JSON.parse(message));
        } catch {
          // ignorar mensajes mal formados
        }
      });
    },
    cancel() {
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
