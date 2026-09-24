import React, { useState, useEffect } from 'react';

// 5 Ultra-HD 4K Crystal Clear Luxury Perfume Wallpapers (100% Sharp, Zero Pixelation)
const ULTRA_HD_PERFUME_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=2560&q=100',
    title: 'Super Perfume Special',
    category: 'China Perfume',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=2560&q=100',
    title: 'Ajwa Perfume',
    category: 'Signature Essence',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=2560&q=100',
    title: 'China Perfume',
    category: 'Imported Scents',
    price: 60000
  },
  {
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2560&q=100',
    title: 'KSA Perfume',
    category: 'Arabian Oud',
    price: 70000
  },
  {
    url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=2560&q=100',
    title: 'Super Perfume Deluxe',
    category: 'Ajwa Perfume',
    price: 7000
  }
];

export function AuthBackgroundSlider() {
  const [slides, setSlides] = useState(ULTRA_HD_PERFUME_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Fetch dynamic products and pair with Ultra-HD 4K imagery to guarantee 100% crisp sharpness
  useEffect(() => {
    let isMounted = true;

    const fetchProductImages = async () => {
      try {
        const res = await fetch('/api/items/public/showcase');
        const data = await res.json();
        if (isMounted && data?.success && Array.isArray(data.images) && data.images.length > 0) {
          // Map dynamic item names & prices onto 4K crystal-clear HD wallpaper streams
          const mapped = ULTRA_HD_PERFUME_IMAGES.map((fallback, idx) => {
            const dbItem = data.images[idx] || data.images[0];
            return {
              url: fallback.url,
              title: dbItem.title || fallback.title,
              category: dbItem.category || fallback.category,
              price: dbItem.price || fallback.price
            };
          });
          setSlides(mapped);
        }
      } catch (err) {
        console.warn('Showcase fetch error:', err);
      }
    };

    fetchProductImages();

    // Preload 4K images for instant seamless display
    ULTRA_HD_PERFUME_IMAGES.forEach((item) => {
      const img = new Image();
      img.src = item.url;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Change image every 2 seconds (2000ms)
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [slides]);

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none bg-slate-950">
      {/* ─── 100% Crystal Clear 4K Ultra-HD Full-Screen Perfume Slider (No Pixelation, 100% Pure Clarity) ─── */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.url + index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={slide.url}
              alt={slide.title || 'Perfume'}
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
          </div>
        );
      })}

      {/* ─── Live Dynamic Product Badge on Top Right ─── */}
      {currentSlide && (
        <div className="absolute top-6 right-6 z-30 hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/20 text-white shadow-2xl animate-in fade-in duration-500">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 truncate max-w-[200px]">
              {currentSlide.title || 'Perfume Product'}
            </p>
            {currentSlide.price ? (
              <p className="text-[10px] font-bold text-slate-200">
                Rs. {Number(currentSlide.price).toLocaleString('en-PK')} {currentSlide.category ? `• ${currentSlide.category}` : ''}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── 5-Dot Dynamic Slide Indicators at Bottom ─── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/20 shadow-lg">
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentIndex
                ? 'w-6 bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
