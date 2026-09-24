import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../schemas/authSchema';
import { useUser } from '../../contexts/UserContext';
import { Lock, User, ShieldCheck, AlertCircle, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import companyLogo from '../../image/logo.png';
import { AuthBackgroundSlider } from './AuthBackgroundSlider';

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
    <div className="min-h-svh w-full bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-x-hidden overflow-y-auto selection:bg-amber-500/30">
      {/* ─── 5-Image Real Perfume Dynamic Slider in Background (2s interval) ─── */}
      <AuthBackgroundSlider />

      {/* ─── Centered Glassmorphic Login Card ─── */}
      <div className="w-full max-w-[400px] z-10 animate-in fade-in zoom-in-95 duration-500 flex flex-col py-4">

        {/* Logo Section */}
        <div className="text-center mb-5">
          <div className="inline-flex p-2.5 bg-white/95 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] mb-2 group hover:scale-105 transition-transform duration-300 border border-white/20">
            <img src={companyLogo} alt="Maidan Perfume Shop Logo" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>
          <p className="text-amber-400 font-black tracking-[0.18em] uppercase text-[9.5px] drop-shadow-lg">
            Maidan Perfume Shop &bull; Admin Portal
          </p>
        </div>

        {/* Glass Card */}
        <div className="w-full bg-slate-950/85 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 relative border border-slate-700/80 flex flex-col text-white">

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-b-full shadow-[0_0_15px_rgba(245,158,11,0.9)]"></div>

          <div className="mb-5 text-center">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Admin Sign In</h2>
            <p className="text-slate-400 text-xs font-medium mt-0.5">Super Admin &amp; Shop Admin Login</p>
          </div>

          {(error || Object.keys(errors).length > 0) && (
            <div className="p-3 mb-4 bg-rose-500/15 border border-rose-500/30 rounded-xl flex flex-col gap-1 text-rose-300 text-xs font-bold">
              {error && <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />{error}</div>}
              {Object.values(errors).map((err, idx) => (
                <div key={idx} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />{err.message}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 w-full">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-1">Username or Email</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    {...register('username')}
                    type="text"
                    placeholder="hayaserishopadmin@gmail.com"
                    className={`w-full bg-slate-900/90 border ${errors.username ? 'border-rose-500/60' : 'border-slate-700/80'} focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none transition-all placeholder:text-slate-500`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full bg-slate-900/90 border ${errors.password ? 'border-rose-500/60' : 'border-slate-700/80'} focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-11 text-xs font-bold text-white outline-none transition-all placeholder:text-slate-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer border-b-2 border-amber-800"
            >
              {isSubmitting ? "Verifying..." : "Sign In to Dashboard"}
            </button>
          </form>

          {/* Customer Portal Link */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Are you a Customer?
            </p>
            <Link
              to="/shop"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Customer Register &amp; Shop
            </Link>
          </div>

          {/* Secure Footer */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
              Protected &bull; Real-time Multi-tenant System
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}