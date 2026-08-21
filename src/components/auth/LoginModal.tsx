// ─────────────────────────────────────────────────────────────
// LoginModal — Google OAuth + Email/Password auth
// Three modes: sign-in, sign-up, forgot-password
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { X, Flame, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

type Mode = 'signin' | 'signup' | 'forgot';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

// Google logo SVG component
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, authLoading, authError, clearAuthError } = useAuthStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear state when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      clearAuthError();
      setSuccessMessage(null);
    }
  }, [open, clearAuthError]);

  useEffect(() => {
    clearAuthError();
    setSuccessMessage(null);
  }, [mode, clearAuthError]);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    // On success, the browser redirects away — we won't reach here
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await signInWithEmail(email, password);
    if (ok) onClose();
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { needsConfirmation } = await signUpWithEmail(email, password);
    if (needsConfirmation) {
      setSuccessMessage(`Check your inbox at ${email} for a confirmation link, then sign in.`);
    }
    // If no confirmation needed, onAuthStateChange fires and closes the modal naturally
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await resetPassword(email);
    if (ok) {
      setSuccessMessage(`Password reset link sent to ${email}. Check your inbox.`);
    }
  };

  const titles: Record<Mode, string> = {
    signin: 'Join the Hunt',
    signup: 'Create Account',
    forgot: 'Reset Password',
  };

  const subtitles: Record<Mode, string> = {
    signin: 'Sign in to track quests, share builds, and challenge the community.',
    signup: 'Create your hunter profile to get started.',
    forgot: 'Enter your email and we\'ll send you a reset link.',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl"
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-mh-slate-500 transition-colors hover:bg-mh-slate-800 hover:text-mh-slate-300"
        >
          <X size={16} />
        </button>

        <div className="p-7">
          {/* Back arrow for sub-modes */}
          {mode !== 'signin' && (
            <button
              onClick={() => setMode('signin')}
              className="mb-4 flex items-center gap-1.5 text-xs text-mh-slate-500 hover:text-mh-slate-300 transition-colors"
            >
              <ArrowLeft size={13} />
              Back to sign in
            </button>
          )}

          {/* Logo */}
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-mh-gold-500 to-mh-gold-700 glow-gold">
            <Flame size={24} className="text-mh-slate-900" />
          </div>

          {/* Title */}
          <h2 id="login-title" className="mb-1 text-center font-display text-xl font-bold text-mh-slate-100">
            {titles[mode]}
          </h2>
          <p className="mb-6 text-center text-sm text-mh-slate-500">
            {subtitles[mode]}
          </p>

          {/* Error banner */}
          {authError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{authError}</p>
            </div>
          )}

          {/* Success banner */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-400" />
              <p className="text-xs text-green-300">{successMessage}</p>
            </div>
          )}

          {/* ── Sign In mode ── */}
          {mode === 'signin' && (
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className={cn(
                  'flex w-full items-center justify-center gap-2.5 rounded-xl',
                  'border border-mh-slate-700 bg-mh-slate-800 px-4 py-2.5',
                  'text-sm font-semibold text-mh-slate-200',
                  'transition-all duration-200 hover:border-mh-gold-500/40 hover:bg-mh-slate-700 hover:text-white',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {authLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-mh-slate-800" />
                <span className="text-xs text-mh-slate-600">or</span>
                <div className="h-px flex-1 bg-mh-slate-800" />
              </div>

              {/* Email/password form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label htmlFor="signin-email" className="mb-1.5 block text-xs font-medium text-mh-slate-400">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hunter@example.com"
                    className={cn(
                      'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5',
                      'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                      'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
                    )}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="signin-password" className="text-xs font-medium text-mh-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-mh-slate-500 hover:text-mh-gold-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5 pr-10',
                        'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                        'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-mh-slate-600 hover:text-mh-slate-400"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl',
                    'bg-mh-gold-500 px-4 py-2.5 text-sm font-bold text-mh-slate-900',
                    'transition-all duration-200 hover:bg-mh-gold-400',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  {authLoading && <Loader2 size={15} className="animate-spin" />}
                  Sign in
                </button>
              </form>

              <p className="pt-1 text-center text-xs text-mh-slate-600">
                No account?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold text-mh-gold-500 hover:text-mh-gold-400 transition-colors">
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ── Sign Up mode ── */}
          {mode === 'signup' && !successMessage && (
            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <div>
                <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium text-mh-slate-400">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hunter@example.com"
                  className={cn(
                    'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5',
                    'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                    'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
                  )}
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium text-mh-slate-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={cn(
                      'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5 pr-10',
                      'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                      'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mh-slate-600 hover:text-mh-slate-400"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-mh-slate-600">
                  Your username will be set from your email — you can change it in Settings.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl',
                  'bg-mh-gold-500 px-4 py-2.5 text-sm font-bold text-mh-slate-900',
                  'transition-all duration-200 hover:bg-mh-gold-400',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {authLoading && <Loader2 size={15} className="animate-spin" />}
                Create account
              </button>

              <p className="pt-1 text-center text-xs text-mh-slate-600">
                Already a hunter?{' '}
                <button onClick={() => setMode('signin')} className="font-semibold text-mh-gold-500 hover:text-mh-gold-400 transition-colors">
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── Forgot Password mode ── */}
          {mode === 'forgot' && !successMessage && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium text-mh-slate-400">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hunter@example.com"
                  className={cn(
                    'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5',
                    'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                    'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl',
                  'bg-mh-gold-500 px-4 py-2.5 text-sm font-bold text-mh-slate-900',
                  'transition-all duration-200 hover:bg-mh-gold-400',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {authLoading && <Loader2 size={15} className="animate-spin" />}
                Send reset link
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
