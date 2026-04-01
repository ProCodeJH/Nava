interface WeaponItem {
  name: string;
  stars: string;
}

interface Layer {
  label: string;
  color: string;
  cols: string;
  items: WeaponItem[];
}

const LAYERS: Layer[] = [
  {
    label: 'L1 Engine',
    color: '#8b5cf6',
    cols: 'grid-cols-3',
    items: [
      { name: 'motion', stars: '31.3k' },
      { name: 'anime.js', stars: '66.9k' },
      { name: 'GSAP', stars: '24.1k' },
    ],
  },
  {
    label: 'L2 Scroll',
    color: '#06b6d4',
    cols: 'grid-cols-4',
    items: [
      { name: 'lenis', stars: '13.4k' },
      { name: 'fullPage', stars: '35.5k' },
      { name: 'barba.js', stars: '12.9k' },
      { name: 'Swiper', stars: '41.8k' },
    ],
  },
  {
    label: 'L3 3D',
    color: '#34d399',
    cols: 'grid-cols-6',
    items: [
      { name: 'three.js', stars: '111k' },
      { name: 'R3F', stars: '30.4k' },
      { name: 'Spline', stars: '1.4k' },
      { name: 'cobe', stars: '4.4k' },
      { name: 'Lottie', stars: '31.8k' },
      { name: 'remotion', stars: '40.4k' },
    ],
  },
  {
    label: 'L4 Components',
    color: '#f472b6',
    cols: 'grid-cols-5',
    items: [
      { name: 'typed.js', stars: '16.3k' },
      { name: 'cursor', stars: '3.9k' },
      { name: 'auto-ani', stars: '13.8k' },
      { name: 'r-bits', stars: '37k' },
      { name: 'm-prim', stars: '5.5k' },
    ],
  },
];

export default function ArsenalGrid() {
  return (
    <section aria-label="Frontend Arsenal">
      {/* Section header */}
      <div className="flex items-center justify-between py-2.5">
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Frontend Arsenal
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.12)' }}>
          18 weapons · 4 layers
        </span>
      </div>

      {/* Layers */}
      <div className="space-y-2">
        {LAYERS.map((layer) => (
          <div key={layer.label}>
            {/* Layer label */}
            <p
              className="text-[7px] font-bold uppercase mb-1"
              style={{ color: layer.color, opacity: 0.6 }}
            >
              {layer.label}
            </p>

            {/* Items grid */}
            <div className={`grid ${layer.cols} gap-1`}>
              {layer.items.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[6px] px-1.5 py-1.5 text-center transition-transform hover:-translate-y-px cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: `1px solid ${layer.color}1a`,
                  }}
                >
                  <p
                    className="text-[7px] font-semibold leading-tight"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[7px] mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    {item.stars}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
