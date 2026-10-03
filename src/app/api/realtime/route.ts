import { realtimeEmitter, StoreUpdateEvent } from '@/lib/realtimeEvents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      try {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\n\n`)
        );
      } catch (e) {
        // Stream might have closed
      }

      const onUpdate = (event: StoreUpdateEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: update\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch (e) {
          // Stream might have closed
        }
      };

      realtimeEmitter.on('store-update', onUpdate);

      // Heartbeat interval to prevent proxy / browser timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 25000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        realtimeEmitter.off('store-update', onUpdate);
        try {
          controller.close();
        } catch (e) {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
