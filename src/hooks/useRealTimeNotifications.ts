import { useEffect, useCallback, useReducer, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Public types ───────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type:
    | 'new_user'
    | 'order_update'
    | 'system_alert'
    | 'low_stock'
    | 'content_submission'
    | 'analytics_milestone';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface UseRealTimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isConnected: boolean;
  connectionError: string | null;
}

// ── State machine ──────────────────────────────────────────────────────────────
type State = {
  notifications: Notification[];
  isConnected: boolean;
  connectionError: string | null;
};

type Action =
  | { type: 'ADD';           payload: Notification   }
  | { type: 'SEED';          payload: Notification[] }
  | { type: 'MARK_READ';     id: string              }
  | { type: 'MARK_ALL_READ'                          }
  | { type: 'CLEAR_ALL'                              }
  | { type: 'SET_CONNECTED'; value: boolean          }
  | { type: 'SET_ERROR';     message: string | null  };

const MAX_NOTIFICATIONS = 50;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': {
      if (state.notifications.some(n => n.id === action.payload.id)) return state;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
      };
    }
    case 'SEED': {
      const existingIds = new Set(state.notifications.map(n => n.id));
      const incoming    = action.payload.filter(n => !existingIds.has(n.id));
      if (!incoming.length) return state;
      return {
        ...state,
        notifications: [...state.notifications, ...incoming]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_NOTIFICATIONS),
      };
    }
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    case 'CLEAR_ALL':
      return { ...state, notifications: [] };
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected:     action.value,
        connectionError: action.value ? null : state.connectionError,
      };
    case 'SET_ERROR':
      return { ...state, connectionError: action.message };
    default:
      return state;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'admin_notifications';
const MAX_RECONNECT = 5;

function readStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map(n => ({
      ...(n as Omit<Notification, 'timestamp'>),
      timestamp: new Date(n.timestamp as string),
    }));
  } catch {
    return [];
  }
}

function writeStorage(notifications: Notification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch { /* quota exceeded — fail silently */ }
}

function fireBrowserNotif(n: Pick<Notification, 'id' | 'title' | 'message'>): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission === 'granted') {
    new window.Notification(n.title, { body: n.message, icon: '/favicon.ico', tag: n.id });
  }
}

/** Build a new Notification and fire a browser notification as a side-effect. */
function build(partial: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
  const n: Notification = {
    ...partial,
    id:        crypto.randomUUID(),
    timestamp: new Date(),
    read:      false,
  };
  fireBrowserNotif(n);
  return n;
}

