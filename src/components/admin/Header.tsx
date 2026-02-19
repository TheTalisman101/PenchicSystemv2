import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, Menu, Sun, Moon, User, Settings, LogOut, X,
  ChevronDown, Package, Users, ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import RealTimeNotifications from './RealTimeNotifications';

// ── Types ──────────────────────────────────────────────────────────────────────
interface HeaderProps {
  onMobileMenuToggle: () => void;
  title?: string;
  subtitle?: string;
}
interface SearchResult {
  id: string;
  type: 'order' | 'user' | 'product';
  title: string;
  subtitle: string;
  url: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  order:   { label: 'Orders',   Icon: Package,    iconCls: 'text-sky-500',     bgCls: 'bg-sky-50'     },
  user:    { label: 'Users',    Icon: Users,      iconCls: 'text-violet-500',  bgCls: 'bg-violet-50'  },
  product: { label: 'Products', Icon: ShoppingBag,iconCls: 'text-emerald-500', bgCls: 'bg-emerald-50' },
} as const;

const groupByType = (results: SearchResult[]) =>
  results.reduce((acc, r) => { (acc[r.type] ??= []).push(r); return acc; }, {} as Record<string, SearchResult[]>);

const dropdownVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: -6 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 420, damping: 30 } },
  exit:    { opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.14, ease: 'easeIn' } },
};

