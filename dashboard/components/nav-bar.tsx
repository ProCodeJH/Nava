export default function NavBar() {
  return (
    <nav className="flex items-center justify-between px-3.5 py-3" aria-label="Nava Dashboard Navigation">
      {/* Left: Logo + Identity */}
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div
          className="flex items-center justify-center w-[26px] h-[26px] rounded-lg text-[11px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
          }}
          aria-hidden="true"
        >
          🦋
        </div>

        {/* Name block */}
        <div className="flex items-center gap-1.5">
          <span className="text-white text-[13px] font-bold tracking-wide">NAVA</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            자현 › <span style={{ color: '#8b5cf6' }}>나바</span>
          </span>
        </div>

        {/* Glow dot next to identity */}
        <span
          className="glow-dot inline-block rounded-full"
          style={{
            width: '5px',
            height: '5px',
            backgroundColor: '#8b5cf6',
            boxShadow: '0 0 8px #8b5cf6',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-1.5">
        <span
          className="glow-dot inline-block rounded-full"
          style={{
            width: '5px',
            height: '5px',
            backgroundColor: '#34d399',
            boxShadow: '0 0 8px #34d399',
          }}
          aria-hidden="true"
        />
        <span className="text-[11px] font-medium" style={{ color: 'rgba(52,211,153,0.5)' }}>
          ALL OK
        </span>
      </div>
    </nav>
  );
}
