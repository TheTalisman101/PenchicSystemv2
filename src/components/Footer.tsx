import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Facebook, Instagram, Twitter, MapPin, Phone, Mail,
  Clock, Leaf, ArrowUpRight, ExternalLink, Navigation,
} from 'lucide-react';

const Footer = () => {
  const MAPS_QUERY   = 'Kiboko+Highway+Hotel+Limuru+Kiambu+Kenya';
  const GMAPS_SEARCH = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;
  const GMAPS_EMBED  = `https://maps.google.com/maps?q=${MAPS_QUERY}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .ft {
          background: #0a1f16;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-family: 'DM Sans', sans-serif;
          color: rgba(255,255,255,0.55);
        }

        .ft-strip {
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, #2d6a4f 20%, #52b788 50%, #2d6a4f 80%, transparent 100%
          );
          opacity: 0.7;
        }

        .ft-main {
          max-width: 1280px; margin: 0 auto;
          padding: 64px 24px 52px;
        }
        @media (min-width: 1024px) { .ft-main { padding: 72px 40px 56px; } }

        .ft-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px 0;
        }
        @media (min-width: 640px)  { .ft-grid { grid-template-columns: repeat(2, 1fr); gap: 48px 32px; } }
        @media (min-width: 1024px) { .ft-grid { grid-template-columns: 2.2fr 1fr 1fr 1.6fr; gap: 0 52px; } }

        /* ── Brand ── */
        .ft-logo {
          display: flex; align-items: center; gap: 11px;
          text-decoration: none; margin-bottom: 20px;
        }
        .ft-logo-mark {
          width: 36px; height: 36px; border-radius: 11px;
          background: linear-gradient(135deg, #52b788, #2d6a4f);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 12px rgba(82,183,136,0.35); flex-shrink: 0;
          transition: transform .22s cubic-bezier(0.16,1,0.3,1), box-shadow .22s;
        }
        .ft-logo:hover .ft-logo-mark {
          transform: rotate(-8deg) scale(1.1);
          box-shadow: 0 6px 20px rgba(82,183,136,0.5);
        }
        .ft-logo-wordmark { display: flex; flex-direction: column; }
        .ft-logo-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 700; color: #fff; line-height: 1.1;
        }
        .ft-logo-sub {
          font-size: 9px; font-weight: 700; letter-spacing: 3px;
          text-transform: uppercase; color: #52b788; line-height: 1;
        }

        .ft-tagline {
          font-size: 13.5px; line-height: 1.8;
          color: rgba(255,255,255,0.38); margin-bottom: 26px; max-width: 270px;
        }

        .ft-socials { display: flex; gap: 8px; flex-wrap: wrap; }
        .ft-social {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.45); text-decoration: none;
          background: rgba(255,255,255,0.03);
          transition: all .2s ease;
        }
        .ft-social:hover {
          background: rgba(82,183,136,0.12);
          border-color: rgba(82,183,136,0.35);
          color: #74c69d; transform: translateY(-2px);
        }

        /* ── Column headings ── */
        .ft-col-head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
        }
        .ft-col-head-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #52b788; flex-shrink: 0;
        }
        .ft-col-title {
          font-size: 10px; font-weight: 800; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
        }

        /* ── Links ── */
        .ft-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1px; }
        .ft-link {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 0; font-size: 13.5px; font-weight: 500;
          color: rgba(255,255,255,0.48); text-decoration: none;
          transition: all .15s ease; width: fit-content;
        }
        .ft-link svg { opacity: 0; transition: opacity .15s, transform .15s; }
        .ft-link:hover { color: #74c69d; }
        .ft-link:hover svg { opacity: 1; transform: translate(1px, -1px); }

        /* ── Contact ── */
        .ft-contacts { display: flex; flex-direction: column; gap: 14px; }
        .ft-contact {
          display: flex; align-items: flex-start; gap: 12px;
          font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.48);
        }
        .ft-contact-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(82,183,136,0.1); border: 1px solid rgba(82,183,136,0.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #74c69d; margin-top: 1px;
        }
        .ft-contact a {
          color: rgba(255,255,255,0.48); text-decoration: none;
          transition: color .15s;
        }
        .ft-contact a:hover { color: #74c69d; }

        /* ── Map section ── */
        .ft-map-sep { height: 1px; background: rgba(255,255,255,0.06); }
        .ft-map-wrap {
          max-width: 1280px; margin: 0 auto;
          padding: 48px 24px 56px;
        }
        @media (min-width: 1024px) { .ft-map-wrap { padding: 52px 40px 64px; } }

        .ft-map-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px; flex-wrap: wrap; gap: 12px;
        }
        .ft-map-label { display: flex; align-items: center; gap: 8px; }
        .ft-map-label-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(82,183,136,0.1); border: 1px solid rgba(82,183,136,0.15);
          display: flex; align-items: center; justify-content: center; color: #74c69d;
        }
        .ft-map-label-text {
          font-size: 10px; font-weight: 800; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
        }
        .ft-map-label-sub {
          font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 1px;
        }
        .ft-map-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 700; color: #74c69d; text-decoration: none;
          padding: 8px 14px; border: 1px solid rgba(116,198,157,0.22); border-radius: 9px;
          background: rgba(116,198,157,0.06); transition: all .2s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .ft-map-btn:hover {
          background: rgba(116,198,157,0.14); border-color: rgba(116,198,157,0.45);
          transform: translateY(-1px);
        }

        .ft-map-frame {
          border-radius: 18px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08); height: 280px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.38);
        }
        .ft-map-frame iframe {
          width: 100%; height: 100%; border: none; display: block;
        }

        /* ── Bottom bar ── */
        .ft-bottom-sep { height: 1px; background: rgba(255,255,255,0.06); }
        .ft-bottom {
          max-width: 1280px; margin: 0 auto;
          padding: 20px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          text-align: center;
        }
        @media (min-width: 640px) {
          .ft-bottom { flex-direction: row; justify-content: space-between; text-align: left; }
        }
        @media (min-width: 1024px) { .ft-bottom { padding: 20px 40px; } }

        .ft-copy {
          font-size: 12px; color: rgba(255,255,255,0.24);
          display: flex; align-items: center; gap: 7px;
        }
        .ft-copy-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.18); }
        .ft-legal { display: flex; gap: 18px; }
        .ft-legal a {
          font-size: 12px; color: rgba(255,255,255,0.24); text-decoration: none;
          transition: color .15s;
        }
        .ft-legal a:hover { color: rgba(255,255,255,0.55); }
      `}</style>

      <footer className="ft no-print">
        <div className="ft-strip" />

        {/* ── Main columns ── */}
        <div className="ft-main">
          <div className="ft-grid">

            {/* Brand */}
            <div>
              <Link to="/" className="ft-logo">
                <div className="ft-logo-mark">
                  <Leaf size={17} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="ft-logo-wordmark">
                  <span className="ft-logo-name">Penchic</span>
                  <span className="ft-logo-sub">Farm</span>
                </div>
              </Link>
              <p className="ft-tagline">
                Quality animal feeds and farm products for your livestock —
                grown and delivered with care along the Nairobi-Nakuru corridor.
              </p>
              <div className="ft-socials">
                {[
                  { icon: <Facebook size={15} />, href: '#', label: 'Facebook' },
                  { icon: <Instagram size={15} />, href: '#', label: 'Instagram' },
                  { icon: <Twitter size={15} />, href: '#', label: 'Twitter' },
                ].map(s => (
                  <motion.a
                    key={s.label}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    href={s.href}
                    className="ft-social"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Navigate */}
            <div>
              <div className="ft-col-head">
                <span className="ft-col-head-dot" />
                <span className="ft-col-title">Navigate</span>
              </div>
              <ul className="ft-links">
                {[
                  { to: '/shop',  label: 'Shop' },
                  { to: '/cart',  label: 'Cart' },
                  { to: '/login', label: 'My Account' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="ft-link">
                      {label}
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Products */}
            <div>
              <div className="ft-col-head">
                <span className="ft-col-head-dot" />
                <span className="ft-col-title">Products</span>
              </div>
              <ul className="ft-links">
                {[
                  { to: '/products/dairy',   label: 'Dairy Feeds' },
                  { to: '/products/poultry', label: 'Poultry Feeds' },
                  { to: '/products/swine',   label: 'Farm Fresh Eggs' },
                  { to: '/products/other',   label: 'Other Feeds' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="ft-link">
                      {label}
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <div className="ft-col-head">
                <span className="ft-col-head-dot" />
                <span className="ft-col-title">Get in Touch</span>
              </div>
              <div className="ft-contacts">
                <div className="ft-contact">
                  <div className="ft-contact-icon"><MapPin size={14} /></div>
                  <span>
                    Nairobi-Nakuru Road (A104)<br />
                    Kwambira, Kiambu County<br />
                    <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
                      Near Kiboko Highway Hotel
                    </span>
                  </span>
                </div>
                <div className="ft-contact">
                  <div className="ft-contact-icon"><Phone size={14} /></div>
                  <span>
                    <a href="tel:+254722395370">+254 722 395 370</a><br />
                    <a href="tel:+254722899822">+254 722 899 822</a>
                  </span>
                </div>
                <div className="ft-contact">
                  <div className="ft-contact-icon"><Mail size={14} /></div>
                  <a href="mailto:info@penchicfarm.com">info@penchicfarm.com</a>
                </div>
                <div className="ft-contact">
                  <div className="ft-contact-icon"><Clock size={14} /></div>
                  <span>Mon – Sat · 8:00 AM – 5:00 PM</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Map ── */}
        <div className="ft-map-sep" />
        <div className="ft-map-wrap">
          <div className="ft-map-top">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="ft-map-label">
                <div className="ft-map-label-icon">
                  <Navigation size={13} />
                </div>
                <span className="ft-map-label-text">Find Us</span>
              </div>
              <span className="ft-map-label-sub">
                Nairobi-Nakuru Road · Kwambira, Kiambu
              </span>
            </div>
            <a
              href={GMAPS_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="ft-map-btn"
            >
              <ExternalLink size={11} />
              Open in Google Maps
            </a>
          </div>

          <div className="ft-map-frame">
            <iframe
              title="Penchic Farm — Kiboko Highway Hotel"
              src={GMAPS_EMBED}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="ft-bottom-sep" />
        <div className="ft-bottom">
          <p className="ft-copy">
            © {new Date().getFullYear()} Penchic Farm
            <span className="ft-copy-dot" />
            All rights reserved
          </p>
          <div className="ft-legal">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
