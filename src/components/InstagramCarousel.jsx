import { useEffect, useRef, useState } from "react";

/**
 * InstagramCarousel
 * Auto-rotating, swipeable image carousel that links to Instagram
 */
export default function InstagramCarousel({
  images = [
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582582621959-48d09d4f01f9?q=80&w=1600&auto=format&fit=crop",
  ],
  instagramUrl = "https://instagram.com/devinmyagent",
  intervalMs = 3500,
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const timerRef = useRef(null);

  // Auto-advance
  useEffect(() => {
    if (paused || images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [paused, intervalMs, images.length]);

  // Nav helpers
  const goTo = (i) => setIdx((i + images.length) % images.length);
  const next = () => goTo(idx + 1);
  const prev = () => goTo(idx - 1);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) (delta < 0 ? next() : prev());
    touchStartX.current = null;
  };

  return (
    <div
      className="relative w-full max-w-4xl mx-auto select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="Instagram image carousel"
      tabIndex={0}
    >
      {/* Slides (clickable) */}
      <a
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-2xl shadow-xl bg-black"
        aria-label="Open Instagram profile"
      >
        <div
          /* aspect ratio instead of fixed height to avoid weird cropping/boxing */
          className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-black"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {images.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt="Follow on Instagram"
              loading={i === idx ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-700 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* Softer gradient so letterboxing isn't too dark */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* CTA pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-yellow-400/90 px-5 py-2 text-sm font-semibold text-black shadow-lg backdrop-blur transition hover:bg-yellow-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M7.75 2A5.75 5.75 0 0 0 2 7.75v8.5A5.75 5.75 0 0 0 7.75 22h8.5A5.75 5.75 0 0 0 22 16.25v-8.5A5.75 5.75 0 0 0 16.25 2h-8.5Zm8.5 1.5A4.25 4.25 0 0 1 20.5 7.75v8.5a4.25 4.25 0 0 1-4.25 4.25h-8.5A4.25 4.25 0 0 1 3.5 16.25v-8.5A4.25 4.25 0 0 1 7.75 3.5h8.5ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 1.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm5.25-.88a.88.88 0 1 0 0 1.75.88.88 0 0 0 0-1.75Z" />
              </svg>
              <span>Follow @devinmyagent</span>
            </span>
          </div>
        </div>
      </a>

      {/* Arrow controls */}
      <button
        onClick={(e) => {
          e.preventDefault();
          prev();
        }}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 focus:outline-none"
      >
        ‹
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          next();
        }}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 focus:outline-none"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              goTo(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === idx ? "bg-white" : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
