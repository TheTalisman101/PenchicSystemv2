import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart, User, Menu, X,
  Leaf, LogOut, ChevronDown, LayoutDashboard, Package, Store,
} from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// ── Sub-components ─────────────────────────────────────────────────────────────
const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode }> = ({ to, active, children }) => (
  <Link
    to={to}
    className={`
      flex items-center gap-1.5 px-3 py-[7px] rounded-[9px]
      text-[13px] font-medium whitespace-nowrap border
      transition-all duration-[180ms] ease-out
      ${active
        ? 'text-[#74c69d] bg-[rgba(116,198,157,0.13)] border-[rgba(116,198,157,0.15)] font-semibold'
        : 'text-white/65 border-transparent hover:text-white hover:bg-white/10'
      }
    `}
  >
    {children}
  </Link>
);

const Pill: React.FC<{ variant: 'admin' | 'worker' }> = ({ variant }) => (
  <span className={`
    text-[9px] font-extrabold px-1.5 py-[2px] rounded-[5px] tracking-[0.8px] uppercase leading-[1.4]
    ${variant === 'admin' ? 'bg-[rgba(251,191,36,0.15)] text-[#fbbf24]' : 'bg-[rgba(116,198,157,0.15)] text-[#74c69d]'}
  `}>
    {variant === 'admin' ? 'Admin' : 'Staff'}
  </span>
);

const MobileNavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode }> = ({ to, active, children }) => (
  <Link
    to={to}
    className={`
      flex items-center gap-[11px] px-3.5 py-3 rounded-[11px] min-h-[48px]
      text-[14px] font-medium border transition-all duration-150
      ${active
        ? 'text-[#74c69d] bg-[rgba(116,198,157,0.09)] border-[rgba(116,198,157,0.13)] font-semibold'
        : 'text-white/60 border-transparent hover:text-white/90 hover:bg-white/[0.07] active:bg-white/10'
      }
    `}
  >
    {children}
  </Link>
);