// ── Shared search results body ─────────────────────────────────────────────────
const SearchResultsContent: React.FC<{
  isSearching: boolean;
  searchQuery: string;
  groupedResults: Record<string, SearchResult[]>;
  onResultClick: (url: string) => void;
  compact?: boolean;
}> = ({ isSearching, searchQuery, groupedResults, onResultClick, compact }) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-neutral-400">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        <span className="text-xs font-medium">Searching…</span>
      </div>
    );
  }

  if (Object.keys(groupedResults).length > 0) {
    return (
      <div className={`py-1.5 ${compact ? '' : 'max-h-80'} overflow-y-auto`}>
        {(Object.entries(groupedResults) as [keyof typeof TYPE_CONFIG, SearchResult[]][]).map(([type, items]) => {
          const { label, Icon, iconCls, bgCls } = TYPE_CONFIG[type];
          return (
            <div key={type} className="mb-1 last:mb-0">
              <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                <Icon className={`w-3 h-3 ${iconCls}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
              </div>
              {items.map(result => (
                <button
                  key={result.id}
                  onClick={() => onResultClick(result.url)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors group"
                >
                  <div className={`w-7 h-7 rounded-lg ${bgCls} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 group-hover:text-neutral-900 truncate">{result.title}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
        {!compact && (
          <div className="border-t border-neutral-100 px-3 py-2 mt-0.5">
            <p className="text-[10px] text-neutral-400 text-center">
              <kbd className="px-1 py-0.5 bg-neutral-100 rounded font-mono text-neutral-500">↵</kbd>
              {' '}to open ·{' '}
              <kbd className="px-1 py-0.5 bg-neutral-100 rounded font-mono text-neutral-500">Esc</kbd>
              {' '}to dismiss
            </p>
          </div>
        )}
      </div>
    );
  }

  if (searchQuery.length >= 2) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-8">
        <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center mb-0.5">
          <Search className="w-4 h-4 text-neutral-400" />
        </div>
        <p className="text-sm font-medium text-neutral-600">No results found</p>
        <p className="text-xs text-neutral-400">Try adjusting your search term</p>
      </div>
    );
  }

  // Empty prompt for mobile overlay
  if (compact) {
    return (
      <div className="px-4 py-5">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Search across</p>
        <div className="space-y-2">
          {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(
            ([type, { label, Icon, iconCls, bgCls }]) => (
              <div key={type} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${bgCls}`}>
                <Icon className={`w-4 h-4 ${iconCls}`} />
                <span className="text-sm font-medium text-neutral-700">{label}</span>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle, title, subtitle }) => {
  const [isDarkMode,        setIsDarkMode]        = useState(false);
  const [showAccountMenu,   setShowAccountMenu]   = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch,  setShowMobileSearch]  = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [searchResults,     setSearchResults]     = useState<SearchResult[]>([]);
  const [isSearching,       setIsSearching]       = useState(false);
  const [searchFocused,     setSearchFocused]     = useState(false);

  const user    = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const navigate = useNavigate();

  const accountRef     = useRef<HTMLDivElement>(null);
  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // ── Outside click ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setShowAccountMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── ⌘K / Escape ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setSearchFocused(false);
        setShowMobileSearch(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Auto-focus mobile input ───────────────────────────────────────────────────
  useEffect(() => {
    if (showMobileSearch) {
      requestAnimationFrame(() => mobileInputRef.current?.focus());
    } else {
      clearSearch();
    }
  }, [showMobileSearch]);

  // ── Search ───────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const [{ data: orders }, { data: users }, { data: products }] = await Promise.all([
        supabase.from('orders').select('id, total, profiles!inner(email)').ilike('id', `%${query}%`).limit(3),
        supabase.from('profiles').select('id, email, role').ilike('email', `%${query}%`).limit(3),
        supabase.from('products').select('id, name, category').or(`name.ilike.%${query}%,category.ilike.%${query}%`).limit(3),
      ]);
      const results: SearchResult[] = [
        ...(orders ?? []).map(o => ({
          id: o.id, type: 'order' as const,
          title: `Order #${o.id.slice(0, 8)}`,
          subtitle: `KES ${o.total.toLocaleString()} · ${o.profiles?.email ?? 'Unknown'}`,
          url: '/admin/orders',
        })),
        ...(users ?? []).map(u => ({
          id: u.id, type: 'user' as const,
          title: u.email, subtitle: `Role: ${u.role}`, url: '/admin/users',
        })),
        ...(products ?? []).map(p => ({
          id: p.id, type: 'product' as const,
          title: p.name, subtitle: `Category: ${p.category}`, url: '/admin/products',
        })),
      ];
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleResultClick = (url: string) => {
    navigate(url);
    clearSearch();
    setShowSearchResults(false);
    setShowMobileSearch(false);
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const userInitial    = user?.email?.charAt(0).toUpperCase() ?? 'A';
  const groupedResults = groupByType(searchResults);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="
        sticky top-0 z-40
        bg-white/80 backdrop-blur-xl
        border-b border-neutral-200/70
        shadow-[0_1px_4px_0_rgb(0,0,0,0.05)]
        px-3 sm:px-4 lg:px-6
      ">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* ── Left ─────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && (
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900 leading-none">{title}</h1>
                {subtitle && <p className="text-xs text-neutral-400 font-medium mt-1">{subtitle}</p>}
              </div>
            )}
          </div>

          {/* ── Right ────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5 sm:gap-1.5">

            {/* Desktop search */}
            <div className="relative hidden md:block" ref={searchRef}>
              <motion.div
                animate={{ width: searchFocused ? 300 : 224 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => { setSearchFocused(true); if (searchQuery.length >= 2) setShowSearchResults(true); }}
                  className="
                    w-full pl-9 pr-14 py-[7px] text-sm rounded-lg
                    bg-neutral-100 border border-transparent
                    placeholder:text-neutral-400 text-neutral-800
                    focus:outline-none focus:bg-white focus:border-neutral-200/80
                    focus:ring-2 focus:ring-neutral-900/[0.06] focus:shadow-sm
                    transition-all duration-200
                  "
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery ? (
                    <button onClick={clearSearch} className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-[3px] rounded-md border border-neutral-300/70 bg-neutral-200/70 text-[10px] font-medium text-neutral-400">
                      <span className="text-[11px] leading-none">⌘</span>K
                    </kbd>
                  )}
                </div>
              </motion.div>

              {/* Desktop results dropdown */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full mt-2 left-0 w-80 bg-white border border-neutral-200/80 rounded-xl shadow-xl shadow-neutral-900/[0.07] z-50 overflow-hidden"
                  >
                    <SearchResultsContent
                      isSearching={isSearching}
                      searchQuery={searchQuery}
                      groupedResults={groupedResults}
                      onResultClick={handleResultClick}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile search trigger */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.span key="sun"
                    initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0,   scale: 1   }}
                    exit={{    opacity: 0, rotate:  45, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Sun className="w-[18px] h-[18px]" />
                  </motion.span>
                ) : (
                  <motion.span key="moon"
                    initial={{ opacity: 0, rotate:  45, scale: 0.7 }}
                    animate={{ opacity: 1, rotate:  0,  scale: 1   }}
                    exit={{    opacity: 0, rotate: -45, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Moon className="w-[18px] h-[18px]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notifications */}
            <RealTimeNotifications />

            {/* ── Account menu ─────────────────────────────────────────────── */}
            <div className="relative" ref={accountRef}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-1.5 pr-1.5 sm:pr-2.5 py-1.5 rounded-xl
                  hover:bg-neutral-100 active:bg-neutral-200 transition-all duration-200
                  ${showAccountMenu ? 'bg-neutral-100' : ''}
                `}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-neutral-600 to-neutral-900 ring-2 ring-white shadow-sm">
                  <span className="text-white text-xs font-semibold">{userInitial}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-neutral-800 leading-none">
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[7rem] truncate">{user?.email}</p>
                </div>
                <motion.div
                  animate={{ rotate: showAccountMenu ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden sm:block"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full right-0 mt-2 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] bg-white border border-neutral-200/80 rounded-xl shadow-xl shadow-neutral-900/[0.07] z-50 overflow-hidden"
                  >
                    <div className="px-3.5 sm:px-4 py-3 sm:py-3.5 bg-neutral-50/90 border-b border-neutral-100">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-neutral-600 to-neutral-900 ring-2 ring-white shadow-sm">
                          <span className="text-white text-xs sm:text-sm font-semibold">{userInitial}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">{user?.email}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md bg-neutral-200 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                            {user?.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {([
                        { Icon: User,     label: 'Profile Settings', path: '/admin/settings' },
                        { Icon: Settings, label: 'Preferences',      path: '/admin/settings' },
                      ] as const).map(({ Icon, label, path }) => (
                        <button
                          key={label}
                          onClick={() => { navigate(path); setShowAccountMenu(false); }}
                          className="w-full flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 rounded-lg text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded-md bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center transition-colors flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                          <span className="text-sm font-medium text-neutral-700">{label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-neutral-100 p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 rounded-lg text-left hover:bg-red-50 active:bg-red-100 transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-md bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0">
                          <LogOut className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <span className="text-sm font-medium text-red-600">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </header>

      {/*
        ── Mobile search overlay — portaled to document.body ──────────────────────
        WHY: The <header> has backdrop-blur-xl which sets backdrop-filter: blur().
        This creates a new CSS containing block, so position:fixed children are
        anchored to the header (top of screen) instead of the viewport.
        Portaling to document.body escapes this stacking context entirely.
      */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              key="mobile-search"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              className="fixed inset-0 z-50 bg-white flex flex-col md:hidden"
            >
              {/* Search bar */}
              <div className="flex items-center gap-2.5 px-3 py-3 border-b border-neutral-200 bg-white flex-shrink-0">
                <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Search orders, users, products…"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 active:bg-neutral-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-800 active:text-neutral-900 transition-colors ml-1 flex-shrink-0"
                  aria-label="Close search"
                >
                  Cancel
                </button>
              </div>

              {/* Results / prompt */}
              <div className="flex-1 overflow-y-auto">
                <SearchResultsContent
                  isSearching={isSearching}
                  searchQuery={searchQuery}
                  groupedResults={groupedResults}
                  onResultClick={handleResultClick}
                  compact
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Header;
