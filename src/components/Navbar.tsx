import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Shield, Store, Leaf, LogOut, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const user = useStore((state) => state.user);
  const cart = useStore((state) => state.cart);
  const setUser = useStore((state) => state.setUser);

  const totalCartQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Derive display name from email
  const displayName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '';

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@400;500;600&display=swap');

        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #0d2419;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-family: 'DM Sans', sans-serif;
        }

        .navbar-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        /* ── Logo ── */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nav-logo-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(64,145,108,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .nav-logo:hover .nav-logo-icon {
          transform: rotate(-6deg) scale(1.08);
          box-shadow: 0 4px 16px rgba(64,145,108,0.5);
        }
        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 600;
          color: #fff;
          letter-spacing: 0.2px;
        }
        .nav-logo-dot {
          display: inline-block;
          width: 5px; height: 5px;
          background: #74c69d;
          border-radius: 50%;
          margin-left: 3px;
          vertical-align: super;
          font-size: 10px;
        }

        /* ── Nav links ── */
        .nav-links {
          display: none;
          align-items: center;
          gap: 2px;
          flex: 1;
          margin-left: 16px;
        }
        @media (min-width: 768px) { .nav-links { display: flex; } }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          transition: all 0.18s ease;
          letter-spacing: 0.1px;
          white-space: nowrap;
          position: relative;
        }
        .nav-link:hover {
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.06);
        }
        .nav-link.active {
          color: #74c69d;
          background: rgba(116,198,157,0.1);
        }
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 14px;
          right: 14px;
          height: 2px;
          background: #74c69d;
          border-radius: 2px 2px 0 0;
        }

        .nav-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(116,198,157,0.2);
          color: #74c69d;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* ── Right actions ── */
        .nav-actions {
          display: none;
          align-items: center;
          gap: 4px;
        }
        @media (min-width: 768px) { .nav-actions { display: flex; } }

        /* Cart button */
        .nav-cart {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px; height: 38px;
          border-radius: 10px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: all 0.18s ease;
          border: 1px solid transparent;
        }
        .nav-cart:hover {
          color: #fff;
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.1);
        }
        .cart-dot {
          position: absolute;
          top: 5px; right: 5px;
          min-width: 16px; height: 16px;
          background: #74c69d;
          color: #0d2419;
          font-size: 10px;
          font-weight: 700;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          line-height: 1;
        }

        /* User button */
        .nav-user-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 5px 5px 5px;
          border-radius: 10px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.18s ease;
          color: rgba(255,255,255,0.8);
          font-family: 'DM Sans', sans-serif;
        }
        .nav-user-btn:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.18);
        }
        .nav-avatar {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #40916c, #1b4332);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #b7e4c7;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .nav-user-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-chevron {
          color: rgba(255,255,255,0.4);
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .nav-chevron.open { transform: rotate(180deg); }

        /* Dropdown */
        .nav-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: #152e20;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
          z-index: 100;
        }
        .dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          margin-bottom: 2px;
        }
        .dropdown-email {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.65);
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .dropdown-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.9);
        }
        .dropdown-item.danger { color: #f87171; }
        .dropdown-item.danger:hover { background: rgba(248,113,113,0.1); color: #ef4444; }
        .dropdown-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 0; }

        /* Login button */
        .nav-login {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 10px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 10px rgba(45,106,79,0.35);
          white-space: nowrap;
        }
        .nav-login:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(45,106,79,0.45);
        }
        .nav-login:active { transform: translateY(0); }

        /* ── Mobile hamburger ── */
        .nav-hamburger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px; height: 38px;
          border-radius: 10px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .nav-hamburger:hover { background: rgba(255,255,255,0.07); color: #fff; }
        @media (min-width: 768px) { .nav-hamburger { display: none; } }

        /* ── Mobile menu ── */
        .mobile-menu {
          background: #0f1f17;
          border-top: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .mobile-menu-inner { padding: 12px 16px 20px; }

        .mobile-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }
        .mobile-link:hover, .mobile-link.active {
          color: #74c69d;
          background: rgba(116,198,157,0.08);
        }
        .mobile-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 0; }

        .mobile-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          margin-bottom: 4px;
        }
        .mobile-avatar {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #40916c, #1b4332);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #b7e4c7;
          flex-shrink: 0;
        }
        .mobile-user-info { flex: 1; min-width: 0; }
        .mobile-user-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }
        .mobile-user-email { font-size: 11px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .mobile-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #f87171;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .mobile-logout:hover { background: rgba(248,113,113,0.08); }

        .mobile-login {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(45,106,79,0.3);
        }
      `}</style>

      <nav className="navbar no-print">
        <div className="navbar-inner">

          {/* ── Logo ── */}
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon">
              <Leaf size={17} color="white" strokeWidth={2.5} />
            </div>
            <span className="nav-logo-text">
              Penchic<span className="nav-logo-dot" />
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="nav-links">
            <Link to="/shop" className={`nav-link ${isActive('/shop') ? 'active' : ''}`}>
              Store
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                <Shield size={14} />
                Admin
                <span className="nav-badge">Pro</span>
              </Link>
            )}
            {['admin', 'worker'].includes(user?.role || '') && (
              <Link to="/pos" className={`nav-link ${isActive('/pos') ? 'active' : ''}`}>
                <Store size={14} />
                POS
              </Link>
            )}
          </div>

          {/* ── Desktop Right Actions ── */}
          <div className="nav-actions">
            {user && ['admin', 'worker'].includes(user.role) && (
              <Link to="/cart" className="nav-cart">
                <ShoppingCart size={19} strokeWidth={1.8} />
                <AnimatePresence>
                  {totalCartQuantity > 0 && (
                    <motion.span
                      key="cart-count"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="cart-dot"
                    >
                      {totalCartQuantity}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}

            {user ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  className="nav-user-btn"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="nav-avatar">{initials || <User size={13} />}</div>
                  <span className="nav-user-name">{displayName}</span>
                  <ChevronDown size={13} className={`nav-chevron ${isDropdownOpen ? 'open' : ''}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="nav-dropdown"
                    >
                      <div className="dropdown-header">
                        <div className="dropdown-name">{displayName}</div>
                        <div className="dropdown-email">{user.email}</div>
                      </div>
                      {user.role === 'admin' && (
                        <Link to="/admin" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                          <Shield size={14} />
                          Admin Dashboard
                        </Link>
                      )}
                      {['admin', 'worker'].includes(user.role) && (
                        <Link to="/pos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                          <Store size={14} />
                          POS Terminal
                        </Link>
                      )}
                      <div className="dropdown-divider" />
                      <button className="dropdown-item danger" onClick={handleLogout}>
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="nav-login">
                Sign in
              </Link>
            )}
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            className="nav-hamburger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isMenuOpen ? 'close' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="mobile-menu"
            >
              <div className="mobile-menu-inner">
                <Link to="/shop" className={`mobile-link ${isActive('/shop') ? 'active' : ''}`}>
                  <Store size={16} /> Store
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className={`mobile-link ${isActive('/admin') ? 'active' : ''}`}>
                    <Shield size={16} /> Admin Dashboard
                  </Link>
                )}
                {['admin', 'worker'].includes(user?.role || '') && (
                  <Link to="/pos" className={`mobile-link ${isActive('/pos') ? 'active' : ''}`}>
                    <Store size={16} /> POS Terminal
                  </Link>
                )}
                {user && ['admin', 'worker'].includes(user.role) && (
                  <Link to="/cart" className={`mobile-link ${isActive('/cart') ? 'active' : ''}`}>
                    <ShoppingCart size={16} />
                    Cart
                    {totalCartQuantity > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'rgba(116,198,157,0.2)', color: '#74c69d', borderRadius: '6px', fontSize: '11px', fontWeight: 700, padding: '2px 8px' }}>
                        {totalCartQuantity}
                      </span>
                    )}
                  </Link>
                )}

                <div className="mobile-divider" />

                {user ? (
                  <>
                    <div className="mobile-user-row">
                      <div className="mobile-avatar">{initials || <User size={15} />}</div>
                      <div className="mobile-user-info">
                        <div className="mobile-user-name">{displayName}</div>
                        <div className="mobile-user-email">{user.email}</div>
                      </div>
                    </div>
                    <button className="mobile-logout" onClick={handleLogout}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="mobile-login">
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