import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, Clock, Leaf, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@400;500;600&display=swap');

        .footer {
          background: #0a1c12;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-family: 'DM Sans', sans-serif;
          color: rgba(255,255,255,0.65);
        }

        .footer-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 64px 24px 48px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
        }
        @media (min-width: 640px) {
          .footer-grid { grid-template-columns: repeat(2, 1fr); gap: 40px 32px; }
        }
        @media (min-width: 1024px) {
          .footer-grid { grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 0 48px; }
        }

        /* ── Brand column ── */
        .footer-brand {}
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          margin-bottom: 18px;
        }
        .footer-logo-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(64,145,108,0.35);
          flex-shrink: 0;
        }
        .footer-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        .footer-logo-dot {
          display: inline-block;
          width: 5px; height: 5px;
          background: #74c69d;
          border-radius: 50%;
          margin-left: 2px;
          vertical-align: super;
        }

        .footer-tagline {
          font-size: 13.5px;
          line-height: 1.75;
          color: rgba(255,255,255,0.45);
          margin-bottom: 24px;
          max-width: 260px;
        }

        .footer-socials {
          display: flex;
          gap: 8px;
        }
        .social-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.03);
        }
        .social-icon:hover {
          background: rgba(116,198,157,0.12);
          border-color: rgba(116,198,157,0.3);
          color: #74c69d;
          transform: translateY(-2px);
        }

        /* ── Link columns ── */
        .footer-col-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 18px;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .footer-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 0;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.15s ease;
          width: fit-content;
        }
        .footer-link:hover {
          color: #74c69d;
          gap: 6px;
        }
        .footer-link svg {
          opacity: 0;
          transition: opacity 0.15s ease;
          flex-shrink: 0;
        }
        .footer-link:hover svg { opacity: 1; }

        /* ── Contact column ── */
        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255,255,255,0.5);
        }
        .contact-icon {
          width: 30px; height: 30px;
          background: rgba(116,198,157,0.1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: #74c69d;
          margin-top: 1px;
        }
        .contact-item a {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .contact-item a:hover { color: #74c69d; }

        /* ── Bottom bar ── */
        .footer-bottom {
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }
        @media (min-width: 640px) {
          .footer-bottom {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }
        }
        .footer-copyright {
          font-size: 12px;
          color: rgba(255,255,255,0.28);
        }
        .footer-legal {
          display: flex;
          gap: 20px;
        }
        .footer-legal a {
          font-size: 12px;
          color: rgba(255,255,255,0.28);
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-legal a:hover { color: rgba(255,255,255,0.6); }

        /* ── Green accent strip at very top ── */
        .footer-accent-strip {
          height: 2px;
          background: linear-gradient(90deg, transparent, #40916c 30%, #74c69d 50%, #40916c 70%, transparent);
          opacity: 0.6;
        }
      `}</style>

      <footer className="footer no-print">
        <div className="footer-accent-strip" />

        <div className="footer-main">
          <div className="footer-grid">

            {/* ── Brand ── */}
            <div className="footer-brand">
              <Link to="/" className="footer-logo">
                <div className="footer-logo-icon">
                  <Leaf size={17} color="white" strokeWidth={2.5} />
                </div>
                <span className="footer-logo-text">
                  Penchic<span className="footer-logo-dot" />
                </span>
              </Link>
              <p className="footer-tagline">
                Quality farm products and animal feed solutions for your livestock — grown with care in Limuru, Kenya.
              </p>
              <div className="footer-socials">
                <motion.a whileHover={{ scale: 1.05 }} href="#" className="social-icon" aria-label="Facebook">
                  <Facebook size={15} />
                </motion.a>
                <motion.a whileHover={{ scale: 1.05 }} href="#" className="social-icon" aria-label="Instagram">
                  <Instagram size={15} />
                </motion.a>
                <motion.a whileHover={{ scale: 1.05 }} href="#" className="social-icon" aria-label="Twitter">
                  <Twitter size={15} />
                </motion.a>
              </div>
            </div>

            {/* ── Quick Links ── */}
            <div>
              <p className="footer-col-title">Navigate</p>
              <ul className="footer-links">
                {[
                  { to: '/shop', label: 'Shop' },
                  { to: '/cart', label: 'Cart' },
                  { to: '/login', label: 'My Account' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="footer-link">
                      {label}
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Products ── */}
            <div>
              <p className="footer-col-title">Products</p>
              <ul className="footer-links">
                {[
                  { to: '/products/dairy', label: 'Dairy Feeds' },
                  { to: '/products/poultry', label: 'Poultry Feeds' },
                  { to: '/products/swine', label: 'Farm Fresh Eggs' },
                  { to: '/products/other', label: 'Other Feeds' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="footer-link">
                      {label}
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Contact ── */}
            <div>
              <p className="footer-col-title">Get in Touch</p>
              <div className="contact-list">
                <div className="contact-item">
                  <div className="contact-icon"><MapPin size={14} /></div>
                  <span>Limuru, Kiambu<br />Kenya</span>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><Phone size={14} /></div>
                  <span>
                    <a href="tel:+254722395370">+254 722 395 370</a><br />
                    <a href="tel:+254722899822">+254 722 899 822</a>
                  </span>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><Mail size={14} /></div>
                  <a href="mailto:info@penchicfarm.com">info@penchicfarm.com</a>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><Clock size={14} /></div>
                  <span>Mon – Fri<br />8:00 AM – 5:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Penchic Farm. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;