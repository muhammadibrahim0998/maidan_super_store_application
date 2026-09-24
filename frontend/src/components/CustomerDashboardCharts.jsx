import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Truck,
  Activity,
  Award,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Eye,
  Tag,
  Play,
  Pause
} from 'lucide-react';

// ─── 1. TOP 3D 2-SECOND DYNAMIC PRODUCT SLIDER COMPONENT ──────────────────────
export function ProductHeroSlider({
  products = [],
  currency = 'RS',
  onSelectProduct,
  onAddToCart
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!products || products.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % products.length);
    }, 2000); // 2 seconds

    return () => clearInterval(interval);
  }, [products, isPaused]);

  const nextSlide = () => {
    if (products.length > 0) {
      setCurrentSlide(prev => (prev + 1) % products.length);
    }
  };

  const prevSlide = () => {
    if (products.length > 0) {
      setCurrentSlide(prev => (prev - 1 + products.length) % products.length);
    }
  };

  if (!products || products.length === 0) return null;
  const activeProduct = products[currentSlide] || products[0];
  if (!activeProduct) return null;

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative bg-gradient-to-br from-[#070e14] via-[#0c1822] to-[#04090e] border-2 border-emerald-500/30 hover:border-emerald-400/60 rounded-[2.25rem] sm:rounded-[2.75rem] p-4 sm:p-7 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.18),inset_0_1px_2px_rgba(255,255,255,0.15)] text-white overflow-hidden transition-all duration-500 mb-2"
    >
      {/* Top 2-Second Animated Neon Progress Bar Line */}
      {!isPaused && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-950/80 overflow-hidden z-20">
          <div 
            key={currentSlide}
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{
              animation: 'sliderProgress3D 2s linear forwards'
            }}
          />
        </div>
      )}

      {/* Background Ambient 3D Glow Orbs */}
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Slider Header with 3D Badges & Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-900/40 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] shrink-0">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent block">
                Featured Collection Showcase
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.4)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                2s Live Shift
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">
              Automated 3D carousel • All <span className="text-amber-300 font-bold">{products.length} Products</span> in store
            </p>
          </div>
        </div>

        {/* 3D Tactile Slider Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-amber-300 border border-amber-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]">
            {currentSlide + 1} / {products.length}
          </span>
          <button
            type="button"
            onClick={prevSlide}
            className="p-2.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-all cursor-pointer active:scale-90 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
            title="Previous Product"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-90 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] ${
              isPaused 
                ? 'bg-gradient-to-b from-amber-500/30 to-amber-900/40 text-amber-300 border-amber-500/50 shadow-amber-500/20' 
                : 'bg-gradient-to-b from-emerald-500/30 to-teal-900/40 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20'
            }`}
            title={isPaused ? 'Resume Auto-Play (2s)' : 'Pause Auto-Play'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="p-2.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-slate-950 font-black border border-emerald-400 transition-all cursor-pointer active:scale-90 shadow-[0_6px_16px_rgba(16,185,129,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]"
            title="Next Product"
          >
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Active Product Showcase Banner Body */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Col: 3D Product Stage / Showcase with 3D Depth Shadow & Metallic Border (5 cols) */}
        <div className="md:col-span-5 relative perspective-1000">
          <div className="relative p-1.5 sm:p-2 rounded-[2.25rem] bg-gradient-to-br from-emerald-400/50 via-amber-300/30 to-teal-500/40 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.9),0_12px_25px_rgba(16,185,129,0.35),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.9)] transition-all duration-500 group">
            <div className="relative w-full h-64 sm:h-72 rounded-[1.85rem] overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a1219] to-black border border-white/10 shadow-inner flex items-center justify-center">
              <div className="absolute w-44 h-44 rounded-full bg-emerald-500/25 blur-2xl animate-pulse pointer-events-none" />
              <div className="absolute bottom-2 w-3/4 h-8 bg-black/60 rounded-full blur-md" />

              <img
                key={activeProduct._id || currentSlide}
                src={activeProduct.images?.[0] || '/perfume.png'}
                alt={activeProduct.name}
                className="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{
                  animation: 'product3DFlipZoom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80';
                }}
              />

              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 animate-shine-sweep" />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 opacity-70 pointer-events-none z-10" />

              <div className="absolute top-3 left-3 z-20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-950/85 text-amber-300 border border-amber-400/40 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  {activeProduct.category || 'Perfumes'}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] ${
                  Number(activeProduct.stock || 0) > 0
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-emerald-950/50'
                    : 'bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-rose-950/50'
                }`}>
                  {Number(activeProduct.stock || 0) > 0 ? `● In Stock (${Number(activeProduct.stock).toLocaleString()} Units)` : '● Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: 3D Product Details, Neon Price & 3D Interactive Buttons (7 cols) */}
        <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
          <div 
            key={`info-${activeProduct._id || currentSlide}`}
            style={{
              animation: 'textSlideUp3D 0.4s ease-out forwards'
            }}
            className="space-y-2"
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Item #{currentSlide + 1}
              </span>
              <span>•</span>
              <span>Exclusive Formula</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight line-clamp-1 drop-shadow-md" title={activeProduct.name}>
              {(activeProduct.name || 'Perfume Product').replace(/\(Egg\)/gi, '').replace(/\bEgg\b/gi, 'Product')}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300/90 font-medium leading-relaxed line-clamp-2">
              {activeProduct.description || 'Premium long-lasting luxury fragrance, crafted with natural oils and exceptional scent notes for all occasions.'}
            </p>
          </div>

          {/* 3D Glassmorphic Price & Action Panel */}
          <div className="bg-gradient-to-r from-slate-950/90 via-[#0a141d]/90 to-slate-950/90 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Catalog Price
              </span>
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(16,185,129,0.5)] tracking-tight">
                {currency} {Number(activeProduct.price || 0).toLocaleString('en-PK')}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {onSelectProduct && (
                <button
                  type="button"
                  onClick={() => onSelectProduct(activeProduct)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-600/80 text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:translate-y-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                >
                  <Eye className="w-4 h-4 text-slate-300" />
                  <span>Details</span>
                </button>
              )}

              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(activeProduct)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-[0_12px_28px_rgba(16,185,129,0.5),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)] active:translate-y-0.5 active:shadow-[0_4px_10px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Add to Cart</span>
                </button>
              )}
            </div>
          </div>

          {/* 3D Slider Dots Navigation Bar */}
          <div className="p-2 bg-slate-950/80 rounded-2xl border border-slate-800/90 shadow-inner flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {products.map((p, i) => (
              <button
                key={p._id || i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === i 
                    ? 'w-10 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 shadow-[0_0_12px_rgba(16,185,129,0.9)] ring-2 ring-emerald-400/40' 
                    : 'w-2.5 bg-slate-700/80 hover:bg-slate-500'
                }`}
                title={`Slide ${i + 1}: ${p.name || 'Product'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sliderProgress3D {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes product3DFlipZoom {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(10px) rotateY(-8deg);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0px) rotateY(0deg);
            filter: blur(0px);
          }
        }
        @keyframes textSlideUp3D {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shineSweep {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          30%, 100% {
            transform: translateX(250%) skewX(-20deg);
          }
        }
        .animate-shine-sweep {
          animation: shineSweep 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ─── 2. CUSTOMER DASHBOARD CHARTS & ANALYTICS (DISPLAYED AT THE VERY BOTTOM) ───
export function CustomerDashboardCharts({
  customer = {},
  history = [],
  products = [],
  totalSpent = 0,
  ordersCount = 0,
  currency = 'RS'
}) {
  const [timeframe, setTimeframe] = useState('ALL'); // '30D' | '90D' | 'ALL'
  const [activePoint, setActivePoint] = useState(null);

  // ─── 1. Dynamic Spending & Orders Trend Over Time ────────────────────────
  const trendData = useMemo(() => {
    const now = new Date();
    const is30D = timeframe === '30D';
    const is90D = timeframe === '90D';
    const daysCount = is30D ? 30 : is90D ? 90 : 12; // 12 months for ALL

    if (timeframe === 'ALL') {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-PK', { month: 'short' });
        months.push({ key, label, spent: 0, orders: 0, items: [] });
      }

      const monthMap = new Map(months.map(m => [m.key, m]));

      (history || []).forEach(item => {
        const d = new Date(item.date || Date.now());
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const entry = monthMap.get(key);
        if (entry) {
          entry.spent += Number(item.amount) || 0;
          entry.orders += 1;
          if (item.items) entry.items.push(item.items);
        }
      });

      const maxSpent = Math.max(...months.map(m => m.spent), 1000);
      return { data: months, maxSpent, isMonthly: true };
    } else {
      const days = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
        days.push({ key, label, spent: 0, orders: 0, items: [] });
      }

      const dayMap = new Map(days.map(d => [d.key, d]));

      (history || []).forEach(item => {
        const d = new Date(item.date || Date.now());
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().split('T')[0];
        const entry = dayMap.get(key);
        if (entry) {
          entry.spent += Number(item.amount) || 0;
          entry.orders += 1;
          if (item.items) entry.items.push(item.items);
        }
      });

      const maxSpent = Math.max(...days.map(d => d.spent), 1000);
      return { data: days, maxSpent, isMonthly: false };
    }
  }, [history, timeframe]);

  // ─── 2. Category & Product Purchases Breakdown ─────────────────────────
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    let totalItemsPurchased = 0;

    (history || []).forEach(h => {
      const itemsStr = h.items || '';
      const parts = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        const cleanName = p.replace(/\(\d+\)/g, '').replace(/\(Product\)/gi, '').trim() || 'Perfume Product';
        counts[cleanName] = (counts[cleanName] || 0) + 1;
        totalItemsPurchased++;
      });
    });

    const entries = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalItemsPurchased > 0 ? Math.round((count / totalItemsPurchased) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      entries: entries.slice(0, 5),
      totalItemsPurchased
    };
  }, [history]);

  // ─── 3. SVG Path calculations for Smooth Curved Chart ───────────────────
  const chartPoints = useMemo(() => {
    const width = 600;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 25, left: 30 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const itemsList = trendData.data;
    if (itemsList.length === 0) return { path: '', area: '', points: [] };

    const maxVal = trendData.maxSpent;
    const stepX = innerWidth / (itemsList.length - 1 || 1);

    const points = itemsList.map((item, idx) => {
      const x = padding.left + (idx * stepX);
      const ratio = item.spent / maxVal;
      const y = padding.top + innerHeight - (ratio * innerHeight);
      return { x, y, ...item };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX1 = current.x + (next.x - current.x) / 2;
      const controlY1 = current.y;
      const controlX2 = current.x + (next.x - current.x) / 2;
      const controlY2 = next.y;
      path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }

    const baselineY = padding.top + innerHeight;
    const area = `${path} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { path, area, points, width, height, padding, innerHeight };
  }, [trendData]);

  const avgOrderValue = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pt-2">

      {/* ─── Top Stats Row: Spending Metrics & Loyalty Level ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Shopping Velocity */}
        <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total Shopping Value
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Real-Time
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-2xl font-black tracking-tight text-white">
              {currency} {Number(totalSpent || 0).toLocaleString('en-PK')}
            </h4>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              Cumulative lifetime purchases across all orders
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Avg Order Spend:</span>
            <span className="text-emerald-400 font-black">{currency} {avgOrderValue.toLocaleString('en-PK')}</span>
          </div>
        </div>

        {/* Card 2: Orders Activity */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Orders Completed
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {ordersCount} Orders
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-2xl font-black tracking-tight text-slate-900">
              {ordersCount} <span className="text-sm text-slate-500 font-bold">Total Orders</span>
            </h4>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              Verified orders recorded in your account
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
            <span>Customer Status:</span>
            <span className="text-blue-600 font-black flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Registered Member
            </span>
          </div>
        </div>

        {/* Card 3: VIP Loyalty Tier Badge */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" /> Loyalty Tier
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              {totalSpent > 100000 ? '👑 Platinum' : totalSpent > 30000 ? '⭐ Gold VIP' : '✨ Silver Member'}
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-lg font-black tracking-tight text-slate-900">
              {totalSpent > 100000 ? 'Platinum VIP Patron' : totalSpent > 30000 ? 'Gold VIP Member' : 'Valued Customer'}
            </h4>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              {customer?.fullName || customer?.name || 'Customer Account'}
            </p>
          </div>
          <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
            <span>Discount Tier:</span>
            <span className="text-amber-700 font-black">Standard VIP Pricing</span>
          </div>
        </div>
      </div>

      {/* ─── Main Charts Section: 2 Column Layout (Dynamic Curve Chart + Product Breakdown) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Dynamic Purchases & Spending Curve Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Purchases &amp; Spending Curve</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Dynamic visual breakdown of spending history over time
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 self-start sm:self-auto">
              {[
                { id: '30D', label: '30 Days' },
                { id: '90D', label: '90 Days' },
                { id: 'ALL', label: 'All-Time' },
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setTimeframe(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    timeframe === btn.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Dynamic Area Chart */}
          <div className="relative w-full overflow-hidden pt-2">
            <svg
              viewBox={`0 0 ${chartPoints.width || 600} ${chartPoints.height || 180}`}
              className="w-full h-44 sm:h-48 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="customerSpendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <filter id="customerGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = 20 + 135 * (1 - ratio);
                return (
                  <g key={i}>
                    <line
                      x1="30"
                      y1={y}
                      x2="580"
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="25"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {ratio === 0 ? '0' : `${Math.round((trendData.maxSpent * ratio) / 1000)}k`}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              {chartPoints.area && (
                <path
                  d={chartPoints.area}
                  fill="url(#customerSpendingGrad)"
                />
              )}

              {/* Line path */}
              {chartPoints.path && (
                <path
                  d={chartPoints.path}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Points */}
              {chartPoints.points.map((p, idx) => (
                <g key={idx} className="cursor-pointer">
                  {activePoint?.key === p.key && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill="#10b981"
                      fillOpacity="0.25"
                      className="animate-ping"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={activePoint?.key === p.key ? 5.5 : p.spent > 0 ? 4 : 2}
                    fill={p.spent > 0 ? '#059669' : '#cbd5e1'}
                    stroke="#ffffff"
                    strokeWidth={p.spent > 0 ? 2 : 1}
                    onMouseEnter={() => setActivePoint(p)}
                    onMouseLeave={() => setActivePoint(null)}
                  />
                  {(idx === 0 || idx === Math.floor(chartPoints.points.length / 2) || idx === chartPoints.points.length - 1) && (
                    <text
                      x={p.x}
                      y="172"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {activePoint && (
              <div
                className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none z-10"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[10px] uppercase">
                  <Calendar className="w-3 h-3" />
                  <span>{activePoint.label}</span>
                </div>
                <div className="font-black text-sm text-white mt-1">
                  {currency} {Number(activePoint.spent || 0).toLocaleString('en-PK')}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  {activePoint.orders} {activePoint.orders === 1 ? 'Order' : 'Orders'} Placed
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Highest Spending Period:</span>
            </span>
            <span className="text-emerald-700 font-black">
              {currency} {trendData.maxSpent.toLocaleString('en-PK')}
            </span>
          </div>
        </div>

        {/* Right 1 Col: Top Purchased Perfumes Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <PieChart className="w-4 h-4 text-amber-600" />
              <span>Top Purchased Products</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              Your favorite fragrances based on past purchase frequency
            </p>
          </div>

          <div className="space-y-2.5 my-2">
            {categoryBreakdown.entries.length > 0 ? (
              categoryBreakdown.entries.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-slate-800 truncate uppercase max-w-[140px]">
                      {item.name}
                    </span>
                    <span className="font-black text-emerald-600">
                      {item.count} {item.count === 1 ? 'Order' : 'Orders'} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-amber-500' : idx === 2 ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.max(item.percentage, 15)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p className="text-xs font-bold">No purchase logs yet</p>
                <p className="text-[10px] mt-0.5">Place an order to see your personalized product breakdown</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[9.5px] text-slate-600 font-bold flex items-center gap-2">
            <span className="text-base">🛍️</span>
            <span>All your order products are automatically analyzed in real-time.</span>
          </div>
        </div>
      </div>

      {/* ─── Recent Purchases / Orders Dynamic Feed ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Recent Purchase &amp; Order Activity
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">
                Live order records matching your customer profile
              </p>
            </div>
          </div>
          <span className="text-[9.5px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {history.length} Transactions
          </span>
        </div>

        <div className="space-y-2">
          {history.length > 0 ? (
            history.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/70 transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-[10px] shrink-0 border border-emerald-200">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 uppercase text-[11px]">
                      {item.items || 'Perfume Products'}
                    </p>
                    <div className="flex items-center gap-2 text-[9.5px] text-slate-500 font-bold mt-0.5">
                      <span>{new Date(item.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-black uppercase">{item.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-600 text-sm block">
                    {currency} {Number(item.amount || 0).toLocaleString('en-PK')}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600/80 uppercase">
                    Paid &amp; Recorded
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-bold">
              No recent purchases recorded for this customer account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboardCharts;
