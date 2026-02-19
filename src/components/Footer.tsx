import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Facebook, Instagram, Twitter, MapPin, Phone, Mail,
  Clock, Leaf, ArrowUpRight, ExternalLink, Navigation,
} from 'lucide-react';

// ── Sub-components ─────────────────────────────────────────────────────────────
const ColHead: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 mb-3 sm:mb-5">
    <span className="w-[5px] h-[5px] rounded-full bg-[#52b788] flex-shrink-0" />
    <span className="text-[10px] font-extrabold tracking-[2px] uppercase text-white/35">
      {label}
    </span>
  </div>
);

const FootLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <li>
    <Link
      to={to}
      className="
        group inline-flex items-center gap-[5px]
        py-1 min-h-[40px] sm:min-h-0
        text-[13px] sm:text-[13.5px] font-medium text-white/50
        transition-colors duration-150 hover:text-[#74c69d]
      "
    >
      {label}
      <ArrowUpRight
        size={11}
        className="opacity-0 transition-all duration-150
          group-hover:opacity-100 group-hover:translate-x-px group-hover:-translate-y-px"
      />
    </Link>
  </li>
);

const ContactRow: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-start gap-2.5 sm:gap-3 text-[12.5px] sm:text-[13px] leading-[1.6] text-white/50">
    <div className="
      w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] sm:rounded-[9px] flex-shrink-0 mt-0.5
      bg-[rgba(82,183,136,0.1)] border border-[rgba(82,183,136,0.12)]
      flex items-center justify-center text-[#74c69d]
    ">
      {icon}
    </div>
    <div>{children}</div>
  </div>
);

