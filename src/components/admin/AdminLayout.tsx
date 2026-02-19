import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // Deferred mount triggers the entry animation after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setContentReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-hidden relative isolate">

      {/* ── Ambient depth layer ────────────────────────────────────────────
          Two soft radial glows give the flat neutral background a subtle
          sense of dimensionality without changing the overall colour story.
      ──────────────────────────────────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-[640px] w-[640px] rounded-full bg-neutral-200/60 blur-[140px]" />
        <div className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full bg-neutral-100/90 blur-[120px]" />
      </div>

      {/* ── Mobile backdrop ────────────────────────────────────────────────
          Animated frosted overlay dismisses the sidebar on tap outside.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={() => setMobileMenuOpen(false)}
        className={[
          'fixed inset-0 z-20 lg:hidden',
          'bg-neutral-900/25 backdrop-blur-[3px]',
          'transition-all duration-300 ease-in-out',
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">

        {/* Hairline gradient accent — adds a refined edge above the header */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px z-50 bg-gradient-to-r from-transparent via-neutral-300/80 to-transparent"
        />

        <Header
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          title={title}
          subtitle={subtitle}
        />

        {/* ── Content area ──────────────────────────────────────────────────
            - Smooth fade-in + upward slide on mount
            - Generous, responsive padding scale
            - Max-width guard prevents over-stretching on ultrawide screens
            - Custom scrollbar (requires tailwind-scrollbar plugin or equivalent)
        ──────────────────────────────────────────────────────────────────── */}
        <main
          className={[
            'flex-1 overflow-auto',
            'px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
            'scrollbar-thin scrollbar-track-transparent',
            'scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300',
            'transition-[opacity,transform] duration-500 ease-out',
            contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          ].join(' ')}
        >
          {/* Constrain content on ultrawide and add a faint inner top shadow
              to separate it visually from the header */}
          <div className="mx-auto w-full max-w-screen-2xl">
            <div className="rounded-t-xl shadow-[inset_0_1px_0_0_rgb(0,0,0,0.04)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
