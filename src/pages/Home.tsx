import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Typed from 'typed.js';
import { supabase } from '../lib/supabase';
import ScrollReveal from '../components/animations/ScrollReveal';
import {
  Wheat, MapPin, Phone, Mail, Store, ExternalLink,
  ChevronDown, Egg, Beef, ChevronLeft, ChevronRight,
  Leaf, ArrowRight, X, Star, Package
} from 'lucide-react';

const heroImages = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&q=80&w=1920',
];

const categories = [
  {
    title: 'Poultry Feed',
    description: 'Complete nutrition for chickens, ducks, and other poultry',
    icon: Egg,
    link: '/shop?category=poultry',
    color: '#f0fdf4',
    accent: '#40916c',
  },
  {
    title: 'Cattle Feed',
    description: 'High-quality feed for dairy and beef cattle',
    icon: Beef,
    link: '/shop?category=cattle',
    color: '#f0fdf4',
    accent: '#2d6a4f',
  },
];

export default function Home() {
  const typedRef = useRef(null);
  const [showContact, setShowContact] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const typed = new Typed(typedRef.current, {
      strings: ['PENCHIC FARM'],
      typeSpeed: 60,
      showCursor: false,
    });
    return () => typed.destroy();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev === heroImages.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products').select('*').gt('stock', 0)
          .order('created_at', { ascending: false }).limit(4);
        if (error) throw error;
        setFeaturedProducts(data || []);
      } catch (error) {
        console.error('Error fetching featured products:', error);
      }
    };
    fetchProducts();
  }, []);

  const nextImage = () => { setCurrentImageIndex((p) => (p === heroImages.length - 1 ? 0 : p + 1)); };
  const prevImage = () => { setCurrentImageIndex((p) => (p === 0 ? heroImages.length - 1 : p - 1)); };
  const openGoogleMaps = () => window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .home-root { font-family: 'DM Sans', sans-serif; background: #fff; }

        /* ══════════════════════════════════════
           HERO
        ══════════════════════════════════════ */
        .hero {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
        }

        /* layered gradient — darkens bottom for text, adds green tint at top */
        .hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(10,28,18,0.55) 0%, rgba(10,28,18,0.2) 40%, rgba(10,28,18,0.65) 100%);
        }

        /* thin green line at top of hero */
        .hero-accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #40916c 30%, #74c69d 50%, #40916c 70%, transparent);
          z-index: 5;
        }

        .hero-content {
          position: relative;
          z-index: 3;
          text-align: center;
          padding: 0 24px;
          max-width: 860px;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(116,198,157,0.15);
          border: 1px solid rgba(116,198,157,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #74c69d;
          margin-bottom: 28px;
          backdrop-filter: blur(8px);
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(44px, 8vw, 88px);
          font-weight: 700;
          color: #fff;
          line-height: 1.05;
          margin: 0 0 10px;
          letter-spacing: -1px;
          text-shadow: 0 2px 30px rgba(0,0,0,0.3);
        }

        .hero-title-sub {
          font-family: 'Playfair Display', serif;
          font-size: clamp(18px, 3vw, 28px);
          font-weight: 600;
          font-style: italic;
          color: #74c69d;
          margin: 0 0 24px;
          letter-spacing: 0;
        }

        .hero-desc {
          font-size: clamp(15px, 2vw, 18px);
          color: rgba(255,255,255,0.7);
          max-width: 480px;
          margin: 0 auto 40px;
          line-height: 1.7;
          font-weight: 400;
        }

        .hero-btns {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        @media (min-width: 480px) { .hero-btns { flex-direction: row; justify-content: center; } }

        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(45,106,79,0.45);
          letter-spacing: 0.2px;
        }
        .hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(45,106,79,0.55); }

        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(8px);
          letter-spacing: 0.2px;
        }
        .hero-btn-secondary:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); transform: translateY(-2px); }

        /* ── Carousel arrows ── */
        .carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 4;
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        .carousel-arrow:hover { background: rgba(255,255,255,0.25); transform: translateY(-50%) scale(1.05); }
        .carousel-arrow.left { left: 20px; }
        .carousel-arrow.right { right: 20px; }
        @media (min-width: 768px) { .carousel-arrow.left { left: 36px; } .carousel-arrow.right { right: 36px; } }

        /* ── Slide dots ── */
        .carousel-dots {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 4;
        }
        .carousel-dot {
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        .carousel-dot.active { background: #74c69d; width: 28px; }
        .carousel-dot:not(.active) { width: 12px; }
        .carousel-dot:not(.active):hover { background: rgba(255,255,255,0.7); }

        /* ── Bottom contact strip ── */
        .hero-contact-strip {
          position: absolute;
          bottom: 0;
          left: 0; right: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          background: rgba(10,28,18,0.7);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 0;
          overflow: hidden;
        }
        .contact-strip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s ease;
          border-right: 1px solid rgba(255,255,255,0.07);
          flex: 1;
          justify-content: center;
        }
        .contact-strip-item:last-child { border-right: none; }
        .contact-strip-item:hover { background: rgba(116,198,157,0.1); color: #74c69d; }
        .contact-strip-item svg { flex-shrink: 0; }

        /* scroll caret */
        .scroll-caret {
          position: absolute;
          bottom: 58px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          color: rgba(255,255,255,0.4);
          animation: bounce 2s ease-in-out infinite;
        }
        @keyframes bounce { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(6px); } }

        /* ══════════════════════════════════════
           STATS BAR
        ══════════════════════════════════════ */
        .stats-bar {
          background: #0d2419;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) { .stats-inner { grid-template-columns: repeat(4, 1fr); } }

        .stat-item {
          padding: 28px 16px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .stat-item:last-child { border-right: none; }
        .stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #74c69d;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-label { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; }

        /* ══════════════════════════════════════
           SECTIONS SHARED
        ══════════════════════════════════════ */
        .section { padding: 88px 0; }
        .section-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #40916c;
          margin-bottom: 14px;
        }
        .section-eyebrow-line { height: 2px; width: 20px; background: #40916c; border-radius: 2px; }

        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          color: #0d2419;
          line-height: 1.15;
          margin-bottom: 14px;
        }
        .section-desc {
          font-size: 15px;
          color: #6b8c77;
          line-height: 1.7;
          max-width: 520px;
        }

        /* ══════════════════════════════════════
           CATEGORIES
        ══════════════════════════════════════ */
        .section-bg-light { background: #f8faf9; }

        .categories-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-top: 48px;
        }
        @media (min-width: 640px) { .categories-grid { grid-template-columns: repeat(2, 1fr); } }

        .category-card {
          display: block;
          text-decoration: none;
          background: #fff;
          border: 1.5px solid #e2ede8;
          border-radius: 20px;
          padding: 32px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .category-card::before {
          content: '';
          position: absolute;
          bottom: 0; right: 0;
          width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(64,145,108,0.06) 0%, transparent 70%);
          border-radius: 50%;
        }
        .category-card:hover {
          border-color: #40916c;
          box-shadow: 0 12px 36px rgba(45,106,79,0.12);
          transform: translateY(-3px);
        }
        .category-icon-wrap {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #d8f3dc, #b7e4c7);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
        }
        .category-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: #0d2419;
          margin-bottom: 8px;
        }
        .category-desc { font-size: 14px; color: #6b8c77; line-height: 1.6; margin-bottom: 20px; }
        .category-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #40916c;
          transition: gap 0.2s ease;
        }
        .category-card:hover .category-cta { gap: 10px; }

        /* ══════════════════════════════════════
           FEATURED PRODUCTS
        ══════════════════════════════════════ */
        .products-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #40916c;
          text-decoration: none;
          padding: 8px 16px;
          border: 1.5px solid #d4e8db;
          border-radius: 10px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .view-all-link:hover { background: #f0f7f3; border-color: #40916c; }

        .products-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 640px) { .products-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .products-grid { grid-template-columns: repeat(4, 1fr); } }

        .product-card {
          display: block;
          text-decoration: none;
          background: #fff;
          border: 1.5px solid #e2ede8;
          border-radius: 18px;
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .product-card:hover { border-color: #40916c; box-shadow: 0 10px 30px rgba(45,106,79,0.1); transform: translateY(-3px); }

        .product-img-wrap {
          position: relative;
          aspect-ratio: 4/3;
          overflow: hidden;
          background: #f0f7f3;
        }
        .product-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
        .product-card:hover .product-img-wrap img { transform: scale(1.05); }

        .product-badge {
          position: absolute;
          top: 12px; right: 12px;
          background: rgba(10,28,18,0.75);
          color: #74c69d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          backdrop-filter: blur(6px);
        }

        .product-body { padding: 18px; }
        .product-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          color: #0d2419;
          margin-bottom: 5px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-desc {
          font-size: 13px;
          color: #6b8c77;
          line-height: 1.55;
          margin-bottom: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .product-price {
          font-size: 18px;
          font-weight: 700;
          color: #2d6a4f;
          font-family: 'Playfair Display', serif;
        }
        .product-stock {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 6px;
        }
        .product-stock.in { background: #d8f3dc; color: #1b4332; }
        .product-stock.out { background: #fee2e2; color: #991b1b; }

        /* ══════════════════════════════════════
           CTA
        ══════════════════════════════════════ */
        .cta-section {
          background: #0d2419;
          position: relative;
          overflow: hidden;
          padding: 88px 0;
        }
        .cta-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          pointer-events: none;
        }
        .cta-orb1 { width: 500px; height: 500px; background: #40916c; top: -200px; right: -100px; }
        .cta-orb2 { width: 300px; height: 300px; background: #74c69d; bottom: -100px; left: -50px; }
        .cta-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .cta-inner {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }
        .cta-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(116,198,157,0.12);
          border: 1px solid rgba(116,198,157,0.2);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #74c69d;
          margin-bottom: 24px;
        }
        .cta-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 700;
          color: #fff;
          margin-bottom: 16px;
          line-height: 1.15;
        }
        .cta-title span { color: #74c69d; }
        .cta-sub { font-size: 16px; color: rgba(255,255,255,0.55); margin-bottom: 40px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.7; }
        .cta-btns { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        @media (min-width: 480px) { .cta-btns { flex-direction: row; justify-content: center; } }

        /* ══════════════════════════════════════
           CONTACT MODAL
        ══════════════════════════════════════ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal-card {
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.25);
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 16px; right: 16px;
          width: 32px; height: 32px;
          background: #f8faf9;
          border: none; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6b8c77;
          transition: background 0.15s;
        }
        .modal-close:hover { background: #e2ede8; color: #0d2419; }
        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px; font-weight: 700;
          color: #0d2419; margin-bottom: 6px;
        }
        .modal-sub { font-size: 13.5px; color: #6b8c77; margin-bottom: 28px; }
        .modal-contact-list { display: flex; flex-direction: column; gap: 16px; }
        .modal-contact-item {
          display: flex; align-items: flex-start; gap: 14px;
          font-size: 14px; color: #3d5a47;
        }
        .modal-contact-icon {
          width: 38px; height: 38px; flex-shrink: 0;
          background: #f0f7f3;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #40916c;
        }
        .modal-contact-item a { color: #3d5a47; text-decoration: none; transition: color 0.15s; }
        .modal-contact-item a:hover { color: #2d6a4f; }
        .maps-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #40916c;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 0; margin-top: 4px;
          transition: color 0.15s;
        }
        .maps-btn:hover { color: #2d6a4f; }
        .modal-footer-btn {
          width: 100%; margin-top: 28px;
          padding: 13px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border: none; border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(45,106,79,0.3);
        }
        .modal-footer-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(45,106,79,0.4); }
      `}</style>

      <div className="home-root">

        {/* ══════════════════════════════════════
            HERO — carousel kept, elevated
        ══════════════════════════════════════ */}
        <section className="hero" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          <div className="hero-accent" />

          {/* Carousel slides */}
          {heroImages.map((image, index) => (
            <motion.div
              key={image}
              className="hero-slide"
              style={{ backgroundImage: `url(${image})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: currentImageIndex === index ? 1 : 0, scale: currentImageIndex === index ? 1 : 1.05 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          ))}
          <div className="hero-overlay" />

          {/* Arrows */}
          <button className="carousel-arrow left" onClick={prevImage} aria-label="Previous">
            <ChevronLeft size={20} />
          </button>
          <button className="carousel-arrow right" onClick={nextImage} aria-label="Next">
            <ChevronRight size={20} />
          </button>

          {/* Hero content */}
          <div className="hero-content">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}>
              <div className="hero-eyebrow">
                <Leaf size={12} />
                Limuru, Kenya
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25 }}>
              <h1 className="hero-title" ref={typedRef} />
              <p className="hero-title-sub">Quality Farm Feeds & Fresh Produce</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45 }}>
              <p className="hero-desc">
                Premium animal feed solutions and farm-fresh products grown with care for your livestock and family.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.6 }}>
              <div className="hero-btns">
                <Link to="/shop" className="hero-btn-primary">
                  <Store size={16} />
                  Shop Now
                </Link>
                <button className="hero-btn-secondary" onClick={() => setShowContact(true)}>
                  <Phone size={16} />
                  Contact Us
                </button>
              </div>
            </motion.div>
          </div>

          {/* Scroll caret */}
          <div className="scroll-caret">
            <ChevronDown size={22} />
          </div>

          {/* Dots */}
          <div className="carousel-dots">
            {heroImages.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Contact strip */}
          <div className="hero-contact-strip">
            <button className="contact-strip-item" onClick={openGoogleMaps}>
              <MapPin size={14} /> Limuru, Kiambu
            </button>
            <a href="tel:+254722395370" className="contact-strip-item">
              <Phone size={14} /> +254 722 395 370
            </a>
            <a href="mailto:info@penchicfarm.com" className="contact-strip-item">
              <Mail size={14} /> info@penchicfarm.com
            </a>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════ */}
        <div className="stats-bar">
          <div className="stats-inner">
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 0.1}>
                <div className="stat-item">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            CATEGORIES
        ══════════════════════════════════════ */}
        <section className="section section-bg-light">
          <div className="section-inner">
            <ScrollReveal>
              <div>
                <div className="section-eyebrow">
                  <div className="section-eyebrow-line" />
                  What we offer
                </div>
                <h2 className="section-title">Feed categories<br />for every animal</h2>
                <p className="section-desc">Carefully formulated nutrition for all your livestock needs, sourced and packed fresh.</p>
              </div>
            </ScrollReveal>

            <div className="categories-grid">
              {categories.map((cat, i) => (
                <ScrollReveal key={cat.title} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.12}>
                  <Link to={cat.link} className="category-card">
                    <div className="category-icon-wrap">
                      <cat.icon size={26} color="#2d6a4f" strokeWidth={1.8} />
                    </div>
                    <h3 className="category-title">{cat.title}</h3>
                    <p className="category-desc">{cat.description}</p>
                    <span className="category-cta">
                      Browse products <ArrowRight size={14} />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURED PRODUCTS
        ══════════════════════════════════════ */}
        {featuredProducts.length > 0 && (
          <section className="section">
            <div className="section-inner">
              <div className="products-header">
                <ScrollReveal>
                  <div>
                    <div className="section-eyebrow">
                      <div className="section-eyebrow-line" />
                      Just in
                    </div>
                    <h2 className="section-title">Featured products</h2>
                  </div>
                </ScrollReveal>
                <Link to="/shop" className="view-all-link">
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              <div className="products-grid">
                {featuredProducts.map((product, i) => (
                  <ScrollReveal key={product.id} delay={i * 0.08}>
                    <Link to={`/product/${product.id}`} className="product-card">
                      <div className="product-img-wrap">
                        <img src={product.image_url} alt={product.name} loading="lazy" />
                        {product.category && (
                          <span className="product-badge">{product.category}</span>
                        )}
                      </div>
                      <div className="product-body">
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-desc">{product.description}</p>
                        <div className="product-footer">
                          <span className="product-price">KES {product.price.toLocaleString()}</span>
                          <span className={`product-stock ${product.stock > 0 ? 'in' : 'out'}`}>
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════
            CTA SECTION
        ══════════════════════════════════════ */}
        <section className="cta-section">
          <div className="cta-orb cta-orb1" />
          <div className="cta-orb cta-orb2" />
          <div className="cta-grid" />
          <div className="cta-inner">
            <ScrollReveal>
              <div className="cta-label">
                <Leaf size={11} />
                Grown with care
              </div>
              <h2 className="cta-title">
                Ready to improve your<br /><span>farm's productivity?</span>
              </h2>
              <p className="cta-sub">
                Visit our store or reach out to learn more about our premium feed products and farm-fresh produce.
              </p>
              <div className="cta-btns">
                <Link to="/shop" className="hero-btn-primary">
                  <Store size={16} />
                  Visit Store
                </Link>
                <button className="hero-btn-secondary" onClick={() => setShowContact(true)}>
                  <Phone size={16} />
                  Contact Us
                </button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CONTACT MODAL
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showContact && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowContact(false); }}
            >
              <motion.div
                className="modal-card"
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <button className="modal-close" onClick={() => setShowContact(false)}>
                  <X size={14} />
                </button>
                <h2 className="modal-title">Get in touch</h2>
                <p className="modal-sub">We'd love to hear from you. Reach us any way you like.</p>

                <div className="modal-contact-list">
                  <div className="modal-contact-item">
                    <div className="modal-contact-icon"><Mail size={16} /></div>
                    <div>
                      <a href="mailto:info@penchicfarm.com">info@penchicfarm.com</a>
                    </div>
                  </div>
                  <div className="modal-contact-item">
                    <div className="modal-contact-icon"><Phone size={16} /></div>
                    <div>
                      <a href="tel:+254722395370">+254 722 395 370</a><br />
                      <a href="tel:+254722899822">+254 722 899 822</a>
                    </div>
                  </div>
                  <div className="modal-contact-item">
                    <div className="modal-contact-icon"><MapPin size={16} /></div>
                    <div>
                      <span>Limuru, Kiambu, Kenya</span><br />
                      <button className="maps-btn" onClick={openGoogleMaps}>
                        View on Google Maps <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                <button className="modal-footer-btn" onClick={() => setShowContact(false)}>
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}