const DropdownItem: React.FC<{
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ to, onClick, danger, children }) => {
  const cls = `
    flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] min-h-[40px]
    text-[13px] font-medium text-left cursor-pointer
    transition-all duration-150
    ${danger
      ? 'text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] hover:text-[#ef4444] active:bg-[rgba(248,113,113,0.15)]'
      : 'text-white/62 hover:bg-white/[0.07] hover:text-white/92 active:bg-white/10'
    }
  `;
  if (to) return <Link to={to} className={cls} onClick={onClick}>{children}</Link>;
  return (
    <button
      className={cls}
      onClick={onClick}
      style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif" }}
    >
      {children}
    </button>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [dropdownPos,  setDropdownPos]  = useState({ top: 0, right: 0 });

  const userBtnRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location    = useLocation();

  const user    = useStore(s => s.user);
  const cart    = useStore(s => s.cart);
  const setUser = useStore(s => s.setUser);

  const cartQty = cart.reduce((a, i) => a + i.quantity, 0);
  const isAdmin = user?.role === 'admin';
  const isStaff = ['admin', 'worker'].includes(user?.role ?? '');

  const displayName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '';
  const initials  = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = isAdmin ? 'Admin' : user?.role === 'worker' ? 'Worker' : 'Customer';
  const roleDot   = isAdmin ? '#fbbf24' : user?.role === 'worker' ? '#74c69d' : '#a0b8aa';

  // ── Scroll ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ── Close dropdown on scroll ──────────────────────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return;
    const fn = () => setDropdownOpen(false);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [dropdownOpen]);

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        userBtnRef.current  && !userBtnRef.current.contains(target)
      ) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Close on route change ─────────────────────────────────────────────────────
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // ── Open dropdown + compute portal position ───────────────────────────────────
  const handleUserBtn = () => {
    if (userBtnRef.current) {
      const r = userBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
    }
    setDropdownOpen(v => !v);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        .nb-blur { backdrop-filter: blur(24px) saturate(1.6); -webkit-backdrop-filter: blur(24px) saturate(1.6); }
      `}</style>

      {/* Spacer */}
      <div className="h-[62px] no-print" />

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        className={`
          fixed top-0 inset-x-0 z-50 no-print border-b
          transition-[background-color,border-color,box-shadow] duration-[400ms]
          [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]
          ${scrolled
            ? 'nb-blur bg-[rgba(10,31,22,0.35)] border-[rgba(116,198,157,0.1)] shadow-[0_4px_40px_rgba(0,0,0,0.25)]'
            : 'bg-[#0a1f16] border-white/[0.06]'
          }
        `}
        style={{ fontFamily: "'DM Sans',sans-serif" }}
      >
        <div className="max-w-[1280px] mx-auto px-5 lg:px-9 h-[62px] flex items-center gap-2">

          {/* ── Logo ─────────────────────────────────────────────────────────── */}
          <Link to="/" className="group flex items-center gap-2.5 flex-shrink-0 mr-2 no-underline">
            <div className="
              w-[34px] h-[34px] rounded-[10px] flex-shrink-0
              bg-gradient-to-br from-[#52b788] to-[#2d6a4f]
              flex items-center justify-center
              shadow-[0_2px_10px_rgba(82,183,136,0.35)]
              transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              group-hover:-rotate-[8deg] group-hover:scale-110
              group-hover:shadow-[0_6px_20px_rgba(82,183,136,0.5)]
            ">
              <Leaf size={17} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div
                className="text-[17px] font-bold text-white leading-none tracking-[0.2px]"
                style={{ fontFamily: "'Playfair Display',serif" }}
              >
                Penchic
              </div>
              <span className="block text-[9px] font-semibold text-[#52b788] tracking-[2.5px] uppercase mt-px">
                Farm
              </span>
            </div>
          </Link>

          {/* ── Desktop links ─────────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            <NavLink to="/shop" active={isActive('/shop')}>
              <Store size={13} strokeWidth={2} /> Shop
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" active={isActive('/admin')}>
                <LayoutDashboard size={13} strokeWidth={2} /> Dashboard
                <Pill variant="admin" />
              </NavLink>
            )}
            {isStaff && (
              <NavLink to="/pos" active={isActive('/pos')}>
                <Package size={13} strokeWidth={2} /> POS
                {user?.role === 'worker' && <Pill variant="worker" />}
              </NavLink>
            )}
          </div>

          {/* Spacer — pushes hamburger right on mobile */}
          <div className="flex-1 md:hidden" />

          {/* ── Desktop actions ───────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">

            {/* Cart */}
            {isStaff && (
              <Link
                to="/cart"
                aria-label={`Cart (${cartQty} items)`}
                className={`
                  relative flex items-center justify-center
                  w-[38px] h-[38px] rounded-[10px] border
                  transition-all duration-[180ms]
                  ${isActive('/cart')
                    ? 'text-[#74c69d] border-[rgba(116,198,157,0.3)] bg-[rgba(116,198,157,0.1)]'
                    : 'text-white/70 border-white/[0.12] hover:text-white hover:bg-white/10 hover:border-white/20'
                  }
                `}
              >
                <ShoppingCart size={18} strokeWidth={1.8} />
                <AnimatePresence>
                  {cartQty > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-[9px] px-1 border-2 border-[#0a1f16] bg-[#52b788] text-[#0a1f16] text-[10px] font-extrabold flex items-center justify-center"
                    >
                      {cartQty > 99 ? '99+' : cartQty}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}

            {/* User button / Sign in */}
            {user ? (
              <button
                ref={userBtnRef}
                onClick={handleUserBtn}
                className={`
                  flex items-center gap-2 pl-[5px] pr-2.5 py-[5px]
                  rounded-[10px] border cursor-pointer
                  transition-all duration-[180ms]
                  ${dropdownOpen
                    ? 'border-[rgba(116,198,157,0.35)] bg-[rgba(116,198,157,0.1)]'
                    : 'bg-white/[0.07] border-white/[0.12] hover:bg-white/[0.12] hover:border-white/20'
                  }
                `}
                style={{ fontFamily: "'DM Sans',sans-serif" }}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#52b788] to-[#1b4332] flex items-center justify-center text-[11px] font-bold text-[#d8f3dc] flex-shrink-0 border border-white/10">
                  {initials || <User size={13} />}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[12.5px] font-semibold text-white/90 max-w-[88px] truncate leading-[1.3]">
                    {displayName}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-white/40 leading-none">
                    <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: roleDot }} />
                    {roleLabel}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/40 flex-shrink-0"
                >
                  <ChevronDown size={13} />
                </motion.div>
              </button>
            ) : (
              <Link
                to="/login"
                className="
                  inline-flex items-center gap-[7px] px-[18px] py-2 rounded-[10px]
                  bg-gradient-to-br from-[#52b788] to-[#2d6a4f] text-white
                  text-[13px] font-bold whitespace-nowrap no-underline
                  shadow-[0_3px_12px_rgba(45,106,79,0.4)]
                  transition-all duration-200
                  hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(45,106,79,0.5)]
                  active:translate-y-0
                "
              >
                <User size={14} /> Sign in
              </Link>
            )}
          </div>

          {/* ── Hamburger ─────────────────────────────────────────────────────── */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="
              md:hidden flex items-center justify-center flex-shrink-0
              w-[38px] h-[38px] rounded-[10px]
              border border-white/[0.14] text-white/75
              bg-transparent hover:bg-white/10 hover:text-white active:bg-white/15
              transition-all duration-[180ms]
            "
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={menuOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{   rotate:  90,  opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                {menuOpen ? <X size={17} /> : <Menu size={17} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* ── Mobile menu ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{   opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="nb-blur bg-[rgba(10,31,22,0.7)] border-t border-[rgba(116,198,157,0.1)] overflow-hidden"
            >
              <div
                className="px-3.5 pt-2.5 flex flex-col gap-0.5"
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
              >
                <MobileNavLink to="/shop" active={isActive('/shop')}>
                  <Store size={16} /> Shop
                </MobileNavLink>
                {isAdmin && (
                  <MobileNavLink to="/admin" active={isActive('/admin')}>
                    <LayoutDashboard size={16} /> Dashboard
                    <span className="ml-auto"><Pill variant="admin" /></span>
                  </MobileNavLink>
                )}
                {isStaff && (
                  <MobileNavLink to="/pos" active={isActive('/pos')}>
                    <Package size={16} /> POS Terminal
                  </MobileNavLink>
                )}
                {isStaff && (
                  <MobileNavLink to="/cart" active={isActive('/cart')}>
                    <ShoppingCart size={16} />
                    Cart
                    {cartQty > 0 && (
                      <span className="ml-auto bg-[rgba(116,198,157,0.15)] text-[#74c69d] rounded-[7px] text-[11px] font-extrabold px-[9px] py-0.5">
                        {cartQty}
                      </span>
                    )}
                  </MobileNavLink>
                )}

                <div className="h-px bg-white/[0.07] my-1.5 mx-0.5" />

                {user ? (
                  <>
                    {/* User card */}
                    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] mb-0.5">
                      <div className="w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#52b788] to-[#1b4332] flex items-center justify-center text-[14px] font-bold text-[#d8f3dc] flex-shrink-0">
                        {initials || <User size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-white/90 leading-[1.3] truncate">{displayName}</div>
                        <div className="text-[11px] text-white/38 truncate">{user.email}</div>
                      </div>
                      <span className={`
                        flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md
                        text-[10px] font-bold uppercase tracking-[0.5px]
                        ${isAdmin
                          ? 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border border-[rgba(251,191,36,0.2)]'
                          : user.role === 'worker'
                          ? 'bg-[rgba(116,198,157,0.12)] text-[#74c69d] border border-[rgba(116,198,157,0.2)]'
                          : 'bg-white/[0.06] text-white/45 border border-white/10'
                        }
                      `}>
                        {roleLabel}
                      </span>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="
                        flex items-center gap-[11px] px-3.5 py-3 rounded-[11px] min-h-[48px] w-full
                        text-[14px] font-medium text-[#f87171] bg-transparent border-none cursor-pointer
                        hover:bg-[rgba(248,113,113,0.08)] active:bg-[rgba(248,113,113,0.12)]
                        transition-colors duration-150
                      "
                      style={{ fontFamily: "'DM Sans',sans-serif" }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="
                      flex items-center justify-center gap-2 px-4 py-3.5 mt-1.5
                      rounded-[13px] min-h-[52px] no-underline
                      bg-gradient-to-br from-[#52b788] to-[#2d6a4f] text-white
                      text-[14px] font-bold
                      shadow-[0_4px_16px_rgba(45,106,79,0.3)]
                      active:opacity-90 transition-opacity
                    "
                  >
                    <User size={16} /> Sign in to your account
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/*
        ── User dropdown — portaled to document.body ───────────────────────────
        WHY: The <nav> applies backdrop-filter: blur() when scrolled, which
        creates a new CSS containing block. Any position:fixed child would be
        anchored to the nav (top of screen) instead of the viewport.
        Portaling to document.body escapes the stacking context entirely.
      */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit={{   opacity: 0, y: -10,  scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top:   dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 9999,
                fontFamily: "'DM Sans',sans-serif",
              }}
              className="w-[230px] bg-[#0d2419] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.55),0_4px_16px_rgba(0,0,0,0.3)]"
            >
              {/* Header */}
              <div className="px-4 py-3.5 bg-white/[0.03] border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#52b788] to-[#1b4332] flex items-center justify-center text-[13px] font-bold text-[#d8f3dc] flex-shrink-0">
                    {initials || <User size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-white/[0.92] truncate">{displayName}</div>
                    <div className="text-[11px] text-white/35 truncate">{user?.email}</div>
                  </div>
                </div>
                <span className={`
                  inline-flex items-center gap-[5px] mt-2 px-[9px] py-[3px] rounded-md
                  text-[10px] font-bold uppercase tracking-[0.5px]
                  ${isAdmin
                    ? 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border border-[rgba(251,191,36,0.2)]'
                    : user?.role === 'worker'
                    ? 'bg-[rgba(116,198,157,0.12)] text-[#74c69d] border border-[rgba(116,198,157,0.2)]'
                    : 'bg-white/[0.06] text-white/45 border border-white/10'
                  }
                `}>
                  <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: roleDot }} />
                  {roleLabel}
                </span>
              </div>

              {/* Items */}
              <div className="p-1.5 space-y-px">
                {isAdmin && (
                  <DropdownItem to="/admin" onClick={() => setDropdownOpen(false)}>
                    <LayoutDashboard size={14} /> Admin Dashboard
                  </DropdownItem>
                )}
                {isStaff && (
                  <DropdownItem to="/pos" onClick={() => setDropdownOpen(false)}>
                    <Package size={14} /> POS Terminal
                  </DropdownItem>
                )}
                {isStaff && (
                  <DropdownItem to="/cart" onClick={() => setDropdownOpen(false)}>
                    <ShoppingCart size={14} />
                    Cart
                    {cartQty > 0 && (
                      <span className="ml-auto bg-[rgba(116,198,157,0.15)] text-[#74c69d] rounded-md text-[10px] font-extrabold px-[7px] py-0.5">
                        {cartQty}
                      </span>
                    )}
                  </DropdownItem>
                )}
              </div>
              <div className="h-px bg-white/[0.07] mx-1.5" />
              <div className="p-1.5">
                <DropdownItem danger onClick={handleLogout}>
                  <LogOut size={14} /> Sign out
                </DropdownItem>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Navbar;
