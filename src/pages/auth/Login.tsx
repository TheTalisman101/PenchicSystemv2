import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Leaf } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profileError) throw new Error('Error fetching profile. Please try again.');
        if (!profile) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles').insert([{ id: user.id, email: user.email, role: 'customer' }])
            .select('role').maybeSingle();
          if (insertError || !newProfile) throw new Error('Error creating profile. Please contact support.');
          setUser({ id: user.id, email: user.email!, role: newProfile.role });
          navigate('/');
        } else {
          setUser({ id: user.id, email: user.email!, role: profile.role });
          if (profile.role === 'admin') navigate('/admin');
          else if (profile.role === 'worker') navigate('/pos');
          else navigate('/');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      await supabase.auth.signOut();
      setUser(null);
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
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social login failed');
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --primary: #2d6a4f;
          --primary-light: #40916c;
          --primary-dark: #1b4332;
          --accent: #74c69d;
          --accent-light: #b7e4c7;
          --bg: #f8faf9;
          --panel: #ffffff;
          --text: #1a2e22;
          --muted: #6b8c77;
          --border: #d4e8db;
        }

        .auth-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          overflow: hidden;
        }

        /* ── Left decorative panel ── */
        .auth-panel-left {
          display: none;
          position: relative;
          flex: 1;
          background: linear-gradient(145deg, var(--primary-dark) 0%, var(--primary) 50%, var(--primary-light) 100%);
          overflow: hidden;
        }
        @media (min-width: 900px) { .auth-panel-left { display: flex; flex-direction: column; justify-content: center; padding: 60px; } }

        .panel-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.25;
        }
        .orb1 { width: 400px; height: 400px; background: var(--accent); top: -100px; right: -100px; }
        .orb2 { width: 300px; height: 300px; background: #95d5b2; bottom: -50px; left: -80px; }
        .orb3 { width: 200px; height: 200px; background: #fff; top: 50%; left: 40%; opacity: 0.08; }

        .panel-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .panel-content { position: relative; z-index: 1; }

        .panel-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 64px;
        }
        .panel-logo-icon {
          width: 44px; height: 44px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .panel-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.5px;
        }

        .panel-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 3.5vw, 48px);
          font-weight: 700;
          color: #fff;
          line-height: 1.15;
          margin-bottom: 20px;
        }
        .panel-headline span { color: var(--accent-light); }

        .panel-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.65);
          line-height: 1.7;
          max-width: 340px;
          margin-bottom: 56px;
        }

        .panel-pills {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 100px;
          padding: 10px 18px;
          width: fit-content;
          backdrop-filter: blur(8px);
        }
        .pill-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
        .pill-text { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500; }

        /* ── Right form panel ── */
        .auth-panel-right {
          flex: 0 0 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          overflow-y: auto;
        }
        @media (min-width: 900px) { .auth-panel-right { flex: 0 0 460px; } }

        .auth-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .form-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
        }
        .form-eyebrow-line {
          height: 2px; width: 28px;
          background: var(--primary);
          border-radius: 2px;
        }
        .form-eyebrow-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--primary);
        }

        .form-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 36px;
          line-height: 1.6;
        }

        /* Social buttons */
        .social-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          background: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .social-btn:hover {
          border-color: var(--primary);
          background: #f0f7f3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(45,106,79,0.12);
        }
        .social-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .social-btn svg { flex-shrink: 0; }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .divider-line { flex: 1; height: 1px; background: var(--border); }
        .divider-text { font-size: 12px; color: var(--muted); font-weight: 500; white-space: nowrap; }

        /* Form fields */
        .field { margin-bottom: 18px; }
        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 7px;
          letter-spacing: 0.2px;
        }
        .field-wrap {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
          width: 16px; height: 16px;
        }
        .field-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          background: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: var(--text);
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .field-input::placeholder { color: #a8c4b0; }
        .field-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(45,106,79,0.1);
        }
        .field-input-pr { padding-right: 44px; }

        .toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.2s;
        }
        .toggle-btn:hover { color: var(--primary); }

        .field-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .forgot-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
        }
        .forgot-link:hover { color: var(--primary-dark); text-decoration: underline; }

        /* Error */
        .error-box {
          background: #fff0f0;
          border: 1.5px solid #fca5a5;
          color: #b91c1c;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 18px;
          line-height: 1.5;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-bottom: 24px;
          letter-spacing: 0.3px;
          position: relative;
          overflow: hidden;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .submit-btn:hover::before { background: rgba(255,255,255,0.08); }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,106,79,0.35); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bottom-link {
          text-align: center;
          font-size: 14px;
          color: var(--muted);
        }
        .bottom-link a {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }
        .bottom-link a:hover { text-decoration: underline; }

        /* Forgot password overlay */
        .forgot-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        .forgot-card {
          background: white;
          border-radius: 20px;
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.2);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }

        .forgot-close {
          position: absolute;
          top: 16px; right: 16px;
          background: var(--bg);
          border: none;
          border-radius: 8px;
          width: 32px; height: 32px;
          cursor: pointer;
          font-size: 18px;
          color: var(--muted);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .forgot-close:hover { background: var(--border); }

        .success-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, var(--accent-light), var(--accent));
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          font-size: 24px;
        }
      `}</style>

      <div className="auth-root">
        {/* ── Left Panel ── */}
        <div className="auth-panel-left">
          <div className="panel-orb orb1" />
          <div className="panel-orb orb2" />
          <div className="panel-orb orb3" />
          <div className="panel-grid" />
          <div className="panel-content">
            <div className="panel-logo">
              <div className="panel-logo-icon">
                <Leaf size={22} color="white" />
              </div>
              <span className="panel-logo-text">Penchic Farm</span>
            </div>
            <h1 className="panel-headline">
              Welcome<br />back to<br /><span>fresh living.</span>
            </h1>
            <p className="panel-sub">
              Sign in to access your account, track orders, and enjoy exclusive farm-fresh deals.
            </p>
            <div className="panel-pills">
              <div className="pill"><div className="pill-dot" /><span className="pill-text">Farm-fresh products daily</span></div>
              <div className="pill"><div className="pill-dot" /><span className="pill-text">Secure & fast checkout</span></div>
              <div className="pill"><div className="pill-dot" /><span className="pill-text">Loyalty rewards on every order</span></div>
            </div>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="auth-panel-right">
          <div className="auth-form-wrap">
            <div className="form-eyebrow">
              <div className="form-eyebrow-line" />
              <span className="form-eyebrow-text">Sign In</span>
            </div>
            <h2 className="form-title">Good to see<br />you again</h2>
            <p className="form-subtitle">Enter your credentials or continue with a social account.</p>

            {/* Social Buttons */}
            <div className="social-row">
              <button
                className="social-btn"
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'google' ? <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#333' }} /> : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                Google
              </button>
              <button
                className="social-btn"
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'apple' ? <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#333' }} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.18.73.96-.02 2.78-1.03 4.36-.7 1.49.3 2.57.85 3.31 1.97-3.02 1.8-2.33 5.8.34 6.88-.57 1.43-1.28 2.87-2.19 4zm-3.13-17.1c.15 1.96-1.57 3.7-3.56 3.56-.25-1.87 1.73-3.72 3.56-3.56z"/>
                  </svg>
                )}
                Apple
              </button>
            </div>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or continue with email</span>
              <div className="divider-line" />
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="error-box">{error}</div>}

              <div className="field">
                <label className="field-label" htmlFor="email">Email address</label>
                <div className="field-wrap">
                  <Mail className="field-icon" />
                  <input
                    id="email"
                    type="email"
                    className="field-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label className="field-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                  <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>Forgot password?</button>
                </div>
                <div className="field-wrap">
                  <Lock className="field-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="field-input field-input-pr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><div className="spinner" /> Signing in...</> : <>Sign in <ArrowRight size={16} /></>}
              </button>

              <p className="bottom-link">
                Don't have an account?
                <a href="/register">Create one</a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div className="forgot-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setForgotError(null); } }}>
          <div className="forgot-card" style={{ position: 'relative' }}>
            <button className="forgot-close" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setForgotError(null); }}>✕</button>
            {forgotSent ? (
              <div style={{ textAlign: 'center' }}>
                <div className="success-icon">✉️</div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: 'var(--text)', marginBottom: '10px' }}>Check your inbox</h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                  We've sent a password reset link to <strong>{forgotEmail}</strong>. Check your spam folder if you don't see it.
                </p>
                <button className="submit-btn" style={{ marginBottom: 0 }} onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text)', marginBottom: '8px' }}>Reset password</h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '28px' }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotPassword}>
                  {forgotError && <div className="error-box">{forgotError}</div>}
                  <div className="field">
                    <label className="field-label" htmlFor="forgot-email">Email address</label>
                    <div className="field-wrap">
                      <Mail className="field-icon" />
                      <input
                        id="forgot-email"
                        type="email"
                        className="field-input"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit-btn" disabled={forgotLoading} style={{ marginBottom: 0 }}>
                    {forgotLoading ? <><div className="spinner" /> Sending...</> : <>Send reset link <ArrowRight size={16} /></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}