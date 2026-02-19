import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Leaf, Check, User } from 'lucide-react';

export default function Register() {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [socialLoading,   setSocialLoading]   = useState<'google' | 'apple' | null>(null);
  const navigate = useNavigate();

  const passwordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)          score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength      = passwordStrength(password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6)         { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, email: data.user.email, role: 'customer' }]);
        if (profileError) console.error('Profile creation error:', profileError);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setSocialLoading(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #f8faf9;
        }

        /* ══ LEFT PANEL ══════════════════════════════ */
        .reg-left {
          display: none;
          position: relative;
          flex: 1;
          overflow: hidden;
          background: linear-gradient(150deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%);
        }
        @media (min-width: 960px) {
          .reg-left { display: flex; flex-direction: column; justify-content: space-between; padding: 52px; }
        }

        .reg-left-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
        }
        .orb-a { width: 480px; height: 480px; background: #74c69d; opacity: 0.15; top: -120px; right: -120px; }
        .orb-b { width: 320px; height: 320px; background: #52b788; opacity: 0.12; bottom: -60px; left: -60px; }

        .reg-left-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .reg-left-content { position: relative; z-index: 1; }

        .reg-brand {
          display: inline-flex; align-items: center; gap: 11px; margin-bottom: 72px;
        }
        .reg-brand-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .reg-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 21px; font-weight: 700; color: #fff;
        }

        .reg-left-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 3vw, 50px); font-weight: 700;
          color: #fff; line-height: 1.12; margin-bottom: 20px;
          letter-spacing: -0.5px;
        }
        .reg-left-headline em { font-style: italic; color: #b7e4c7; }

        .reg-left-sub {
          font-size: 15px; color: rgba(255,255,255,0.6);
          line-height: 1.75; max-width: 340px; margin-bottom: 56px;
        }

        .reg-perks { display: flex; flex-direction: column; gap: 16px; }
        .reg-perk { display: flex; align-items: flex-start; gap: 14px; }
        .reg-perk-dot {
          width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .reg-perk-title {
          font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.9); margin-bottom: 3px;
        }
        .reg-perk-desc { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.5; }

        .reg-left-footer {
          position: relative; z-index: 1;
          font-size: 12px; color: rgba(255,255,255,0.3);
        }

        /* ══ RIGHT PANEL ═════════════════════════════ */
        .reg-right {
          flex: 0 0 100%;
          display: flex; align-items: center; justify-content: center;
          padding: 48px 24px;
          overflow-y: auto;
        }
        @media (min-width: 960px) { .reg-right { flex: 0 0 500px; } }

        .reg-form-wrap { width: 100%; max-width: 420px; }

        /* Mobile brand (hidden on desktop) */
        .reg-mobile-brand {
          display: flex; align-items: center; gap: 10px; margin-bottom: 36px;
        }
        @media (min-width: 960px) { .reg-mobile-brand { display: none; } }
        .reg-mobile-brand-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: #d8f3dc; display: flex; align-items: center; justify-content: center;
        }
        .reg-mobile-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 700; color: #0d2419;
        }

        .reg-eyebrow {
          display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px;
        }
        .reg-eyebrow-bar { width: 20px; height: 2px; background: #40916c; border-radius: 1px; }
        .reg-eyebrow-text {
          font-size: 11px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: #40916c;
        }
        .reg-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px; font-weight: 700; color: #0d2419;
          line-height: 1.15; margin-bottom: 8px; letter-spacing: -0.4px;
        }
        .reg-subtitle { font-size: 14px; color: #6b8c77; line-height: 1.6; margin-bottom: 32px; }

        /* ── Social buttons ── */
        .social-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }

        .social-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 12px 16px; border-radius: 13px;
          border: 1.5px solid #d4e8db; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          font-weight: 600; color: #0d2419;
          cursor: pointer; transition: all 0.22s ease;
          position: relative; overflow: hidden;
        }
        .social-btn::before {
          content: ''; position: absolute; inset: 0;
          background: #f0f7f3; opacity: 0; transition: opacity 0.2s ease;
        }
        .social-btn:hover:not(:disabled)::before { opacity: 1; }
        .social-btn:hover:not(:disabled) {
          border-color: #40916c;
          box-shadow: 0 4px 16px rgba(45,106,79,0.12);
          transform: translateY(-1px);
        }
        .social-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .social-btn span { position: relative; z-index: 1; }
        .social-btn svg { position: relative; z-index: 1; flex-shrink: 0; }

        /* ── Divider ── */
        .reg-divider {
          display: flex; align-items: center; gap: 12px; margin-bottom: 22px;
        }
        .reg-divider-line { flex: 1; height: 1px; background: #e2ede8; }
        .reg-divider-label {
          font-size: 12px; font-weight: 500; color: #a0b8aa; white-space: nowrap;
        }

        /* ── Fields ── */
        .reg-field { margin-bottom: 16px; }
        .reg-label {
          display: block; font-size: 13px; font-weight: 600;
          color: #0d2419; margin-bottom: 7px;
        }
        .reg-input-wrap { position: relative; }
        .reg-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #a0b8aa; pointer-events: none;
          display: flex; align-items: center;
        }
        .reg-input {
          width: 100%; padding: 12px 14px 12px 42px;
          border: 1.5px solid #d4e8db; border-radius: 13px;
          background: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #0d2419; outline: none;
          transition: all 0.2s ease;
        }
        .reg-input::placeholder { color: #b7d0bf; }
        .reg-input:focus {
          border-color: #40916c;
          box-shadow: 0 0 0 4px rgba(64,145,108,0.1);
        }
        .reg-input-pr { padding-right: 44px; }

        .reg-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #a0b8aa; padding: 4px; border-radius: 6px;
          display: flex; align-items: center; transition: color 0.15s;
        }
        .reg-eye:hover { color: #40916c; }

        /* Strength bar */
        .strength-wrap { margin-top: 8px; }
        .strength-track {
          height: 4px; background: #e2ede8;
          border-radius: 2px; overflow: hidden; margin-bottom: 5px;
        }
        .strength-fill { height: 100%; border-radius: 2px; transition: all 0.35s ease; }
        .strength-label { font-size: 11px; font-weight: 700; }

        /* Match indicator */
        .match-row {
          display: flex; align-items: center; gap: 5px;
          margin-top: 7px; font-size: 12px; font-weight: 600;
        }

        /* Error */
        .reg-error {
          background: #fff5f5; border: 1.5px solid #fca5a5;
          color: #b91c1c; padding: 12px 14px;
          border-radius: 12px; font-size: 13px; margin-bottom: 16px;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .reg-error-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444; flex-shrink: 0; margin-top: 5px;
        }

        /* Submit */
        .reg-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px;
          background: linear-gradient(135deg, #40916c, #1b4332);
          color: #fff; border: none; border-radius: 13px;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s ease;
          margin-top: 8px; margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(45,106,79,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
          letter-spacing: 0.2px;
        }
        .reg-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(45,106,79,0.4);
        }
        .reg-submit:active:not(:disabled) { transform: translateY(0); }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Spinner */
        .spin {
          width: 17px; height: 17px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: _spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes _spin { to { transform: rotate(360deg); } }

        /* Terms */
        .reg-terms {
          font-size: 12px; color: #a0b8aa;
          text-align: center; line-height: 1.6; margin-bottom: 24px;
        }
        .reg-terms a { color: #40916c; text-decoration: none; font-weight: 600; }
        .reg-terms a:hover { text-decoration: underline; }

        /* Bottom link */
        .reg-signin { text-align: center; font-size: 14px; color: #6b8c77; }
        .reg-signin a {
          color: #2d6a4f; font-weight: 700; text-decoration: none; margin-left: 4px;
        }
        .reg-signin a:hover { text-decoration: underline; }
      `}</style>

      <div className="reg-root">

        {/* ══ LEFT ══════════════════════════════════════════════════════════ */}
        <div className="reg-left">
          <div className="reg-left-orb orb-a" />
          <div className="reg-left-orb orb-b" />
          <div className="reg-left-grid" />

          <div className="reg-left-content">
            <div className="reg-brand">
              <div className="reg-brand-icon">
                <Leaf size={22} color="#fff" strokeWidth={1.8} />
              </div>
              <span className="reg-brand-name">Penchic Farm</span>
            </div>

            <h1 className="reg-left-headline">
              Join the<br />farm-fresh<br /><em>community.</em>
            </h1>
            <p className="reg-left-sub">
              Create your account and enjoy the freshest produce delivered straight from our farm to your door.
            </p>

            <div className="reg-perks">
              {[
                { icon: '🌿', title: 'Fresh daily harvests', desc: 'Products picked and packed the same day' },
                { icon: '🚚', title: 'Fast local delivery',  desc: 'Same-day delivery available in your area' },
                { icon: '🎁', title: 'Members-only rewards', desc: 'Earn points on every purchase'            },
              ].map(p => (
                <div className="reg-perk" key={p.title}>
                  <div className="reg-perk-dot">{p.icon}</div>
                  <div>
                    <div className="reg-perk-title">{p.title}</div>
                    <div className="reg-perk-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reg-left-footer">© {new Date().getFullYear()} Penchic Farm. All rights reserved.</div>
        </div>

        {/* ══ RIGHT ═════════════════════════════════════════════════════════ */}
        <div className="reg-right">
          <div className="reg-form-wrap">

            {/* Mobile brand */}
            <div className="reg-mobile-brand">
              <div className="reg-mobile-brand-icon">
                <Leaf size={18} color="#2d6a4f" strokeWidth={1.8} />
              </div>
              <span className="reg-mobile-brand-name">Penchic Farm</span>
            </div>

            <div className="reg-eyebrow">
              <div className="reg-eyebrow-bar" />
              <span className="reg-eyebrow-text">Create account</span>
            </div>
            <h2 className="reg-title">Start your<br />fresh journey</h2>
            <p className="reg-subtitle">Sign up in seconds with a social account or email.</p>

            {/* ── Social ── */}
            <div className="social-grid">
              <button
                className="social-btn"
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
                type="button"
              >
                {socialLoading === 'google' ? (
                  <div className="spin" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: '#555' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                <span>Google</span>
              </button>

              <button
                className="social-btn"
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading || loading}
                type="button"
              >
                {socialLoading === 'apple' ? (
                  <div className="spin" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: '#555' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.18.73.96-.02 2.78-1.03 4.36-.7 1.49.3 2.57.85 3.31 1.97-3.02 1.8-2.33 5.8.34 6.88-.57 1.43-1.28 2.87-2.19 4zm-3.13-17.1c.15 1.96-1.57 3.7-3.56 3.56-.25-1.87 1.73-3.72 3.56-3.56z"/>
                  </svg>
                )}
                <span>Apple</span>
              </button>
            </div>

            <div className="reg-divider">
              <div className="reg-divider-line" />
              <span className="reg-divider-label">or sign up with email</span>
              <div className="reg-divider-line" />
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="reg-error">
                  <div className="reg-error-dot" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-email">Email address</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon"><Mail size={16} /></span>
                  <input
                    id="reg-email" type="email" className="reg-input"
                    placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    required autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-password">Password</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon"><Lock size={16} /></span>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="reg-input reg-input-pr"
                    placeholder="Min. 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="new-password"
                  />
                  <button type="button" className="reg-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div className="strength-wrap">
                    <div className="strength-track">
                      <div className="strength-fill" style={{ width: `${strength * 25}%`, background: strengthColor }} />
                    </div>
                    <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-confirm">Confirm password</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon"><Lock size={16} /></span>
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="reg-input reg-input-pr"
                    placeholder="Repeat your password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required autoComplete="new-password"
                  />
                  <button type="button" className="reg-eye" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="match-row" style={{ color: confirmPassword === password ? '#22c55e' : '#ef4444' }}>
                    {confirmPassword === password
                      ? <><Check size={12} /> Passwords match</>
                      : <><span style={{ fontWeight: 800 }}>✕</span> Passwords don't match</>}
                  </div>
                )}
              </div>

              <p className="reg-terms">
                By creating an account you agree to our{' '}
                <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
              </p>

              <button type="submit" className="reg-submit" disabled={loading || !!socialLoading}>
                {loading
                  ? <><div className="spin" />Creating account…</>
                  : <>Create account <ArrowRight size={15} /></>}
              </button>

              <p className="reg-signin">
                Already have an account?
                <Link to="/login">Sign in</Link>
              </p>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}