// ── Footer ─────────────────────────────────────────────────────────────────────
const Footer = () => {
  const MAPS_QUERY   = 'Kiboko+Highway+Hotel+Limuru+Kiambu+Kenya';
  const GMAPS_SEARCH = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;
  const GMAPS_EMBED  = `https://maps.google.com/maps?q=${MAPS_QUERY}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
      `}</style>

      <footer
        className="bg-[#0a1f16] border-t border-white/[0.06] text-white/55 no-print
          pb-[env(safe-area-inset-bottom)]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Gradient strip */}
        <div className="h-0.5 opacity-70 bg-[linear-gradient(90deg,transparent_0%,#2d6a4f_20%,#52b788_50%,#2d6a4f_80%,transparent_100%)]" />

        {/* ── Main columns ───────────────────────────────────────────────────── */}
        <div className="max-w-[1280px] mx-auto px-5 pt-8 pb-8 sm:px-6 sm:pt-14 sm:pb-12 lg:px-10 lg:pt-[72px] lg:pb-14">
          <div className="
            grid grid-cols-2 gap-x-5 gap-y-7
            sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10
            lg:grid-cols-[2.2fr_1fr_1fr_1.6fr] lg:gap-x-[52px] lg:gap-y-0
          ">

            {/* ── Brand — full width on mobile ────────────────────────────────── */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <Link to="/" className="group inline-flex items-center gap-2.5 mb-3 sm:mb-5">
                <div className="
                  w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[11px] flex-shrink-0
                  bg-gradient-to-br from-[#52b788] to-[#2d6a4f]
                  flex items-center justify-center
                  shadow-[0_3px_12px_rgba(82,183,136,0.35)]
                  transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                  group-hover:-rotate-[8deg] group-hover:scale-110
                  group-hover:shadow-[0_6px_20px_rgba(82,183,136,0.5)]
                ">
                  <Leaf size={16} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[17px] sm:text-[18px] font-bold text-white leading-[1.1]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Penchic
                  </span>
                  <span className="text-[9px] font-extrabold tracking-[3px] uppercase text-[#52b788] leading-none">
                    Farm
                  </span>
                </div>
              </Link>

              {/* Tagline — hidden on mobile to save space */}
              <p className="hidden sm:block text-[13.5px] leading-[1.8] text-white/40 mb-6 max-w-[270px]">
                Quality animal feeds and farm products for your livestock —
                grown and delivered with care along the Nairobi-Nakuru corridor.
              </p>

              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {[
                  { icon: <Facebook  size={14} />, href: '#', label: 'Facebook'  },
                  { icon: <Instagram size={14} />, href: '#', label: 'Instagram' },
                  { icon: <Twitter   size={14} />, href: '#', label: 'Twitter'   },
                ].map(s => (
                  <motion.a
                    key={s.label}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    href={s.href}
                    className="
                      w-8 h-8 sm:w-9 sm:h-9
                      rounded-[9px] sm:rounded-[10px]
                      border border-white/[0.09]
                      flex items-center justify-center
                      text-white/45 bg-white/[0.03]
                      transition-all duration-200
                      hover:bg-[rgba(82,183,136,0.12)]
                      hover:border-[rgba(82,183,136,0.35)]
                      hover:text-[#74c69d] hover:-translate-y-0.5
                      active:translate-y-0
                    "
                    aria-label={s.label}
                  >
                    {s.icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* ── Navigate ───────────────────────────────────────────────────── */}
            <div>
              <ColHead label="Navigate" />
              <ul className="list-none p-0 m-0 flex flex-col gap-0">
                {[
                  { to: '/shop',  label: 'Shop'       },
                  { to: '/cart',  label: 'Cart'        },
                  { to: '/login', label: 'My Account'  },
                ].map(item => <FootLink key={item.to} {...item} />)}
              </ul>
            </div>

            {/* ── Products ───────────────────────────────────────────────────── */}
            <div>
              <ColHead label="Products" />
              <ul className="list-none p-0 m-0 flex flex-col gap-0">
                {[
                  { to: '/products/dairy',   label: 'Dairy Feeds'     },
                  { to: '/products/poultry', label: 'Poultry Feeds'   },
                  { to: '/products/swine',   label: 'Farm Fresh Eggs' },
                  { to: '/products/other',   label: 'Other Feeds'     },
                ].map(item => <FootLink key={item.to} {...item} />)}
              </ul>
            </div>

            {/* ── Contact — full width on mobile ──────────────────────────────── */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <ColHead label="Get in Touch" />

              {/*
                Mobile: 2-col grid so address+hours are side by side,
                phone+email stack beneath. Saves ~60px of vertical space.
              */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1 sm:gap-y-3.5">
                <ContactRow icon={<MapPin size={13} />}>
                  Nairobi-Nakuru Rd (A104)<br />
                  Kwambira, Kiambu<br />
                  <span className="text-white/30 text-[11px]">Near Kiboko Hotel</span>
                </ContactRow>

                <ContactRow icon={<Clock size={13} />}>
                  Mon – Sat<br />8:00 AM – 5:00 PM
                </ContactRow>

                <ContactRow icon={<Phone size={13} />}>
                  <a href="tel:+254722395370"
                    className="text-white/50 hover:text-[#74c69d] transition-colors duration-150">
                    +254 722 395 370
                  </a><br />
                  <a href="tel:+254722899822"
                    className="text-white/50 hover:text-[#74c69d] transition-colors duration-150">
                    +254 722 899 822
                  </a>
                </ContactRow>

                <ContactRow icon={<Mail size={13} />}>
                  <a href="mailto:info@penchicfarm.com"
                    className="text-white/50 hover:text-[#74c69d] transition-colors duration-150 break-all">
                    info@penchicfarm.com
                  </a>
                </ContactRow>
              </div>
            </div>

          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────────────────────── */}
        <div className="h-px bg-white/[0.06]" />
        <div className="max-w-[1280px] mx-auto px-5 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-[52px]">

          <div className="flex items-center justify-between mb-3 sm:mb-[18px] flex-wrap gap-2 sm:gap-3">
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-2">
                <div className="
                  w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] sm:rounded-lg
                  flex items-center justify-center text-[#74c69d]
                  bg-[rgba(82,183,136,0.1)] border border-[rgba(82,183,136,0.15)]
                ">
                  <Navigation size={12} />
                </div>
                <span className="text-[10px] font-extrabold tracking-[2px] uppercase text-white/35">
                  Find Us
                </span>
              </div>
              <span className="text-[11.5px] sm:text-[12px] text-white/35 pl-8 sm:pl-9">
                Nairobi-Nakuru Road · Kwambira, Kiambu
              </span>
            </div>

            <a
              href={GMAPS_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center gap-1.5
                text-[11.5px] sm:text-[12px] font-bold text-[#74c69d]
                px-3 py-2 sm:px-3.5 sm:py-2 rounded-[8px] sm:rounded-[9px]
                border border-[rgba(116,198,157,0.22)]
                bg-[rgba(116,198,157,0.06)]
                transition-all duration-200
                hover:bg-[rgba(116,198,157,0.14)]
                hover:border-[rgba(116,198,157,0.45)]
                hover:-translate-y-px active:translate-y-0
              "
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <ExternalLink size={10} />
              Open in Maps
            </a>
          </div>

          {/* Map frame — very compact on mobile */}
          <div className="
            rounded-2xl sm:rounded-[18px] overflow-hidden
            border border-white/[0.08]
            h-40 sm:h-56 lg:h-[280px]
            shadow-[0_12px_48px_rgba(0,0,0,0.38)]
          ">
            <iframe
              title="Penchic Farm — Kiboko Highway Hotel"
              src={GMAPS_EMBED}
              className="w-full h-full border-none block"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
        <div className="h-px bg-white/[0.06]" />
        <div className="
          max-w-[1280px] mx-auto px-5 py-3.5 sm:py-5 lg:px-10
          flex flex-col sm:flex-row items-center justify-between
          gap-1.5 sm:gap-2.5 text-center sm:text-left
        ">
          <p className="flex items-center gap-[7px] text-[11.5px] sm:text-[12px] text-white/25">
            © {new Date().getFullYear()} Penchic Farm
            <span className="w-[3px] h-[3px] rounded-full bg-white/20 inline-block" />
            All rights reserved
          </p>
          <div className="flex gap-4 sm:gap-[18px]">
            {[
              { href: '/privacy', label: 'Privacy Policy'   },
              { href: '/terms',   label: 'Terms of Service' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-[11.5px] sm:text-[12px] text-white/25 hover:text-white/55 transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

      </footer>
    </>
  );
};

export default Footer;
