export function WaveBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute bottom-[-5%] left-1/2 h-[70vh] w-[160%] -translate-x-1/2 sm:w-[130%]"
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0A94C" />
            <stop offset="100%" stopColor="#C9962E" />
          </linearGradient>
          <linearGradient id="wave-terracotta" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C1622C" />
            <stop offset="100%" stopColor="#E0A94C" />
          </linearGradient>
        </defs>
        <path
          d="M0,220 C220,160 380,300 620,260 C860,220 1020,120 1260,180 C1350,202 1400,214 1440,222 L1440,500 L0,500 Z"
          fill="url(#wave-gold)"
          opacity="0.16"
        />
        <path
          d="M0,300 C260,340 460,220 700,260 C940,300 1140,380 1440,300 L1440,500 L0,500 Z"
          fill="url(#wave-terracotta)"
          opacity="0.13"
        />
        <path
          d="M0,360 C300,320 560,400 820,360 C1080,320 1220,380 1440,350 L1440,500 L0,500 Z"
          fill="#E0A94C"
          opacity="0.1"
        />
      </svg>
    </div>
  );
}
