import { useEffect, useRef, useCallback, useReducer } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Public types ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type:
    | 'new_user'
    | 'order_update'
    | 'low_stock'
    | 'system_alert'
    | 'analytics_milestone'
    | 'content_submission';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: Record<string, any>;
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

// ── Internal state machine ────────────────────────────────────────────────────
type State = {
  notifications: Notification[];
  isConnected: boolean;
  connectionError: string | null;
};

type Action =
  | { type: 'ADD'; payload: Notification }
  | { type: 'SEED'; payload: Notification[] }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_CONNECTED'; value: boolean }
  | { type: 'SET_ERROR'; message: string | null };

const MAX_NOTIFICATIONS = 60;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': {
      // De-duplicate by id; cap at MAX_NOTIFICATIONS
      const exists = state.notifications.some(n => n.id === action.payload.id);
      if (exists) return state;
      const updated = [action.payload, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return { ...state, notifications: updated };
    }
    case 'SEED': {
      // Merge seed with existing (real-time may have arrived before seed)
      const existingIds = new Set(state.notifications.map(n => n.id));
      const fresh = action.payload.filter(n => !existingIds.has(n.id));
      const merged = [...state.notifications, ...fresh]
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
      return { ...state, isConnected: action.value, connectionError: action.value ? null : state.connectionError };
    case 'SET_ERROR':
      return { ...state, connectionError: action.message };
    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function makeOrderNotification(record: any): Notification {
  const total = record.total ?? 0;
  const isLarge = total >= 10_000;
  if (isLarge) {
    return {
      id: `analytics_milestone-${record.id}`,
      type: 'analytics_milestone',
      title: 'Large Order Placed',
      message: `Order #${(record.id as string).slice(0, 8).toUpperCase()} worth KES ${total.toLocaleString('en-KE')} was just placed.`,
      read: false,
      timestamp: new Date(record.created_at ?? Date.now()),
      data: { value: `KES ${total.toLocaleString('en-KE')}`, type: 'large_order', orderId: record.id },
    };
  }
  return {
    id: `order_update-${record.id}`,
    type: 'order_update',
    title: 'New Order Received',
    message: `Order #${(record.id as string).slice(0, 8).toUpperCase()} — KES ${total.toLocaleString('en-KE')} (${(record.status ?? 'pending').toUpperCase()})`,
    read: false,
    timestamp: new Date(record.created_at ?? Date.now()),
    data: { total, status: record.status, orderId: record.id },
  };
}

function makeUserNotification(record: any): Notification {
  return {
    id: `new_user-${record.id}`,
    type: 'new_user',
    title: 'New User Registered',
    message: `${record.email ?? 'A new user'} joined as ${record.role ?? 'customer'}.`,
    read: false,
    timestamp: new Date(record.created_at ?? Date.now()),
    data: { role: record.role, email: record.email },
  };
}

function makeStockNotification(record: any): Notification {
  const outOfStock = (record.stock ?? 0) === 0;
  return {
    id: `low_stock-${record.id}-${record.stock}`,
    type: 'low_stock',
    title: outOfStock ? 'Product Out of Stock' : 'Low Stock Alert',
    message: outOfStock
      ? `"${record.name ?? 'A product'}" is completely out of stock.`
      : `"${record.name ?? 'A product'}" has only ${record.stock} unit${record.stock === 1 ? '' : 's'} remaining.`,
    read: false,
    timestamp: new Date(),
    data: { stock: record.stock, productId: record.id, productName: record.name },
  };
}

// ── Seed: fetch the most recent records on mount ──────────────────────────────
async function fetchInitialNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = [];

  try {
    // Recent orders (last 10)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    orders?.forEach(o => notifications.push(makeOrderNotification(o)));

    // Recent users (last 5)
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    users?.forEach(u => notifications.push(makeUserNotification(u)));

    // Low stock products (stock <= 5)
    const { data: lowStock } = await supabase
      .from('products')
      .select('id, name, stock')
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(10);

    lowStock?.forEach(p => notifications.push(makeStockNotification(p)));
  } catch (err) {
    console.error('[useRealTimeNotifications] seed fetch error:', err);
  }

  // Sort newest first before returning
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRealTimeNotifications(): UseRealTimeNotificationsReturn {
  const [state, dispatch] = useReducer(reducer, {
    notifications: [],
    isConnected: false,
    connectionError: null,
  });

  // Keep a stable ref to dispatch so channel callbacks never become stale
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Setup realtime channel ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1. Seed with initial data
    fetchInitialNotifications().then(seed => {
      if (isMounted) dispatchRef.current({ type: 'SEED', payload: seed });
    });

    // 2. Subscribe to realtime
    const channel = supabase
      .channel('admin-notifications', {
        config: { broadcast: { ack: true } },
      })

      // ── New orders ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        ({ new: record }) => {
          dispatchRef.current({ type: 'ADD', payload: makeOrderNotification(record) });
        }
      )

      // ── Order status updates ────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        ({ new: record }) => {
          const n: Notification = {
            id: `order_update-${record.id}-${record.status}-${Date.now()}`,
            type: 'order_update',
            title: 'Order Status Updated',
            message: `Order #${(record.id as string).slice(0, 8).toUpperCase()} changed to ${(record.status ?? '').toUpperCase()}.`,
            read: false,
            timestamp: new Date(),
            data: { total: record.total, status: record.status, orderId: record.id },
          };
          dispatchRef.current({ type: 'ADD', payload: n });
        }
      )

      // ── New users ───────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        ({ new: record }) => {
          dispatchRef.current({ type: 'ADD', payload: makeUserNotification(record) });
        }
      )

      // ── Product stock changes (low stock / out of stock) ────────────────────
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        ({ new: record }) => {
          if ((record.stock ?? Infinity) <= 5) {
            dispatchRef.current({ type: 'ADD', payload: makeStockNotification(record) });
          }
        }
      )

      .subscribe((status, err) => {
        if (!isMounted) return;

        if (status === 'SUBSCRIBED') {
          dispatchRef.current({ type: 'SET_CONNECTED', value: true });
          dispatchRef.current({ type: 'SET_ERROR', message: null });
        } else if (status === 'CHANNEL_ERROR') {
          dispatchRef.current({ type: 'SET_CONNECTED', value: false });
          dispatchRef.current({
            type: 'SET_ERROR',
            message: err?.message ?? 'Realtime channel error. Reconnecting…',
          });
        } else if (status === 'TIMED_OUT') {
          dispatchRef.current({ type: 'SET_CONNECTED', value: false });
          dispatchRef.current({ type: 'SET_ERROR', message: 'Connection timed out. Reconnecting…' });
        } else if (status === 'CLOSED') {
          dispatchRef.current({ type: 'SET_CONNECTED', value: false });
        }
      });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────
  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_READ', id });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return {
    notifications: state.notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
  };
}
