/**
 * BikeRide's branded loader: a spinning teal-to-violet wheel with a bike in
 * the middle and a moving road underneath. Same look as the boot splash in
 * index.html, so the app goes splash -> session check -> page without the
 * loader changing style.
 *
 *  - variant="fullscreen": covers the whole screen (app start, session check)
 *  - variant="page" (default): fills the page area under the header
 *  - variant="inline": small, for inside cards and lists
 */
export default function BrandLoader({ variant = "page", label = "Loading…" }) {
  return (
    <div className={`brl brl-${variant}`} role="status" aria-live="polite">
      <div className="brl-wheel">
        <span className="brl-ring" />
        <span className="brl-ring brl-ring-2" />
        <svg className="brl-bike" viewBox="0 0 64 40" aria-hidden="true">
          <circle cx="13" cy="27" r="9" />
          <circle cx="51" cy="27" r="9" />
          <path d="M13 27 L25 11 H37 L51 27 M25 11 L32 27 H13 M37 11 L41 5 H47 M32 27 L41 11" />
        </svg>
      </div>
      {variant !== "inline" && <div className="brl-brand">BikeRide</div>}
      <div className="brl-road">
        <span />
      </div>
      {label && <div className="brl-label">{label}</div>}

      <style>{`
        .brl{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--text-secondary);text-align:center}
        .brl-fullscreen{position:fixed;inset:0;z-index:2000;background:radial-gradient(circle at 50% 40%,rgba(45,212,191,.12),transparent 55%),var(--bg-primary)}
        .brl-page{min-height:100%;padding:130px 24px 40px;box-sizing:border-box}
        .brl-inline{padding:24px 12px;gap:10px}

        .brl-wheel{position:relative;width:88px;height:88px;display:grid;place-items:center}
        .brl-inline .brl-wheel{width:52px;height:52px}
        .brl-ring{position:absolute;inset:0;border-radius:50%;padding:4px;background:conic-gradient(from 0deg,#2DD4BF,#8B5CF6,transparent 75%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:brlSpin 1s linear infinite}
        .brl-ring-2{inset:10px;padding:3px;opacity:.55;animation-duration:1.6s;animation-direction:reverse}
        .brl-inline .brl-ring-2{inset:7px}
        .brl-bike{width:46%;fill:none;stroke:#2DD4BF;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;animation:brlBob .9s ease-in-out infinite}

        .brl-brand{font-size:20px;font-weight:800;letter-spacing:-.01em;background:linear-gradient(135deg,#2DD4BF,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:transparent}
        .brl-road{position:relative;width:120px;height:4px;border-radius:999px;background:var(--chrome-tint,rgba(148,163,184,.18));overflow:hidden}
        .brl-inline .brl-road{width:80px;height:3px}
        .brl-road span{position:absolute;top:0;bottom:0;width:40%;border-radius:999px;background:linear-gradient(90deg,#2DD4BF,#8B5CF6);animation:brlRoad 1.2s ease-in-out infinite}
        .brl-label{font-size:13px;font-weight:600}
        .brl-inline .brl-label{font-size:12px}

        @keyframes brlSpin{to{transform:rotate(360deg)}}
        @keyframes brlBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes brlRoad{0%{left:-40%}100%{left:100%}}
        @media (prefers-reduced-motion:reduce){.brl-ring,.brl-bike,.brl-road span{animation-duration:3s}}
      `}</style>
    </div>
  );
}
