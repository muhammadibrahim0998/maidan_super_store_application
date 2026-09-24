import React, { useState, useEffect } from 'react';
import { Sparkles, Tag, ShoppingBag } from 'lucide-react';

const DEFAULT_PERFUMES = [
  {
    url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85',
    title: 'Luxury Perfume Collection',
    category: 'Premium Fragrance',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
    title: 'Ajwa Perfume',
    category: 'Signature Essence',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85',
    title: 'China Perfume',
    category: 'Imported Scents',
    price: 60000
  },
  {
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85',
    title: 'KSA Perfume',
    category: 'Arabian Oud',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1200&q=85',
    title: 'Super Perfume Special',
    category: 'Best Sellers',
    price: 7000
  }
];

export function AuthProductSliderPanel() {
  const [slides, setSlides] = useState(DEFAULT_PERFUMES);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Fetch dynamic products from backend MongoDB
  useEffect(() => {
    let isMounted = true;
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/items/public/showcase');
        const data = await res.json();
        if (isMounted && data?.success && Array.isArray(data.images) && data.images.length > 0) {
          setSlides(data.images);
          data.images.forEach(img => {
            if (img.url) {
              const i = new Image();
              i.src = img.url;
            }
          });
        }
      } catch (e) {
        console.warn('Showcase fetch error:', e);
      }
    };
    fetchImages();
    return () => { isMounted = false; };
  }, []);

  // 2. 2-second automatic slide transition
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [slides]);

  const current = slides[currentIndex] || slides[0];

  return (
    <div className="relative w-full h-full min-h-[320px] lg:min-h-[580px] bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 p-6 sm:p-8 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
      {/* Background Ambient Spotlights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Tag */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          Featured Perfumes
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {currentIndex + 1} / {slides.length}
        </span>
      </div>

      {/* Center Perfume Bottle Showcase with Exact Aspect Ratio (Clear & Perfectly Sized) */}
      <div className="relative z-10 my-auto py-4 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[280px] sm:max-w-[340px] h-[240px] sm:h-[300px] flex items-center justify-center">
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={slide.url + idx}
                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                  isActive
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                }`}
              >
                <div className="relative p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                  <img
                    src={slide.url}
                    alt={slide.title || 'Perfume'}
                    className="max-h-[210px] sm:max-h-[260px] w-auto max-w-full object-contain rounded-xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Product Info Details */}
        {current && (
          <div className="text-center mt-3 space-y-1 animate-in fade-in duration-300">
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center justify-center gap-1.5">
              <span>{current.title || 'Luxury Perfume'}</span>
            </h3>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {current.category && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  {current.category}
                </span>
              )}
              {current.price ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-black tracking-wide">
                  Rs. {Number(current.price).toLocaleString('en-PK')}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Slider Progress Indicators */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
              idx === currentIndex
                ? 'w-7 bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                : 'w-2 bg-slate-700 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
