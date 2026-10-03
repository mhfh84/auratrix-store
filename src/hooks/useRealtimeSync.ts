'use client';

import { useEffect, useRef, useCallback } from 'react';

export type StoreUpdateType = 'products' | 'categories' | 'deals' | 'all';

export interface RealtimeMessage {
  type: StoreUpdateType;
  data?: any;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = 'auratrix_store_realtime_channel';

// Helper to broadcast update locally across all open browser tabs
export function broadcastLocalStoreUpdate(type: StoreUpdateType = 'all', data?: any) {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage({ type, data, timestamp: Date.now() });
      bc.close();
    } catch (e) {
      // BroadcastChannel failed silently
    }
  }
}

/**
 * Hook to listen for realtime store updates (products, categories, deals).
 * Combines Server-Sent Events (SSE), local BroadcastChannel, and window focus sync.
 */
export function useRealtimeSync(
  onUpdate?: (event: RealtimeMessage) => void,
  options: {
    types?: StoreUpdateType[];
    pollingIntervalMs?: number;
  } = {}
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const types = options.types;
  const pollingIntervalMs = options.pollingIntervalMs ?? 60000;

  const handleUpdate = useCallback(
    (event: RealtimeMessage) => {
      if (!types || types.length === 0 || types.includes(event.type) || event.type === 'all') {
        if (onUpdateRef.current) {
          onUpdateRef.current(event);
        }
      }
    },
    [types]
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let broadcastChannel: BroadcastChannel | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSubscribed = true;
    let sseConnected = false;

    // 1. BroadcastChannel listener for zero-delay cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannel.onmessage = (msg: MessageEvent<RealtimeMessage>) => {
          if (isSubscribed && msg.data) {
            handleUpdate(msg.data);
          }
        };
      } catch (e) {
        // Fallback without BroadcastChannel
      }
    }

    // 2. SSE Connection with auto-reconnect
    const connectSSE = () => {
      if (!isSubscribed) return;
      try {
        eventSource = new EventSource('/api/realtime');

        eventSource.addEventListener('connected', () => {
          sseConnected = true;
        });

        eventSource.addEventListener('update', (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data: RealtimeMessage = JSON.parse(e.data);
            handleUpdate(data);
          } catch (err) {
            // Silently ignore malformed SSE messages
          }
        });

        eventSource.onerror = () => {
          sseConnected = false;
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isSubscribed) {
            // Reconnect after 10s to avoid hammering the server
            reconnectTimeout = setTimeout(connectSSE, 10000);
          }
        };
      } catch (err) {
        sseConnected = false;
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectSSE, 10000);
        }
      }
    };

    connectSSE();

    // 3. Fallback periodic polling — only fires when SSE is NOT connected
    // This prevents unnecessary re-renders when the SSE stream is healthy
    let pollInterval: NodeJS.Timeout | null = null;
    if (pollingIntervalMs > 0) {
      pollInterval = setInterval(() => {
        if (isSubscribed && !sseConnected && document.visibilityState === 'visible') {
          handleUpdate({ type: 'all', timestamp: Date.now() });
        }
      }, pollingIntervalMs);
    }

    // 4. Trigger sync on window focus after being away (visibility change only, not regular focus)
    let lastHiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && isSubscribed) {
        // Only sync if tab was hidden for more than 30 seconds
        if (Date.now() - lastHiddenAt > 30000) {
          handleUpdate({ type: 'all', timestamp: Date.now() });
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isSubscribed = false;
      if (broadcastChannel) broadcastChannel.close();
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleUpdate, pollingIntervalMs]);
}
