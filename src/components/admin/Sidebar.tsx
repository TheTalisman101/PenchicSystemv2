import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Users,
  BarChart3,
  Settings,
  Store,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Package2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

// ── Nav config ─────────────────────────────────────────────────────────────────
// Grouped sections improve scannability in long nav lists
const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin',           exact: true },
      { icon: BarChart3,       label: 'Analytics', path: '/admin/analytics'              },
    ],
  },
  {
    id: 'store',
    label: 'Store',
    items: [
      { icon: Package,      label: 'Products',          path: '/admin/products'          },
      { icon: ShoppingCart, label: 'Orders',             path: '/admin/orders'            },
      { icon: Tag,          label: 'Discounts & Offers', path: '/admin/discounts'         },
      { icon: Package2,     label: 'Stock',              path: '/admin/stock-management'  },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { icon: Users,    label: 'Users',    path: '/admin/users'    },
      { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ],
  },
] as const;

// ── Tooltip (shared for collapsed items) ──────────────────────────────────────
const CollapseTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute left-full ml-3 z-50 pointer-events-none">
    <div className="
      opacity-0 invisible translate-x-1
      group-hover:opacity-100 group-hover:visible group-hover:translate-x-0
      transition-all duration-150
      px-3 py-2 bg-neutral-900 text-white rounded-lg shadow-lg whitespace-nowrap
    ">
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-neutral-900 rotate-45 rounded-sm" />
      {children}
    </div>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user      = useStore((s) => s.user);
  const setUser   = useStore((s) => s.setUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? 'A';

  return (
    // Note: The mobile backdrop overlay lives in AdminLayout — no duplicate here.
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 264 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={[
        // Mobile: fixed, positioned below header; Desktop: static, full height
        'fixed lg:static left-0 top-16 lg:top-0',
        'h-[calc(100vh-4rem)] lg:h-screen',
        'bg-white border-r border-neutral-200/80',
        'z-50 lg:z-auto flex flex-col overflow-hidden',
        'shadow-xl lg:shadow-none',
        // Mobile slide — CSS transition only on mobile (lg:transition-none avoids conflict with Framer Motion width)
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        'transition-transform duration-300 ease-in-out lg:transition-none',
      ].join(' ')}
    >

      {/* ── Brand header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 h-16 lg:h-[72px] border-b border-neutral-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark — always visible */}
          <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>

          {/* Brand name — fades with expansion */}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                key="brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="text-base font-bold text-neutral-900 tracking-tight whitespace-nowrap"
              >
                Penchic
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: close */}
        <button
          onClick={onMobileToggle}
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop: collapse (only shown when expanded) */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.button
              key="collapse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: expand button (collapsed state) */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:flex justify-center py-2.5 border-b border-neutral-100 flex-shrink-0"
          >
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.id} className={gi > 0 ? 'mt-1' : ''}>

            {/* Section label — expanded only */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  key={`lbl-${group.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 whitespace-nowrap select-none"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Collapsed: thin divider instead of label */}
            {isCollapsed && gi > 0 && (
              <div className="mx-3 my-2.5 border-t border-neutral-100" />
            )}

            {/* Items */}
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.path, item.exact);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      // Close mobile drawer on nav
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        onMobileToggle();
                      }
                    }}
                    className={[
                      'relative group flex items-center gap-3 rounded-xl min-h-[40px]',
                      'transition-all duration-150',
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                      active
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/90',
                    ].join(' ')}
                  >
                    {/* Shared active indicator — slides between items via layoutId */}
                    {active && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl bg-primary -z-[1]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    {/* Icon */}
                    <Icon
                      className={[
                        'flex-shrink-0 transition-transform duration-150',
                        isCollapsed ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]',
                        !active && 'group-hover:scale-110',
                      ].join(' ')}
                    />

                    {/* Label */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          key={`span-${item.path}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-medium whitespace-nowrap leading-none"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip (collapsed only) */}
                    {isCollapsed && (
                      <CollapseTooltip>
                        <span className="text-xs font-medium">{item.label}</span>
                      </CollapseTooltip>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-neutral-100 p-2 space-y-0.5">

        {/* User info row */}
        <div className={[
          'relative group flex items-center gap-3 rounded-xl px-3 py-2.5',
          'hover:bg-neutral-50 transition-colors',
          isCollapsed ? 'justify-center px-2' : '',
        ].join(' ')}>

          {/* Gradient avatar with initials */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-900 flex items-center justify-center ring-2 ring-white shadow-sm flex-shrink-0">
            <span className="text-white text-[11px] font-semibold leading-none">{userInitial}</span>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-neutral-800 truncate leading-none">
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5" title={user?.email}>
                  {user?.email}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isCollapsed && (
            <CollapseTooltip>
              <p className="text-xs font-semibold">
                {user?.role === 'admin' ? 'Administrator' : 'User'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{user?.email}</p>
            </CollapseTooltip>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={[
            'relative group w-full flex items-center gap-3 rounded-xl px-3 py-2.5',
            'text-neutral-400 hover:text-red-600 hover:bg-red-50/80',
            'transition-all duration-150 disabled:opacity-40',
            isCollapsed ? 'justify-center px-2' : '',
          ].join(' ')}
        >
          <LogOut className={[
            'flex-shrink-0 transition-transform duration-150',
            isCollapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4',
            'group-hover:scale-110 group-hover:-translate-x-0.5',
          ].join(' ')} />

          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                key="logout-label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </motion.span>
            )}
          </AnimatePresence>

          {isCollapsed && (
            <CollapseTooltip>
              <span className="text-xs font-medium">
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </span>
            </CollapseTooltip>
          )}
        </button>
      </div>

    </motion.aside>
  );
};

export default Sidebar;
