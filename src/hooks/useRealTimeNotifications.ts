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
  | { type: 'ADD';          payload: Notification       }
  | { type: 'SEED';         payload: Notification[]     }
  | { type: 'MARK_READ';    id: string                  }
  | { type: 'MARK_ALL_READ'                             }
  | { type: 'CLEAR_ALL'                                 }
  | { type: 'SET_CONNECTED'; value: boolean             }
  | { type: 'SET_ERROR';    message: string | null      };

const MAX_NOTIFICATIONS = 50;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': {
      // De-duplicate by id
      if (state.notifications.some(n => n.id === action.payload.id)) return state;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
      };
    }
    case 'SEED': {
      const existingIds = new Set(state.notifications.map(n => n.id));
      const fresh       = action.payload.filter(n => !existingIds.has(n.id));
      const merged      = [...state.notifications, ...fresh]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, MAX_NOTIFICATIONS);
      return { ...state, notifications: merged };
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

// ── Constants & helpers ────────────────────────────────────────────────────────
const STORAGE_KEY          = 'admin_notifications';
const MAX_RECONNECT        = 5;

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
  } catch { /* storage quota — fail silently */ }
}

function fireBrowserNotification(n: Pick<Notification, 'id' | 'title' | 'message'>): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission === 'granted') {
    new window.Notification(n.title, { body: n.message, icon: '/favicon.ico', tag: n.id });
  }
}

function build(
  partial: Omit<Notification, 'id' | 'timestamp' | 'read'>
): Notification {
  const n: Notification = {
    ...partial,
    id:        crypto.randomUUID(),
    timestamp: new Date(),
    read:      false,
  };
  fireBrowserNotification(n);
  return n;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useRealTimeNotifications(): UseRealTimeNotificationsReturn {
  const [state, dispatch] = useReducer(reducer, {
    notifications:   [],
    isConnected:     false,
    connectionError: null,
  });

  /*
   * dispatchRef: channel callbacks capture this ref, never a stale closure.
   * Every render updates dispatchRef.current, so callbacks always call the
   * latest dispatch without needing to re-subscribe.
   */
  const dispatchRef       = useRef(dispatch);
  dispatchRef.current     = dispatch;

  const channelsRef       = useRef<RealtimeChannel[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount    = useRef(0);
  const isMountedRef      = useRef(true);

  // ── Sync notifications → localStorage ────────────────────────────────────────
  useEffect(() => {
    writeStorage(state.notifications);
  }, [state.notifications]);

  // ── Request browser notification permission once ───────────────────────────
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  // ── Real-time subscription lifecycle ─────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    reconnectCount.current = 0;

    // Seed immediately from localStorage, then hydrate from DB
    dispatchRef.current({ type: 'SEED', payload: readStorage() });
    void seedFromDatabase();

    function teardown(): void {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function scheduleReconnect(): void {
      if (!isMountedRef.current) return;
      if (reconnectCount.current >= MAX_RECONNECT) {
        dispatchRef.current({
          type: 'SET_ERROR',
          message: 'Unable to establish real-time connection after multiple attempts.',
        });
        return;
      }
      // Exponential backoff: 1 s, 2 s, 4 s, 8 s, 16 s (capped at 30 s)
      const delay = Math.min(1_000 * 2 ** reconnectCount.current, 30_000);
      reconnectCount.current += 1;
      dispatchRef.current({
        type: 'SET_ERROR',
        message: `Reconnecting… (attempt ${reconnectCount.current}/${MAX_RECONNECT})`,
      });
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) { teardown(); subscribe(); }
      }, delay);
    }

    function onChannelStatus(status: string): void {
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
        // ── 1. New user registrations ────────────────────────────────────────
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
          .subscribe(onChannelStatus);

        // ── 2. Orders: INSERT + UPDATE on one channel ────────────────────────
        //    (Avoids a second channel listening to the same table for analytics)
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
          .subscribe();

        // ── 3. Products: low stock / out of stock ────────────────────────────
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
          .subscribe();

        channelsRef.current = [profiles, orders, products];
      } catch (err) {
        console.error('[useRealTimeNotifications] subscription error:', err);
        dispatchRef.current({
          type:    'SET_ERROR',
          message: 'Failed to establish real-time connection.',
        });
        scheduleReconnect();
      }
    }

    subscribe();

    return () => {
      isMountedRef.current = false;
      teardown();
    };
  }, []); // ← empty: stable mount/unmount lifecycle only

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

// ── DB seed (outside hook to avoid closure dependency) ────────────────────────
async function seedFromDatabase(): Promise<Notification[]> {
  const results: Notification[] = [];
  try {
    const [{ data: orders }, { data: users }, { data: lowStock }] = await Promise.all([
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

    orders?.forEach(o =>
      results.push({
        id:        `seed-order-${o.id}`,
        type:      (o.total ?? 0) >= 10_000 ? 'analytics_milestone' : 'order_update',
        title:     (o.total ?? 0) >= 10_000 ? 'Large Order Received' : 'Order Received',
        message:   `Order #${(o.id as string).slice(0, 8).toUpperCase()} — KES ${(o.total ?? 0).toLocaleString('en-KE')}`,
        timestamp: new Date(o.created_at as string),
        read:      true, // seeded history is pre-read
        data:      o as Record<string, unknown>,
      })
    );

    users?.forEach(u =>
      results.push({
        id:        `seed-user-${u.id}`,
        type:      'new_user',
        title:     'User Registered',
        message:   `${u.email as string} joined as ${(u.role as string) ?? 'customer'}.`,
        timestamp: new Date(u.created_at as string),
        read:      true,
        data:      u as Record<string, unknown>,
      })
    );

    lowStock?.forEach(p =>
      results.push({
        id:        `seed-stock-${p.id}`,
        type:      (p.stock as number) === 0 ? 'system_alert' : 'low_stock',
        title:     (p.stock as number) === 0 ? 'Out of Stock' : 'Low Stock Alert',
        message:   (p.stock as number) === 0
                     ? `"${p.name as string}" is out of stock.`
                     : `"${p.name as string}" has ${p.stock as number} units remaining.`,
        timestamp: new Date(),
        read:      true,
        data:      p as Record<string, unknown>,
      })
    );
  } catch (err) {
    console.error('[seedFromDatabase] error:', err);
  }
  return results;
}