// ── Seed from DB (pure async fn, no hook deps) ────────────────────────────────
async function seedFromDatabase(): Promise<Notification[]> {
  const results: Notification[] = [];

  try {
    const [
      { data: orders  },
      { data: users   },
      { data: lowStock },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('products')
        .select('id, name, stock')
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(10),
    ]);

    orders?.forEach(o => {
      const total   = (o.total as number) ?? 0;
      const isLarge = total >= 10_000;
      results.push({
        id:        `seed-order-${o.id as string}`,
        type:      isLarge ? 'analytics_milestone' : 'order_update',
        title:     isLarge ? 'Large Order Received' : 'Order Received',
        message:   `Order #${(o.id as string).slice(0, 8).toUpperCase()} — KES ${total.toLocaleString('en-KE')} (${(o.status as string).toUpperCase()})`,
        timestamp: new Date(o.created_at as string),
        read:      true,
        data:      o as Record<string, unknown>,
      });
    });

    users?.forEach(u => {
      results.push({
        id:        `seed-user-${u.id as string}`,
        type:      'new_user',
        title:     'User Registered',
        message:   `${u.email as string} joined as ${(u.role as string) ?? 'customer'}.`,
        timestamp: new Date(u.created_at as string),
        read:      true,
        data:      u as Record<string, unknown>,
      });
    });

    lowStock?.forEach(p => {
      const stock = p.stock as number;
      results.push({
        id:        `seed-stock-${p.id as string}`,
        type:      stock === 0 ? 'system_alert' : 'low_stock',
        title:     stock === 0 ? 'Out of Stock'  : 'Low Stock Alert',
        message:   stock === 0
          ? `"${p.name as string}" is out of stock.`
          : `"${p.name as string}" has ${stock} unit${stock === 1 ? '' : 's'} remaining.`,
        timestamp: new Date(),
        read:      true,
        data:      p as Record<string, unknown>,
      });
    });
  } catch (err) {
    console.error('[useRealTimeNotifications] seed error:', err);
  }

  return results;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useRealTimeNotifications(): UseRealTimeNotificationsReturn {
  const [state, dispatch] = useReducer(reducer, {
    notifications:   [],
    isConnected:     false,
    connectionError: null,
  });

  // Stable ref so channel callbacks never capture a stale dispatch
  const dispatchRef      = useRef(dispatch);
  dispatchRef.current    = dispatch;

  const channelsRef      = useRef<RealtimeChannel[]>([]);
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount   = useRef(0);
  const isMountedRef     = useRef(true);

  // ── Persist to localStorage whenever notifications change ────────────────────
  useEffect(() => {
    writeStorage(state.notifications);
  }, [state.notifications]);

  // ── Request browser notification permission once ──────────────────────────────
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      void window.Notification.requestPermission();
    }
  }, []);

  // ── Realtime lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current   = true;
    reconnectCount.current = 0;

    // 1. Hydrate from localStorage immediately (sync)
    dispatchRef.current({ type: 'SEED', payload: readStorage() });

    // 2. Hydrate from DB (async) — dispatch result when resolved
    seedFromDatabase().then(seed => {
      if (isMountedRef.current)
        dispatchRef.current({ type: 'SEED', payload: seed });
    });

    // 3. Subscribe to realtime
    subscribe();

    return () => {
      isMountedRef.current = false;
      teardown();
    };

    // ── Local helpers (access refs, no stale closures) ──────────────────────
    function teardown(): void {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function scheduleReconnect(): void {
      if (!isMountedRef.current) return;
      if (reconnectCount.current >= MAX_RECONNECT) {
        dispatchRef.current({
          type:    'SET_ERROR',
          message: 'Unable to connect after several attempts. Please refresh.',
        });
        return;
      }
      // Exponential backoff: 1s → 2s → 4s → 8s → 16s (hard cap 30s)
      const delay = Math.min(1_000 * 2 ** reconnectCount.current, 30_000);
      reconnectCount.current += 1;
      dispatchRef.current({
        type:    'SET_ERROR',
        message: `Reconnecting… (attempt ${reconnectCount.current}/${MAX_RECONNECT})`,
      });
      timerRef.current = setTimeout(() => {
        if (isMountedRef.current) { teardown(); subscribe(); }
      }, delay);
    }

    function onStatus(status: string): void {
      if (!isMountedRef.current) return;
      if (status === 'SUBSCRIBED') {
        dispatchRef.current({ type: 'SET_CONNECTED', value: true });
        reconnectCount.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        dispatchRef.current({ type: 'SET_CONNECTED', value: false });
        scheduleReconnect();
      } else if (status === 'CLOSED') {
        dispatchRef.current({ type: 'SET_CONNECTED', value: false });
      }
    }

    function subscribe(): void {
      try {
        // ── profiles: new user registrations ────────────────────────────────
        const profiles = supabase
          .channel('rtn_profiles')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'profiles' },
            ({ new: r }) =>
              dispatchRef.current({
                type: 'ADD',
                payload: build({
                  type:    'new_user',
                  title:   'New User Registered',
                  message: `${r.email as string} joined as ${(r.role as string) ?? 'customer'}.`,
                  data:    r as Record<string, unknown>,
                }),
              })
          )
          .subscribe(onStatus);

        // ── orders: new + updated ────────────────────────────────────────────
        const orders = supabase
          .channel('rtn_orders')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            ({ new: r }) => {
              const total   = (r.total as number) ?? 0;
              const isLarge = total >= 10_000;
              dispatchRef.current({
                type: 'ADD',
                payload: build(
                  isLarge
                    ? {
                        type:    'analytics_milestone',
                        title:   'Large Order Received',
                        message: `High-value order of KES ${total.toLocaleString('en-KE')} received.`,
                        data:    { value: total, type: 'large_order' },
                      }
                    : {
                        type:    'order_update',
                        title:   'New Order Received',
                        message: `Order #${(r.id as string).slice(0, 8).toUpperCase()} received.`,
                        data:    r as Record<string, unknown>,
                      }
                ),
              });
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            ({ new: r }) =>
              dispatchRef.current({
                type: 'ADD',
                payload: build({
                  type:    'order_update',
                  title:   'Order Status Updated',
                  message: `Order #${(r.id as string).slice(0, 8).toUpperCase()} → ${(r.status as string).toUpperCase()}.`,
                  data:    r as Record<string, unknown>,
                }),
              })
          )
          .subscribe(onStatus);

        // ── products: low stock / out of stock ───────────────────────────────
        const products = supabase
          .channel('rtn_products')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'products' },
            ({ new: r }) => {
              const stock = r.stock as number;
              if (stock > 5) return;
              dispatchRef.current({
                type: 'ADD',
                payload: build(
                  stock === 0
                    ? {
                        type:    'system_alert',
                        title:   'Product Out of Stock',
                        message: `"${r.name as string}" is now out of stock.`,
                        data:    r as Record<string, unknown>,
                      }
                    : {
                        type:    'low_stock',
                        title:   'Low Stock Alert',
                        message: `"${r.name as string}" has only ${stock} unit${stock === 1 ? '' : 's'} remaining.`,
                        data:    r as Record<string, unknown>,
                      }
                ),
              });
            }
          )
          .subscribe(onStatus);

        channelsRef.current = [profiles, orders, products];
      } catch (err) {
        console.error('[useRealTimeNotifications] subscribe error:', err);
        dispatchRef.current({
          type:    'SET_ERROR',
          message: 'Failed to establish real-time connection.',
        });
        scheduleReconnect();
      }
    }
  }, []); // mount/unmount only — all refs are stable

  // ── Actions ───────────────────────────────────────────────────────────────────
  const markAsRead = useCallback(
    (id: string) => dispatch({ type: 'MARK_READ', id }),
    []
  );

  const markAllAsRead = useCallback(
    () => dispatch({ type: 'MARK_ALL_READ' }),
    []
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return {
    notifications:   state.notifications,
    unreadCount:     state.notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
    clearAll,
    isConnected:     state.isConnected,
    connectionError: state.connectionError,
  };
}
