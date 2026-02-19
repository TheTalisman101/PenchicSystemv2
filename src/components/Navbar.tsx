import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart, User, Menu, X, Shield, Store,
  Leaf, LogOut, ChevronDown, LayoutDashboard, Package,
} from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location    = useLocation();

  const user  = useStore(s => s.user);
  const cart  = useStore(s => s.cart);
  const setUser = useStore(s => s.setUser);

  const cartQty    = cart.reduce((a, i) => a + i.quantity, 0);
  const isAdmin    = user?.role === 'admin';
  const isStaff    = ['admin', 'worker'].includes(user?.role || '');

  /* ── Derived display info ─────────────────────────────────────── */
  const displayName = user?.email
    ? user.email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    : '';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const roleLabel = isAdmin ? 'Admin' : user?.role === 'worker' ? 'Worker' : 'Customer';
  const roleDot   = isAdmin ? '#fbbf24' : user?.role === 'worker' ? '#74c69d' : '#a0b8aa';

  /* ── Scroll shadow ────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Close dropdown on outside click ─────────────────────────── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Close on route change ────────────────────────────────────── */
  useEffect(() => { setMenuOpen(false); setDropdownOpen(false); }, [location.pathname]);

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
        *, *::before, *::after { box-sizing: border-box; }

        .nb {
          position: sticky; top: 0; z-index: 50;
          font-family: 'DM Sans', sans-serif;
          background: #0a1f15;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: box-shadow .3s ease;
        }
        .nb.scrolled { box-shadow: 0 4px 32px rgba(0,0,0,0.45); }

        /* ── Inner bar ── */
        .nb-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 20px; height: 62px;
          display: flex; align-items: center; gap: 8px;
        }
        @media (min-width: 1024px) { .nb-inner { padding: 0 36px; } }

        /* ── Logo ── */
        .nb-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0; margin-right: 8px;
        }
        .nb-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #52b788, #2d6a4f);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(82,183,136,0.35);
          transition: transform .22s cubic-bezier(0.16,1,0.3,1), box-shadow .22s;
          flex-shrink: 0;
        }
        .nb-logo:hover .nb-logo-mark {
          transform: rotate(-8deg) scale(1.1);
          box-shadow: 0 6px 20px rgba(82,183,136,0.5);
        }
        .nb-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 17px; font-weight: 700; color: #fff;
          letter-spacing: 0.2px; line-height: 1;
        }
        .nb-logo-sub {
          display: block; font-family: 'DM Sans', sans-serif;
          font-size: 9px; font-weight: 600; color: #52b788;
          letter-spacing: 2.5px; text-transform: uppercase; margin-top: 1px;
        }

        /* ── Desktop nav links ── */
        .nb-links {
          display: none; align-items: center; gap: 1px; flex: 1;
        }
        @media (min-width: 768px) { .nb-links { display: flex; } }

        .nb-link {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 9px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all .18s ease; white-space: nowrap;
          position: relative; border: 1px solid transparent;
        }
        .nb-link:hover {
          color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.055);
        }
        .nb-link.active {
          color: #74c69d;
          background: rgba(116,198,157,0.1);
          border-color: rgba(116,198,157,0.12);
          font-weight: 600;
        }

        /* Pill badges on links */
        .nb-pill {
          font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 5px;
          letter-spacing: 0.8px; text-transform: uppercase; line-height: 1.4;
        }
        .nb-pill-admin  { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .nb-pill-worker { background: rgba(116,198,157,0.15); color: #74c69d; }

        /* ── Desktop right actions ── */
        .nb-actions {
          display: none; align-items: center; gap: 6px; flex-shrink: 0;
        }
        @media (min-width: 768px) { .nb-actions { display: flex; } }

        /* Cart icon button */
        .nb-cart {
          position: relative; display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 10px; text-decoration: none;
          color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.08);
          transition: all .18s ease;
        }
        .nb-cart:hover {
          color: #fff; background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.15);
        }
        .nb-cart.active { color: #74c69d; border-color: rgba(116,198,157,0.25); background: rgba(116,198,157,0.08); }
        .nb-cart-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 17px; height: 17px; border-radius: 9px;
          background: #52b788; color: #0a1f15;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; border: 2px solid #0a1f15;
        }

        /* User dropdown trigger */
        .nb-user-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 10px 5px 5px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          cursor: pointer; transition: all .18s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-user-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.16);
        }
        .nb-user-btn.open { border-color: rgba(116,198,157,0.3); background: rgba(116,198,157,0.06); }

        .nb-avatar {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, #52b788, #1b4332);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #d8f3dc;
          letter-spacing: 0.5px; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .nb-user-meta { display: flex; flex-direction: column; align-items: flex-start; }
        .nb-user-name {
          font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.85);
          max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;
        }
        .nb-user-role {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.35); line-height: 1;
        }
        .nb-user-role-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .nb-chevron { color: rgba(255,255,255,0.35); transition: transform .2s ease; }
        .nb-chevron.open { transform: rotate(180deg); }

        /* Dropdown panel */
        .nb-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 230px; background: #111f16;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
          z-index: 100;
        }
        .dd-header {
          padding: 14px 16px 12px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .dd-avatar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
        .dd-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #52b788, #1b4332);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #d8f3dc;
          flex-shrink: 0;
        }
        .dd-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); margin-bottom: 2px; }
        .dd-email { font-size: 11px; color: rgba(255,255,255,0.35); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dd-role-chip {
          display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
          padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 700;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .dd-role-chip.admin  { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
        .dd-role-chip.worker { background: rgba(116,198,157,0.12); color: #74c69d; border: 1px solid rgba(116,198,157,0.2); }
        .dd-role-chip.customer { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.1); }

        .dd-section { padding: 6px; }
        .dd-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.6); background: none; border: none;
          cursor: pointer; text-decoration: none; transition: all .14s ease; text-align: left;
        }
        .dd-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
        .dd-item.danger { color: #f87171; }
        .dd-item.danger:hover { background: rgba(248,113,113,0.1); color: #ef4444; }
        .dd-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 2px 6px; }

        /* Sign in button */
        .nb-signin {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 18px; border-radius: 10px;
          background: linear-gradient(135deg, #52b788, #2d6a4f);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 700; text-decoration: none;
          border: none; cursor: pointer; white-space: nowrap;
          box-shadow: 0 3px 12px rgba(45,106,79,0.4);
          transition: all .2s ease;
        }
        .nb-signin:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(45,106,79,0.5); }
        .nb-signin:active { transform: translateY(0); }

        /* ── Hamburger ── */
        .nb-ham {
          display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 10px; background: none;
          border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.65);
          cursor: pointer; transition: all .18s ease; flex-shrink: 0;
        }
        .nb-ham:hover { background: rgba(255,255,255,0.07); color: #fff; }
        @media (min-width: 768px) { .nb-ham { display: none; } }

        /* ── Mobile menu ── */
        .nb-mobile { background: #0c1a10; border-top: 1px solid rgba(255,255,255,0.06); overflow: hidden; }
        .nb-mobile-inner { padding: 10px 14px 18px; display: flex; flex-direction: column; gap: 2px; }

        .nm-link {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 14px; border-radius: 11px;
          font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.55);
          text-decoration: none; transition: all .15s ease; border: 1px solid transparent;
        }
        .nm-link:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.05); }
        .nm-link.active { color: #74c69d; background: rgba(116,198,157,0.08); border-color: rgba(116,198,157,0.12); font-weight: 600; }
        .nm-link-right { margin-left: auto; }

        .nm-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 6px 2px; }

        .nm-user-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 6px;
        }
        .nm-avatar {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, #52b788, #1b4332);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #d8f3dc; flex-shrink: 0;
        }
        .nm-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.88); line-height: 1.3; }
        .nm-email { font-size: 11px; color: rgba(255,255,255,0.35); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .nm-logout {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 14px; border-radius: 11px;
          font-size: 14px; font-weight: 500; color: #f87171;
          background: none; border: none; cursor: pointer; width: 100%;
          font-family: 'DM Sans', sans-serif; transition: background .15s;
        }
        .nm-logout:hover { background: rgba(248,113,113,0.08); }

        .nm-signin {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px; border-radius: 13px; text-decoration: none;
          background: linear-gradient(135deg, #52b788, #2d6a4f);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700; margin-top: 6px;
          box-shadow: 0 4px 16px rgba(45,106,79,0.3);
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <nav className={`nb no-print ${scrolled ? 'scrolled' : ''}`}>
        <div className="nb-inner">

          {/* ── Logo ── */}
          <Link to="/" className="nb-logo">
            <div className="nb-logo-mark">
              <Leaf size={17} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div className="nb-logo-text">Penchic</div>
              <span className="nb-logo-sub">Farm</span>
            </div>
          </Link>

          {/* ── Desktop Links ── */}
          <nav className="nb-links">
            <Link to="/shop" className={`nb-link ${isActive('/shop') ? 'active' : ''}`}>
              <Store size={13} strokeWidth={2} />
              Shop
            </Link>

            {isAdmin && (
              <Link to="/admin" className={`nb-link ${isActive('/admin') ? 'active' : ''}`}>
                <LayoutDashboard size={13} strokeWidth={2} />
                Dashboard
                <span className="nb-pill nb-pill-admin">Admin</span>
              </Link>
            )}

            {isStaff && (
              <Link to="/pos" className={`nb-link ${isActive('/pos') ? 'active' : ''}`}>
                <Package size={13} strokeWidth={2} />
                POS
                {user?.role === 'worker' && <span className="nb-pill nb-pill-worker">Staff</span>}
              </Link>
            )}
          </nav>

          {/* ── Desktop Actions ── */}
          <div className="nb-actions">

            {/* Cart */}
            {isStaff && (
              <Link
                to="/cart"
                className={`nb-cart ${isActive('/cart') ? 'active' : ''}`}
                aria-label={`Cart (${cartQty} items)`}
              >
                <ShoppingCart size={18} strokeWidth={1.8} />
                <AnimatePresence>
                  {cartQty > 0 && (
                    <motion.span
                      key="badge"
                      className="nb-cart-badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    >
                      {cartQty > 99 ? '99+' : cartQty}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}

            {/* User / Sign in */}
            {user ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  className={`nb-user-btn ${dropdownOpen ? 'open' : ''}`}
                  onClick={() => setDropdownOpen(v => !v)}
                >
                  <div className="nb-avatar">{initials || <User size={13} />}</div>
                  <div className="nb-user-meta">
                    <span className="nb-user-name">{displayName}</span>
                    <span className="nb-user-role">
                      <span className="nb-user-role-dot" style={{ background: roleDot }} />
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown size={13} className={`nb-chevron ${dropdownOpen ? 'open' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className="nb-dropdown"
                      initial={{ opacity: 0, y: -10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* Header */}
                      <div className="dd-header">
                        <div className="dd-avatar-row">
                          <div className="dd-avatar">{initials || <User size={15} />}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="dd-name">{displayName}</div>
                            <div className="dd-email">{user.email}</div>
                          </div>
                        </div>
                        <div className={`dd-role-chip ${user.role}`}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleDot, display: 'inline-block' }} />
                          {roleLabel}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="dd-section">
                        {isAdmin && (
                          <Link to="/admin" className="dd-item" onClick={() => setDropdownOpen(false)}>
                            <LayoutDashboard size={14} />
                            Admin Dashboard
                          </Link>
                        )}
                        {isStaff && (
                          <Link to="/pos" className="dd-item" onClick={() => setDropdownOpen(false)}>
                            <Package size={14} />
                            POS Terminal
                          </Link>
                        )}
                        {isStaff && (
                          <Link to="/cart" className="dd-item" onClick={() => setDropdownOpen(false)}>
                            <ShoppingCart size={14} />
                            Cart
                            {cartQty > 0 && (
                              <span style={{ marginLeft: 'auto', background: 'rgba(116,198,157,0.15)', color: '#74c69d', borderRadius: 6, fontSize: 10, fontWeight: 800, padding: '2px 7px' }}>
                                {cartQty}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>

                      <div className="dd-sep" />

                      <div className="dd-section">
                        <button className="dd-item danger" onClick={handleLogout}>
                          <LogOut size={14} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="nb-signin">
                <User size={14} />
                Sign in
              </Link>
            )}
          </div>

          {/* ── Hamburger ── */}
          <button
            className="nb-ham"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={menuOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                {menuOpen ? <X size={17} /> : <Menu size={17} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="nb-mobile"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              <div className="nb-mobile-inner">

                <Link to="/shop" className={`nm-link ${isActive('/shop') ? 'active' : ''}`}>
                  <Store size={16} /> Shop
                </Link>

                {isAdmin && (
                  <Link to="/admin" className={`nm-link ${isActive('/admin') ? 'active' : ''}`}>
                    <LayoutDashboard size={16} /> Dashboard
                    <span className="nm-link-right nb-pill nb-pill-admin">Admin</span>
                  </Link>
                )}

                {isStaff && (
                  <Link to="/pos" className={`nm-link ${isActive('/pos') ? 'active' : ''}`}>
                    <Package size={16} /> POS Terminal
                  </Link>
                )}

                {isStaff && (
                  <Link to="/cart" className={`nm-link ${isActive('/cart') ? 'active' : ''}`}>
                    <ShoppingCart size={16} />
                    Cart
                    {cartQty > 0 && (
                      <span className="nm-link-right" style={{ background: 'rgba(116,198,157,0.15)', color: '#74c69d', borderRadius: 7, fontSize: 11, fontWeight: 800, padding: '2px 9px' }}>
                        {cartQty}
                      </span>
                    )}
                  </Link>
                )}

                <div className="nm-sep" />

                {user ? (
                  <>
                    <div className="nm-user-card">
                      <div className="nm-avatar">{initials || <User size={16} />}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nm-name">{displayName}</div>
                        <div className="nm-email">{user.email}</div>
                      </div>
                      <div className={`dd-role-chip ${user.role}`} style={{ flexShrink: 0 }}>
                        {roleLabel}
                      </div>
                    </div>
                    <button className="nm-logout" onClick={handleLogout}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="nm-signin">
                    <User size={16} /> Sign in to your account
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;
