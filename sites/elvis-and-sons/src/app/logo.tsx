export function Logo({ onDark = false }: { onDark?: boolean }) {
  const gold = onDark ? "#FBBF24" : "#B45309";
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#2563EB" />
        <path d="M12 13h12.5" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M12 20h16" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M12 27h9" stroke={gold} strokeWidth="2.25" strokeLinecap="round" />
        <path d="M12 13v14" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx="28.2" cy="27" r="2.15" fill={gold} />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Elvis <span style={{ color: gold }}>&</span> Sons
        </span>
        <span className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${onDark ? "text-white/70" : "text-slate-500"}`}>
          Multilink Ventures
        </span>
      </span>
    </span>
  );
}
