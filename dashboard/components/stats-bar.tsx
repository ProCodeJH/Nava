const STATS = [
  { label: 'Agents', value: '16', color: undefined },
  { label: 'Skills', value: '44', color: undefined },
  { label: 'MCP', value: '7', color: undefined },
  { label: 'Health', value: 'OK', color: '#34d399', glow: true },
];

export default function StatsBar() {
  return (
    <div className="grid grid-cols-4 gap-2 px-3.5 py-3 mt-1" aria-label="System Stats">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[10px] py-2 px-1 flex flex-col items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span
            className="text-[16px] font-bold leading-none mb-0.5"
            style={{
              color: stat.color ?? '#ffffff',
              textShadow: stat.glow ? '0 0 10px #34d399, 0 0 20px #34d39966' : undefined,
            }}
          >
            {stat.value}
          </span>
          <span
            className="text-[8px]"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
