// Servian Contracting mark — hexagon + S, gold gradient, transparent background.
// Works on any theme (light/dark) since it has no background fill.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="servianGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6c76a" />
          <stop offset="0.5" stopColor="#c99a3c" />
          <stop offset="1" stopColor="#a5751f" />
        </linearGradient>
      </defs>
      {/* Hexagon outline (pointy top/bottom) */}
      <path
        d="M24 3 L41 13 L41 35 L24 45 L7 35 L7 13 Z"
        stroke="url(#servianGold)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Stylised S */}
      <path
        d="M31 17 C31 13.5 27.5 12 24 12 C20 12 17 13.8 17 17 C17 20.5 20.5 21.5 24 22.5 C27.5 23.5 31 24.5 31 28 C31 31.2 28 33 24 33 C20.5 33 17 31.5 17 28"
        stroke="url(#servianGold)"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Full lockup: mark + "SERVIAN CONTRACTING" wordmark.
export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 28 : 34} />
      <div className="leading-none">
        <p
          className="font-semibold tracking-[0.15em] text-(--text-primary)"
          style={{ fontSize: compact ? 13 : 15 }}
        >
          SERVIAN
        </p>
        <p
          className="tracking-[0.35em] text-(--text-muted)"
          style={{ fontSize: compact ? 7 : 8 }}
        >
          CONTRACTING
        </p>
      </div>
    </div>
  );
}
