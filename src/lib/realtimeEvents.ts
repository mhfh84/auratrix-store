import { EventEmitter } from 'events';

// Global singleton — persists for the lifetime of the Node.js process.
// Storing it on globalThis means HMR in dev won't create duplicate emitters
// with leaked listeners and runaway heartbeat timers.
const globalForEvents = globalThis as unknown as {
  realtimeEmitter: EventEmitter | undefined;
};

export const realtimeEmitter = globalForEvents.realtimeEmitter ?? new EventEmitter();

// Cap at 50 concurrent SSE connections.
// Each open connection holds a listener + a 25-second heartbeat interval.
// 200 connections × those resources can silently eat RAM on a small VPS.
realtimeEmitter.setMaxListeners(50);

// Always persist — not just in dev — so the singleton survives between
// fast-refresh reloads without spawning duplicate emitters.
globalForEvents.realtimeEmitter = realtimeEmitter;

export type StoreUpdateType = 'products' | 'categories' | 'deals' | 'all';

export interface StoreUpdateEvent {
  type: StoreUpdateType;
  data?: any;
  timestamp: number;
}

export function notifyStoreUpdate(type: StoreUpdateType = 'all', data?: any) {
  const event: StoreUpdateEvent = {
    type,
    data,
    timestamp: Date.now(),
  };
  realtimeEmitter.emit('store-update', event);
}
