import { useSyncExternalStore } from 'react';
import { db } from './db.js';

export function useDB() {
  return useSyncExternalStore(db.subscribe, db.getSnapshot);
}

export function useTasks() {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  return store.tasks || [];
}

export function useLeads() {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  return store.leads || [];
}

export function useCalls() {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  return store.calls || [];
}

export function useChannels() {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  return store.channels || [];
}

export function useMessages(channelId) {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  if (!channelId) return store.messages || [];
  return (store.messages || []).filter((m) => m.channelId === channelId);
}

export function useSettings() {
  const store = useSyncExternalStore(db.subscribe, db.getSnapshot);
  return store.settings || { agentName: 'John Doe', agentPhone: '+919999900000' };
}
