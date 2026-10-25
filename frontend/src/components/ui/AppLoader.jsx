// Branded loading screen: a route line with a rider dot travelling along it.
// Used while the session is restored on app start, while signing in, and as
// a section loader (fullscreen={false}) where a page is waiting on data.
// The same markup/CSS is inlined in index.html as the pre-JS splash, so the
// hand-off from the static splash to React looks seamless.
export default function AppLoader({ label = "Getting things ready…", fullscreen = true }) {
  return (
    <div className={`app-loader ${fullscreen ? "app-loader-full" : ""}`} role="status" aria-live="polite">
      <div className="app-loader-brand">
        <span className="app-loader-dot" />
        Liftshare
      </div>
      <div className="app-loader-route" aria-hidden="true">
        <span className="app-loader-pin app-loader-pin-start" />
        <span className="app-loader-track">
          <span className="app-loader-rider" />
        </span>
        <span className="app-loader-pin app-loader-pin-end" />
      </div>
      <div className="app-loader-label">{label}</div>
    </div>
  );
}
