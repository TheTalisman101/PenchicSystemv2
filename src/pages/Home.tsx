import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Typed from 'typed.js';
import { supabase } from '../lib/supabase';
import ScrollReveal from '../components/animations/ScrollReveal';
import {
  Wheat, MapPin, Phone, Mail, Store, ExternalLink,
  ChevronDown, Egg, Beef, ChevronLeft, ChevronRight,
  Leaf, ArrowRight, X, ArrowUpRight, Sprout,
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
    tag: 'Most popular',
  },
  {
    title: 'Cattle Feed',
    description: 'High-quality feed for dairy and beef cattle',
    icon: Beef,
    link: '/shop?category=cattle',
    tag: 'Premium blend',
  },
];

const stats = [
  { value: '10+',  label: 'Years farming'     },
  { value: '500+', label: 'Happy customers'   },
  { value: '99%',  label: 'Fresh daily'       },
  { value: '24h',  label: 'Order processing'  },
];

export default function Home() {
  const typedRef   = useRef(null);
  const [showContact,        setShowContact]        = useState(false);
  const [currentImageIndex,  setCurrentImageIndex]  = useState(0);
  const [featuredProducts,   setFeaturedProducts]   = useState<any[]>([]);
  const [isPaused,           setIsPaused]           = useState(false);

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
    const id = setInterval(() => {
      setCurrentImageIndex(p => (p === heroImages.length - 1 ? 0 : p + 1));
    }, 5000);
    return () => clearInterval(id);
  }, [isPaused]);

  useEffect(() => {
    supabase
      .from('products').select('*').gt('stock', 0)
      .order('created_at', { ascending: false }).limit(4)
      .then(({ data, error }) => {
        if (!error) setFeaturedProducts(data || []);
      });
  }, []);

  const nextImage     = () => setCurrentImageIndex(p => (p === heroImages.length - 1 ? 0 : p + 1));
  const prevImage     = () => setCurrentImageIndex(p => (p === 0 ? heroImages.length - 1 : p - 1));
  const openGoogleMaps = () => window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        .home-root { font-family: 'DM Sans', sans-serif; background: #fff; color: #0d2419; }

        /* ── HERO ─────────────────────────────────── */
        .hero {
          position: relative;
          height: 100svh;
          min-height: 620px;
          overflow: hidden;
          display: grid;
          place-items: center;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          will-change: opacity;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(160deg, rgba(10,28,18,0.72) 0%, rgba(10,28,18,0.28) 55%, rgba(10,28,18,0.60) 100%);
        }

        /* thin animated top accent */
        .hero-accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #40916c 30%, #74c69d 50%, #40916c 70%, transparent 100%);
          z-index: 6;
        }

        /* ── Hero layout: left-aligned on desktop ── */
        .hero-content {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 1280px;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .hero-content { padding: 0 80px; }
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(116,198,157,0.12);
          border: 1px solid rgba(116,198,157,0.25);
          border-radius: 100px;
          padding: 5px 14px 5px 10px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: #74c69d;
          margin-bottom: 24px;
          width: fit-content;
          backdrop-filter: blur(10px);
        }
        .hero-eyebrow-dot {
          width: 6px; height: 6px;
          background: #74c69d;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(48px, 9vw, 96px);
          font-weight: 700;
          color: #fff;
          line-height: 0.95;
          margin: 0 0 6px;
          letter-spacing: -2px;
        }

        .hero-title-italic {
          font-family: 'Playfair Display', serif;
          font-size: clamp(20px, 3.5vw, 32px);
          font-weight: 600;
          font-style: italic;
          color: #74c69d;
          margin: 0 0 28px;
          letter-spacing: -0.3px;
        }

        .hero-desc {
          font-size: clamp(14px, 1.6vw, 16px);
          color: rgba(255,255,255,0.62);
          max-width: 380px;
          margin: 0 0 40px;
          line-height: 1.75;
          font-weight: 400;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 26px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border-radius: 14px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 24px rgba(45,106,79,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
          letter-spacing: 0.1px;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(45,106,79,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 26px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border-radius: 14px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.18);
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(10px);
          letter-spacing: 0.1px;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-2px);
        }

        /* ── Scroll indicator ── */
        .hero-scroll {
          position: absolute;
          bottom: 88px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.35);
        }
        .hero-scroll span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .scroll-line {
          width: 1px;
          height: 36px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.35), transparent);
          animation: scroll-pulse 2s ease-in-out infinite;
        }
        @keyframes scroll-pulse {
          0%,100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        /* ── Carousel arrows ── */
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          width: 42px; height: 42px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }
        .carousel-btn:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-50%) scale(1.08);
        }
        .carousel-btn.left  { left: 20px; }
        .carousel-btn.right { right: 20px; }
        @media (min-width: 768px) {
          .carousel-btn.left  { left: 40px; }
          .carousel-btn.right { right: 40px; }
        }

        /* ── Progress dots ── */
        .carousel-dots {
          position: absolute;
          bottom: 88px;
          right: 40px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 4;
        }
        @media (max-width: 767px) {
          .carousel-dots {
            flex-direction: row;
            bottom: 88px;
            right: 50%;
            transform: translateX(50%);
          }
        }
        .carousel-dot {
          border: none;
          cursor: pointer;
          padding: 0;
          border-radius: 2px;
          background: rgba(255,255,255,0.3);
          transition: all 0.35s ease;
        }
        @media (min-width: 768px) {
          .carousel-dot { width: 3px; }
          .carousel-dot.active { height: 28px; background: #74c69d; }
          .carousel-dot:not(.active) { height: 10px; }
        }
        @media (max-width: 767px) {
          .carousel-dot { height: 3px; }
          .carousel-dot.active { width: 24px; background: #74c69d; }
          .carousel-dot:not(.active) { width: 10px; }
        }

        /* ── Bottom contact bar ── */
        .hero-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          z-index: 4;
          display: flex;
          background: rgba(10,28,18,0.6);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .hero-bar-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 16px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          font-family: 'DM Sans', sans-serif;
          background: none;
          border: none;
          border-right: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          letter-spacing: 0.1px;
        }
        .hero-bar-item:last-child { border-right: none; }
        .hero-bar-item:hover { color: #74c69d; background: rgba(116,198,157,0.06); }

        /* ── STATS ───────────────────────────────── */
        .stats-band {
          background: #0d2419;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          border-left: 1px solid rgba(255,255,255,0.04);
        }
        @media (min-width: 640px) { .stats-inner { grid-template-columns: repeat(4, 1fr); } }

        .stat-cell {
          padding: 32px 24px;
          border-right: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        @media (min-width: 640px) { .stat-cell { border-bottom: none; } }
        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: #74c69d;
          line-height: 1;
          letter-spacing: -1px;
        }
        .stat-label { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.35); letter-spacing: 0.3px; }

        /* ── SECTIONS ─────────────────────────────── */
        .section { padding: 96px 0; }
        .section-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
        @media (min-width: 1024px) { .section-inner { padding: 0 80px; } }

        .section-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #40916c;
          margin-bottom: 16px;
        }
        .tag-bar { width: 18px; height: 2px; background: #40916c; border-radius: 1px; }

        .section-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(30px, 4vw, 46px);
          font-weight: 700;
          color: #0d2419;
          line-height: 1.1;
          letter-spacing: -0.8px;
          margin-bottom: 12px;
        }
        .section-sub {
          font-size: 15px;
          color: #6b8c77;
          line-height: 1.7;
          max-width: 480px;
          font-weight: 400;
        }

        /* ── CATEGORIES ──────────────────────────── */
        .bg-tint { background: #f8faf9; }

        .cat-grid {
          display: grid;
          gap: 16px;
          margin-top: 52px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 600px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } }

        .cat-card {
          position: relative;
          display: block;
          text-decoration: none;
          background: #fff;
          border: 1px solid #e2ede8;
          border-radius: 24px;
          padding: 36px 36px 32px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .cat-card-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 120% 120%, rgba(64,145,108,0.07) 0%, transparent 60%);
          transition: opacity 0.3s ease;
          opacity: 0;
        }
        .cat-card:hover .cat-card-bg { opacity: 1; }
        .cat-card:hover {
          border-color: #b7e4c7;
          box-shadow: 0 20px 48px rgba(45,106,79,0.1), 0 4px 12px rgba(45,106,79,0.06);
          transform: translateY(-4px);
        }

        .cat-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #40916c;
          background: #d8f3dc;
          padding: 3px 10px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .cat-icon-ring {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #d8f3dc, #b7e4c7);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
          transition: transform 0.3s ease;
        }
        .cat-card:hover .cat-icon-ring { transform: rotate(-4deg) scale(1.05); }
        .cat-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0d2419;
          margin-bottom: 10px;
          line-height: 1.15;
        }
        .cat-desc { font-size: 14px; color: #6b8c77; line-height: 1.65; margin-bottom: 28px; }
        .cat-arrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #40916c;
          transition: gap 0.25s ease;
        }
        .cat-arrow-icon {
          width: 28px; height: 28px;
          background: #d8f3dc;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .cat-card:hover .cat-arrow-icon {
          background: #40916c;
          color: #fff;
          transform: rotate(45deg);
        }

        /* ── PRODUCTS ─────────────────────────────── */
        .products-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 44px;
        }
        .view-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #40916c;
          text-decoration: none;
          padding: 9px 18px;
          border: 1px solid #d4e8db;
          border-radius: 12px;
          transition: all 0.2s ease;
          background: #fff;
          white-space: nowrap;
        }
        .view-all:hover { border-color: #40916c; background: #f0f7f3; }

        .prod-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 600px)  { .prod-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .prod-grid { grid-template-columns: repeat(4, 1fr); } }

        .prod-card {
          display: block;
          text-decoration: none;
          background: #fff;
          border: 1px solid #e2ede8;
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .prod-card:hover {
          border-color: #b7e4c7;
          box-shadow: 0 16px 40px rgba(45,106,79,0.1);
          transform: translateY(-4px);
        }

        .prod-img {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: #f0f7f3;
        }
        .prod-img img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .prod-card:hover .prod-img img { transform: scale(1.06); }

        .prod-cat-badge {
          position: absolute;
          top: 12px; left: 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          background: rgba(10,28,18,0.72);
          color: #74c69d;
          padding: 4px 10px;
          border-radius: 8px;
          backdrop-filter: blur(8px);
        }
        .prod-stock-dot {
          position: absolute;
          top: 12px; right: 12px;
          width: 8px; height: 8px;
          border-radius: 50%;
        }
        .prod-stock-dot.in  { background: #74c69d; box-shadow: 0 0 0 3px rgba(116,198,157,0.25); }
        .prod-stock-dot.out { background: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.25); }

        .prod-body { padding: 18px; }
        .prod-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          color: #0d2419;
          margin-bottom: 4px;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .prod-desc {
          font-size: 12.5px;
          color: #6b8c77;
          line-height: 1.6;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .prod-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #f0f7f3;
        }
        .prod-price {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #2d6a4f;
          letter-spacing: -0.4px;
        }
        .prod-stock-label {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 8px;
          letter-spacing: 0.3px;
        }
        .prod-stock-label.in  { background: #d8f3dc; color: #1b4332; }
        .prod-stock-label.out { background: #fee2e2; color: #991b1b; }

        /* ── CTA ─────────────────────────────────── */
        .cta-wrap {
          background: #0d2419;
          position: relative;
          overflow: hidden;
          padding: 100px 0;
        }
        .cta-noise {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 80% 60% at 70% 0%, rgba(64,145,108,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 100%, rgba(116,198,157,0.1) 0%, transparent 55%);
        }
        .cta-grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
        }
        .cta-inner {
          position: relative;
          z-index: 1;
          max-width: 700px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }

        .cta-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(116,198,157,0.1);
          border: 1px solid rgba(116,198,157,0.18);
          border-radius: 100px;
          padding: 5px 16px 5px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #74c69d;
          margin-bottom: 28px;
        }
        .cta-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(30px, 5vw, 52px);
          font-weight: 700;
          color: #fff;
          margin-bottom: 18px;
          line-height: 1.08;
          letter-spacing: -1px;
        }
        .cta-h2 em { font-style: italic; color: #74c69d; }
        .cta-p {
          font-size: 15px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 44px;
          line-height: 1.75;
        }
        .cta-btns {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* ── MODAL ───────────────────────────────── */
        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          z-index: 200;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
        }
        @media (min-width: 600px) {
          .modal-bg { align-items: center; padding: 24px; }
        }
        .modal-card {
          background: #fff;
          width: 100%;
          max-width: 460px;
          border-radius: 28px 28px 0 0;
          padding: 36px 28px 40px;
          position: relative;
          box-shadow: 0 -8px 64px rgba(0,0,0,0.2);
        }
        @media (min-width: 600px) {
          .modal-card { border-radius: 28px; padding: 44px; }
        }
        .modal-handle {
          width: 40px; height: 4px;
          background: #e2ede8;
          border-radius: 2px;
          margin: 0 auto 28px;
        }
        @media (min-width: 600px) { .modal-handle { display: none; } }

        .modal-close {
          position: absolute;
          top: 20px; right: 20px;
          width: 34px; height: 34px;
          background: #f0f7f3;
          border: none; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6b8c77;
          transition: all 0.15s ease;
        }
        .modal-close:hover { background: #d8f3dc; color: #2d6a4f; }

        .modal-h2 {
          font-family: 'Playfair Display', serif;
          font-size: 26px; font-weight: 700;
          color: #0d2419; margin-bottom: 6px;
          letter-spacing: -0.4px;
        }
        .modal-sub { font-size: 13.5px; color: #6b8c77; margin-bottom: 32px; line-height: 1.6; }

        .contact-list { display: flex; flex-direction: column; gap: 12px; }
        .contact-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: #f8faf9;
          border-radius: 16px;
          border: 1px solid #e2ede8;
          transition: border-color 0.2s ease;
        }
        .contact-row:hover { border-color: #b7e4c7; }
        .contact-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          background: #fff;
          border: 1px solid #e2ede8;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #40916c;
        }
        .contact-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #6b8c77; margin-bottom: 4px; }
        .contact-value { font-size: 13.5px; color: #0d2419; font-weight: 500; }
        .contact-value a { color: #0d2419; text-decoration: none; }
        .contact-value a:hover { color: #40916c; }
        .maps-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #40916c;
          background: none;
          border: none;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0;
          margin-top: 5px;
          transition: color 0.15s;
        }
        .maps-link:hover { color: #2d6a4f; }
        .modal-cta {
          width: 100%; margin-top: 24px;
          padding: 14px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border: none; border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(45,106,79,0.3);
          letter-spacing: 0.2px;
        }
        .modal-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,106,79,0.4); }
      `}</style>

      <div className="home-root">

        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <section
          className="hero"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="hero-accent" />

          {heroImages.map((img, i) => (
            <motion.div
              key={img}
              className="hero-slide"
              style={{ backgroundImage: `url(${img})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: currentImageIndex === i ? 1 : 0, scale: currentImageIndex === i ? 1 : 1.04 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
            />
          ))}
          <div className="hero-overlay" />

          {/* Arrows */}
          <button className="carousel-btn left" onClick={prevImage} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button className="carousel-btn right" onClick={nextImage} aria-label="Next">
            <ChevronRight size={18} />
          </button>

          {/* Content */}
          <div className="hero-content">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16,1,0.3,1] }}
            >
              <div className="hero-eyebrow">
                <div className="hero-eyebrow-dot" />
                Limuru, Kenya
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.22, ease: [0.16,1,0.3,1] }}
            >
              <h1 className="hero-title" ref={typedRef} />
              <p className="hero-title-italic">Quality Farm Feeds & Fresh Produce</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.38, ease: [0.16,1,0.3,1] }}
            >
              <p className="hero-desc">
                Premium animal feed solutions and farm-fresh products grown with care for your livestock and family.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.52, ease: [0.16,1,0.3,1] }}
            >
              <div className="hero-actions">
                <Link to="/shop" className="btn-primary">
                  <Store size={15} />
                  Shop Now
                </Link>
                <button className="btn-ghost" onClick={() => setShowContact(true)}>
                  <Phone size={15} />
                  Contact Us
                </button>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <div className="hero-scroll">
            <div className="scroll-line" />
          </div>

          {/* Vertical dots */}
          <div className="carousel-dots">
            {heroImages.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${currentImageIndex === i ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Contact bar */}
          <div className="hero-bar">
            <button className="hero-bar-item" onClick={openGoogleMaps}>
              <MapPin size={13} /> Limuru, Kiambu
            </button>
            <a href="tel:+254722395370" className="hero-bar-item">
              <Phone size={13} /> +254 722 395 370
            </a>
            <a href="mailto:info@penchicfarm.com" className="hero-bar-item">
              <Mail size={13} /> info@penchicfarm.com
            </a>
          </div>
        </section>

        {/* ══ STATS ══════════════════════════════════════════════════════════ */}
        <div className="stats-band">
          <div className="stats-inner">
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 0.08}>
                <div className="stat-cell">
                  <div className="stat-number">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ══ CATEGORIES ════════════════════════════════════════════════════ */}
        <section className="section bg-tint">
          <div className="section-inner">
            <ScrollReveal>
              <div className="section-tag">
                <div className="tag-bar" />
                What we offer
              </div>
              <h2 className="section-h2">Feed solutions for<br />every animal</h2>
              <p className="section-sub">
                Carefully formulated nutrition for all your livestock needs, sourced and packed fresh.
              </p>
            </ScrollReveal>

            <div className="cat-grid">
              {categories.map((cat, i) => (
                <ScrollReveal key={cat.title} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.1}>
                  <Link to={cat.link} className="cat-card">
                    <div className="cat-card-bg" />
                    <span className="cat-tag">{cat.tag}</span>
                    <div className="cat-icon-ring">
                      <cat.icon size={26} color="#2d6a4f" strokeWidth={1.7} />
                    </div>
                    <h3 className="cat-title">{cat.title}</h3>
                    <p className="cat-desc">{cat.description}</p>
                    <span className="cat-arrow">
                      Browse products
                      <span className="cat-arrow-icon">
                        <ArrowRight size={13} />
                      </span>
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURED PRODUCTS ═════════════════════════════════════════════ */}
        {featuredProducts.length > 0 && (
          <section className="section">
            <div className="section-inner">
              <div className="products-row">
                <ScrollReveal>
                  <div>
                    <div className="section-tag">
                      <div className="tag-bar" />
                      Just in
                    </div>
                    <h2 className="section-h2">Featured products</h2>
                  </div>
                </ScrollReveal>
                <Link to="/shop" className="view-all">
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              <div className="prod-grid">
                {featuredProducts.map((p, i) => (
                  <ScrollReveal key={p.id} delay={i * 0.07}>
                    <Link to={`/product/${p.id}`} className="prod-card">
                      <div className="prod-img">
                        <img src={p.image_url} alt={p.name} loading="lazy" />
                        {p.category && <span className="prod-cat-badge">{p.category}</span>}
                        <span className={`prod-stock-dot ${p.stock > 0 ? 'in' : 'out'}`} />
                      </div>
                      <div className="prod-body">
                        <h3 className="prod-name">{p.name}</h3>
                        <p className="prod-desc">{p.description}</p>
                        <div className="prod-foot">
                          <span className="prod-price">KES {p.price.toLocaleString()}</span>
                          <span className={`prod-stock-label ${p.stock > 0 ? 'in' : 'out'}`}>
                            {p.stock > 0 ? 'In stock' : 'Out of stock'}
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

        {/* ══ CTA ════════════════════════════════════════════════════════════ */}
        <section className="cta-wrap">
          <div className="cta-noise" />
          <div className="cta-grid-lines" />
          <div className="cta-inner">
            <ScrollReveal>
              <div className="cta-eyebrow">
                <Sprout size={11} />
                Grown with care
              </div>
              <h2 className="cta-h2">
                Ready to improve your<br />
                <em>farm's productivity?</em>
              </h2>
              <p className="cta-p">
                Visit our store or reach out to learn more about our premium feed products and farm-fresh produce.
              </p>
              <div className="cta-btns">
                <Link to="/shop" className="btn-primary">
                  <Store size={15} />
                  Visit Store
                </Link>
                <button className="btn-ghost" onClick={() => setShowContact(true)}>
                  <Phone size={15} />
                  Contact Us
                </button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══ CONTACT MODAL ══════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showContact && (
            <motion.div
              className="modal-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setShowContact(false); }}
            >
              <motion.div
                className="modal-card"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.26, ease: [0.16,1,0.3,1] }}
              >
                <div className="modal-handle" />
                <button className="modal-close" onClick={() => setShowContact(false)}>
                  <X size={14} />
                </button>
                <h2 className="modal-h2">Get in touch</h2>
                <p className="modal-sub">We'd love to hear from you. Reach us any way you prefer.</p>

                <div className="contact-list">
                  <div className="contact-row">
                    <div className="contact-icon"><Mail size={16} /></div>
                    <div>
                      <div className="contact-label">Email</div>
                      <div className="contact-value">
                        <a href="mailto:info@penchicfarm.com">info@penchicfarm.com</a>
                      </div>
                    </div>
                  </div>
                  <div className="contact-row">
                    <div className="contact-icon"><Phone size={16} /></div>
                    <div>
                      <div className="contact-label">Phone</div>
                      <div className="contact-value">
                        <a href="tel:+254722395370">+254 722 395 370</a><br />
                        <a href="tel:+254722899822">+254 722 899 822</a>
                      </div>
                    </div>
                  </div>
                  <div className="contact-row">
                    <div className="contact-icon"><MapPin size={16} /></div>
                    <div>
                      <div className="contact-label">Location</div>
                      <div className="contact-value">Limuru, Kiambu, Kenya</div>
                      <button className="maps-link" onClick={openGoogleMaps}>
                        Open in Google Maps <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                <button className="modal-cta" onClick={() => setShowContact(false)}>
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
