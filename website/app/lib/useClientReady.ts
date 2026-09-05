'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const ready = () => true;
const server = () => false;
// Server-rendered controls must not invite clicks before their handlers exist.
export function useClientReady() { return useSyncExternalStore(subscribe, ready, server); }
