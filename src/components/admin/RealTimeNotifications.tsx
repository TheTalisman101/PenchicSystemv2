import React, {
  useState, useRef, useEffect,
  useMemo, useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import {
  Bell, AlertCircle, Info, Clock, X,
  Users, ShoppingCart, Package, AlertTriangle, TrendingUp, CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeNotifications, type Notification } from '../../hooks/useRealTimeNotifications';

// ── Constants ──────────────────────────────────────────────────────────────────
const NOTIF_CFG: Record<string, {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
  unreadBg: string;
}> = {
  new_user:            { Icon: Users,         color: 'text-sky-500',     unreadBg: 'bg-sky-50 border-l-sky-400'         },
  order_update:        { Icon: ShoppingCart,  color: 'text-emerald-500', unreadBg: 'bg-emerald-50 border-l-emerald-400' },
  low_stock:           { Icon: Package,       color: 'text-amber-500',   unreadBg: 'bg-amber-50 border-l-amber-400'     },
  system_alert:        { Icon: AlertTriangle, color: 'text-red-500',     unreadBg: 'bg-red-50 border-l-red-400'         },
  analytics_milestone: { Icon: TrendingUp,    color: 'text-violet-500',  unreadBg: 'bg-violet-50 border-l-violet-400'  },
  content_submission:  { Icon: Info,          color: 'text-indigo-500',  unreadBg: 'bg-indigo-50 border-l-indigo-400'  },
};
const FALLBACK_CFG = { Icon: Info, color: 'text-neutral-500', unreadBg: 'bg-neutral-50 border-l-neutral-300' };

const PRIORITY: Record<string, number> = {
  system_alert: 1, low_stock: 2, order_update: 3, analytics_milestone: 4, new_user: 5,
};

const CATEGORY_DEFS = [
  { id: 'all',                 label: 'All'       },
  { id: 'system_alert',        label: 'System'    },
  { id: 'order_update',        label: 'Orders'    },
  { id: 'low_stock',           label: 'Stock'     },
  { id: 'new_user',            label: 'Users'     },
  { id: 'analytics_milestone', label: 'Analytics' },
] as const;

type CategoryId = typeof CATEGORY_DEFS[number]['id'];

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatTimeAgo = (date: Date): string => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

// ── NotificationBadge ─────────────────────────────────────────────────────────
const NotificationBadge: React.FC<{ n: Notification }> = ({ n }) => {
  const { type, data } = n;
  if (!data) return null;

  if (type === 'order_update' && data.total != null)
    return (
      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
        KES {data.total.toLocaleString()}
      </span>
    );

  if (type === 'low_stock' && data.stock != null)
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        data.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {data.stock === 0 ? 'Out of stock' : `${data.stock} units`}
      </span>
    );

  if (type === 'new_user' && data.role)
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
        data.role === 'admin'  ? 'bg-violet-100 text-violet-700' :
        data.role === 'worker' ? 'bg-sky-100 text-sky-700'       :
                                  'bg-emerald-100 text-emerald-700'
      }`}>
        {data.role}
      </span>
    );

  if (type === 'analytics_milestone' && data.value)
    return (
      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">
        {data.type === 'large_order' ? 'Large Order' : data.value}
      </span>
    );

  return null;
};

// ── NotificationItem ──────────────────────────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  index: number;
  onMarkRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = React.memo(
  ({ notification: n, index, onMarkRead }) => {
    const cfg  = NOTIF_CFG[n.type] ?? FALLBACK_CFG;
    const Icon = cfg.Icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.25) }}
        role="listitem"
        onClick={() => onMarkRead(n.id)}
        className={`relative px-4 sm:px-5 py-3.5 sm:py-4 border-l-[3px] cursor-pointer transition-all group ${
          n.read
            ? 'bg-white hover:bg-neutral-50/60 active:bg-neutral-50 border-l-transparent'
            : `${cfg.unreadBg} hover:brightness-[0.98] active:brightness-[0.97]`
        }`}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Icon */}
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            n.read ? 'bg-neutral-100' : 'bg-white/80'
          }`}>
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${cfg.color}`} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">{n.title}</p>
              {!n.read && <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full flex-shrink-0" />}
            </div>

            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
              {n.message}
            </p>

            {n.data && (
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 flex-wrap">
                <NotificationBadge n={n} />
              </div>
            )}

            <div className="flex items-center justify-between mt-2 sm:mt-2.5">
              <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(n.timestamp)}
              </div>
              {!n.read && (
                <button
                  onClick={e => { e.stopPropagation(); onMarkRead(n.id); }}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900
                    px-2 py-0.5 rounded-md hover:bg-black/5 active:bg-black/10 transition-all
                    md:opacity-0 md:group-hover:opacity-100"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);
NotificationItem.displayName = 'NotificationItem';

// ── PanelContent ──────────────────────────────────────────────────────────────
interface PanelContentProps {
  notifications: Notification[];
  filtered: Notification[];
  categoryCounts: Record<string, number>;
  unreadCount: number;
  selectedCategory: CategoryId;
  showUnreadOnly: boolean;
  isConnected: boolean;
  connectionError: string | null;
  onClose: () => void;
  onSelectCategory: (id: CategoryId) => void;
  onToggleUnread: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const PanelContent: React.FC<PanelContentProps> = ({
  notifications, filtered, categoryCounts, unreadCount,
  selectedCategory, showUnreadOnly, isConnected, connectionError,
  onClose, onSelectCategory, onToggleUnread, onMarkRead, onMarkAllRead, onClearAll,
}) => (
  <>
    {/* Header */}
    <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4 border-b border-neutral-100 flex-shrink-0">
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread · ` : 'All caught up · '}
            {notifications.length} total
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
            isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div
        role="tablist"
        aria-label="Notification categories"
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 mb-3
          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATEGORY_DEFS.map(cat => {
          const count  = cat.id === 'all' ? notifications.length : (categoryCounts[cat.id] ?? 0);
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg
                text-[11px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300'
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleUnread}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors ${
            showUnreadOnly
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          Unread only
        </button>
        <div className="flex items-center gap-1 sm:gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900
                px-2 sm:px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClearAll}
            className="text-xs font-semibold text-red-600 hover:text-red-700
              px-2 sm:px-2.5 py-1.5 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>

    {/* Connection error — animated in/out */}
    <AnimatePresence>
      {connectionError && (
        <motion.div
          key="conn-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden flex-shrink-0"
        >
          <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3
            bg-amber-50 border-b border-amber-200 text-xs text-amber-800 font-medium"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {connectionError}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Notification list */}
    <div className="flex-1 overflow-y-auto divide-y divide-neutral-100" role="list">
      {filtered.length > 0 ? (
        filtered.map((n, idx) => (
          <NotificationItem
            key={n.id}
            notification={n}
            index={idx}
            onMarkRead={onMarkRead}
          />
        ))
      ) : (
        <div className="flex flex-col items-center gap-2.5 sm:gap-3 py-10 sm:py-14 px-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-neutral-700">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {showUnreadOnly
                ? 'All caught up — toggle off to see all'
                : 'New notifications will appear here in real time'}
            </p>
          </div>
          {showUnreadOnly && (
            <button
              onClick={onToggleUnread}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900
                px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 active:bg-neutral-100 rounded-lg transition-all"
            >
              Show all
            </button>
          )}
        </div>
      )}
    </div>

    {/* Footer */}
    {notifications.length > 0 && (
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3
        border-t border-neutral-100 bg-neutral-50/50 flex-shrink-0"
      >
        <p className="text-[11px] text-neutral-400">
          <span className="font-semibold text-neutral-600">{filtered.length}</span> of {notifications.length} shown
        </p>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-[11px] font-medium ${isConnected ? 'text-emerald-600' : 'text-red-500'}`}>
            {isConnected ? 'Live updates' : 'Reconnecting…'}
          </span>
        </div>
      </div>
    )}
  </>
);

// ── RealTimeNotifications ─────────────────────────────────────────────────────
const RealTimeNotifications: React.FC = () => {
  const [isOpen,           setIsOpen]           = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [showUnreadOnly,   setShowUnreadOnly]   = useState(false);
  const [isMobile,         setIsMobile]         = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications, unreadCount,
    markAsRead, markAllAsRead, clearAll,
    isConnected, connectionError,
  } = useRealTimeNotifications();

  // ── Viewport tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Outside click (desktop only) ───────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isMobile]);

  // ── Derived (memoized) ─────────────────────────────────────────────────────
  const categoryCounts = useMemo(
    () => notifications.reduce<Record<string, number>>((acc, n) => {
      acc[n.type] = (acc[n.type] ?? 0) + 1;
      return acc;
    }, {}),
    [notifications]
  );

  const filtered = useMemo(
    () =>
      notifications
        .filter(n =>
          (selectedCategory === 'all' || n.type === selectedCategory) &&
          (!showUnreadOnly || !n.read)
        )
        .sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          const pd = (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99);
          if (pd !== 0) return pd;
          return b.timestamp.getTime() - a.timestamp.getTime();
        }),
    [notifications, selectedCategory, showUnreadOnly]
  );

  // ── Stable callbacks ───────────────────────────────────────────────────────
  const close          = useCallback(() => setIsOpen(false), []);
  const toggleOpen     = useCallback(() => setIsOpen(v => !v), []);
  const toggleUnread   = useCallback(() => setShowUnreadOnly(v => !v), []);
  const selectCategory = useCallback((id: CategoryId) => setSelectedCategory(id), []);

  const panelProps: PanelContentProps = {
    notifications, filtered, categoryCounts, unreadCount,
    selectedCategory, showUnreadOnly, isConnected, connectionError,
    onClose: close, onSelectCategory: selectCategory,
    onToggleUnread: toggleUnread, onMarkRead: markAsRead,
    onMarkAllRead: markAllAsRead, onClearAll: clearAll,
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell button */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={toggleOpen}
          aria-label="Notifications"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-neutral-100 active:bg-neutral-200
            transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06]"
        >
          <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-neutral-600" />

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px]
                  bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full
                  flex items-center justify-center px-1 leading-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Connection dot */}
          <span className={`absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5
            w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border-2 border-white ${
            isConnected ? 'bg-emerald-500' : 'bg-red-400'
          }`} />
        </motion.button>

        {/* Desktop dropdown */}
        <AnimatePresence>
          {isOpen && !isMobile && (
            <motion.div
              key="desktop-panel"
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="absolute top-full right-0 mt-2.5 w-96 bg-white border border-neutral-200
                rounded-2xl shadow-2xl shadow-neutral-900/10 z-50 max-h-[85vh] flex flex-col overflow-hidden"
            >
              <PanelContent {...panelProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/*
        Mobile portal: escapes the header's backdrop-filter stacking context so
        position:fixed children are constrained to the viewport, not the header.
      */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <AnimatePresence>
            {isOpen && isMobile && (
              <motion.div
                key="mobile-backdrop"
                aria-hidden="true"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[49]"
                onClick={close}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen && isMobile && (
              <motion.div
                key="mobile-sheet"
                role="dialog"
                aria-label="Notifications"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                  <div className="w-8 h-1 bg-neutral-200 rounded-full" />
                </div>
                <PanelContent {...panelProps} />
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
};

export default RealTimeNotifications;
