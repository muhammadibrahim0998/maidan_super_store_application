import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../schemas/authSchema';
import { useUser } from '../../contexts/UserContext';
import { Lock, User, ShieldCheck, AlertCircle, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import companyLogo from '../../image/logo.png';

export function LoginView() {
  const { login } = useUser();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (data) => {
    setError('');
    try {
      await login(data.username, data.password);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    }
  };

  return (
    /* Changed to min-h-svh for better mobile/small screen height handling */
    <div className="min-h-svh w-full bg-background grid place-items-center p-4 selection:bg-primary/20 relative overflow-x-hidden overflow-y-auto">

      <div className="w-full max-w-[360px] z-10 animate-in fade-in zoom-in-95 duration-700 flex flex-col py-4">

        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2 bg-white rounded-2xl shadow-premium mb-3 group hover:scale-105 transition-transform duration-500 border border-[var(--color-border-subtle)]">
            <img src={companyLogo} alt="Maidan Perfume Shop Logo" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>
          <p className="text-[var(--color-text-muted)] font-bold tracking-[0.12em] uppercase text-[8px] mt-2 opacity-70">
            Maidan Perfume Shop - Inventory Management
          </p>
        </div>

        {/* Compact Card - Reduced padding from p-10 to p-7 */}
        <div className="w-full bg-[var(--color-surface-card)] rounded-xl shadow-premium p-7 relative border border-[var(--color-border-subtle)] flex flex-col">

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[var(--color-primary)] rounded-b-full"></div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">Admin Login</h2>
            <p className="text-[var(--color-text-secondary)] text-[11px] font-medium mt-0.5">Sign in to your session</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
            {(error || Object.keys(errors).length > 0) && (
              <div className="p-2.5 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-lg flex flex-col gap-1 text-[var(--color-danger)] text-[10px] font-bold">
                {error && <div className="flex items-center gap-2"><AlertCircle className="w-3 h-3" />{error}</div>}
                {Object.values(errors).map((err, idx) => (
                  <div key={idx} className="flex items-center gap-2"><AlertCircle className="w-3 h-3" />{err.message}</div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {/* Identification */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Email</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  <input
                    {...register('username')}
                    type="text"
                    placeholder="Username or Email"
                    className={`w-full bg-[var(--color-surface-base)]/50 border ${errors.username ? 'border-[var(--color-danger)]/40' : 'border-[var(--color-border-subtle)]'} focus:border-[var(--color-primary)]/40 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)]`}
                  />
                </div>
              </div>

              {/* Access Key */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  <input
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className={`w-full bg-[var(--color-surface-base)]/50 border ${errors.password ? 'border-[var(--color-danger)]/40' : 'border-[var(--color-border-subtle)]'} focus:border-[var(--color-primary)]/40 rounded-xl py-3 pl-11 pr-12 text-xs font-bold text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-premium active:scale-[0.97] transition-all disabled:opacity-50 mt-1"
            >
              {isSubmitting ? "Verifying..." : "Start Session"}
            </button>
          </form>

          {/* Customer Register / Login Portal Link */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] text-center">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
              Are you a Customer?
            </p>
            <Link
              to="/shop"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Customer Register & Shop
            </Link>
          </div>

          {/* Secure Footer - More compact */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3 text-[var(--color-primary)]/50" />
            <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-none">
              Nexus Engine v2.0
            </span>
          </div>
        </div>
      </div>

      {/* Background Blobs - Reduced opacity for cleaner look */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.05]">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-[var(--color-primary)]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}