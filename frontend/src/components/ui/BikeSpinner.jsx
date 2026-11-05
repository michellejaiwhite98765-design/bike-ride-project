/**
 * Button-sized BikeRide loader: the spinning teal-to-violet ring with the bike
 * in the middle (same look as BrandLoader). Use as an antd Button's loading
 * icon: loading={busy ? { icon: <BikeSpinner /> } : false}
 */
export default function BikeSpinner({ size = 22 }) {
  return (
    <span className="bks" style={{ width: size, height: size }} role="status" aria-label="Loading">
      <span className="bks-ring" />
      <svg className="bks-bike" viewBox="0 0 64 40" aria-hidden="true">
        <circle cx="13" cy="27" r="9" />
        <circle cx="51" cy="27" r="9" />
        <path d="M13 27 L25 11 H37 L51 27 M25 11 L32 27 H13 M37 11 L41 5 H47 M32 27 L41 11" />
      </svg>
      <style>{`
        .bks{position:relative;display:inline-grid;place-items:center;vertical-align:middle;margin-inline-end:8px}
        .bks-ring{position:absolute;inset:0;border-radius:50%;padding:2px;background:conic-gradient(from 0deg,#fff,#2DD4BF,transparent 75%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:bksSpin .9s linear infinite}
        .bks-bike{width:62%;fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;animation:bksBob .9s ease-in-out infinite}
        @keyframes bksSpin{to{transform:rotate(360deg)}}
        @keyframes bksBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
      `}</style>
    </span>
  );
}
