import { useState } from "react";
import { Modal, Slider } from "antd";
import { EnvironmentOutlined, InfoCircleOutlined, RightOutlined } from "@ant-design/icons";
import { PICKUP_ON_ROUTE_KM, DETOUR_MAX_PERCENT, DETOUR_MAX_KM, TIP_RATE_PER_KM } from "../../constants/pricing.js";

const fmt = (n) => (Math.round(n * 10) / 10).toString();

/** Rider-facing summary of how passenger pickup distance and extra fare work. */
export default function PickupFareInfo({ distanceKm, tipAmount = 0 }) {
  const [open, setOpen] = useState(false);
  const [tryKm, setTryKm] = useState(5);
  const known = distanceKm != null && distanceKm > 0;
  const detourMax = known ? Math.min((distanceKm * DETOUR_MAX_PERCENT) / 100, DETOUR_MAX_KM) : null;
  // Same rule the server uses: the ride's own per-km rate, but never below the minimum.
  const ownRate = known && tipAmount > 0 ? tipAmount / distanceKm : 0;
  const rate = Math.max(TIP_RATE_PER_KM, ownRate);
  const sample = detourMax != null ? Math.min(4, Math.max(PICKUP_ON_ROUTE_KM + 0.5, detourMax / 2)) : 4;
  const sampleExtraKm = sample * 2;
  const sampleFare = Math.round(sampleExtraKm * rate);
  const maxTry = detourMax != null ? Math.max(PICKUP_ON_ROUTE_KM + 1, Math.floor(detourMax)) : DETOUR_MAX_KM;
  const tk = Math.min(tryKm, maxTry);
  const tryZone = tk <= PICKUP_ON_ROUTE_KM ? "ok" : detourMax != null && tk > detourMax ? "no" : "warn";
  const tryExtra = tk * 2;
  const tryFare = tryZone === "warn" ? Math.round(tryExtra * rate) : 0;

  return (
    <>
      <button type="button" className="pf-card" onClick={() => setOpen(true)}>
        <span className="pf-icon">
          <EnvironmentOutlined />
        </span>
        <span className="pf-text">
          <b>Pickup distance and extra fare</b>
          <small>
            Free within {PICKUP_ON_ROUTE_KM} km of your route
            {detourMax != null ? ` · detours up to ${fmt(detourMax)} km` : ` · detours up to ${DETOUR_MAX_PERCENT}% of the trip`} · ₹{fmt(rate)}/km extra
          </small>
        </span>
        <RightOutlined className="pf-go" />
      </button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        centered
        width={460}
        className="pf-modal"
        title={
          <span className="pf-title">
            <InfoCircleOutlined /> How passenger pickups are priced
          </span>
        }
      >
        <p className="pf-lead">
          {known ? (
            <>
              Your trip is <b>{fmt(distanceKm)} km</b>. Passengers can ask to be picked up away from your route. Here is what happens.
            </>
          ) : (
            <>Passengers can ask to be picked up away from your route. Pick your start and end to see numbers for your trip.</>
          )}
        </p>

        <div className="pf-map" aria-hidden="true">
          <div className="pf-band far" />
          <div className="pf-band near" />
          <div className="pf-line" />
          <span className="pf-pin start" />
          <span className="pf-pin end" />
          <span className="pf-tag t1">Free zone</span>
          <span className="pf-tag t2">Detour zone</span>
        </div>

        <ol className="pf-steps">
          <li>
            <i className="ok">1</i>
            <div>
              <b>On your route · no extra</b>
              <p>Pickup within {PICKUP_ON_ROUTE_KM} km of your road route. The passenger pays the normal fare.</p>
            </div>
          </li>
          <li>
            <i className="warn">2</i>
            <div>
              <b>
                Detour · extra fare{detourMax != null ? ` · up to ${fmt(detourMax)} km away` : ""}
              </b>
              <p>
                If you go off route to pick them up, they pay extra: <b>off-route km × 2</b> (there and back) × <b>₹{fmt(rate)}/km</b>. Example: a pickup {fmt(sample)} km
                off your route adds {fmt(sampleExtraKm)} km, so <b>+₹{sampleFare}</b>.
              </p>
            </div>
          </li>
          <li>
            <i className="no">3</i>
            <div>
              <b>Too far · not allowed</b>
              <p>
                Beyond {detourMax != null ? `${fmt(detourMax)} km` : `${DETOUR_MAX_PERCENT}% of the trip (max ${DETOUR_MAX_KM} km)`} from your route, passengers can't request this ride.
              </p>
            </div>
          </li>
        </ol>

        <div className="pf-formula">
          <div className="pf-ftitle">Learn the formula</div>
          <div className="pf-frow"><span className="pf-fn">1</span><div><b>How far can the rider go off route?</b><code>limit = min( {DETOUR_MAX_KM} km , max( {PICKUP_ON_ROUTE_KM} km , trip km × {DETOUR_MAX_PERCENT}% ) )</code>{known && <small>Your trip: {fmt(distanceKm)} × {DETOUR_MAX_PERCENT}% = {fmt((distanceKm * DETOUR_MAX_PERCENT) / 100)} km, capped at {DETOUR_MAX_KM} km, so <b>{fmt(detourMax)} km</b>.</small>}</div></div>
          <div className="pf-frow"><span className="pf-fn">2</span><div><b>Extra distance driven</b><code>extra km = off-route km × 2</code><small>Out to the passenger and back to the route.</small></div></div>
          <div className="pf-frow"><span className="pf-fn">3</span><div><b>Price per km</b><code>rate = max( ₹{TIP_RATE_PER_KM} , ride tip ÷ trip km )</code><small>Your rate right now: <b>₹{fmt(rate)}/km</b>.</small></div></div>
          <div className="pf-frow"><span className="pf-fn">4</span><div><b>Extra fare</b><code>extra fare = extra km × rate</code></div></div>

          <div className="pf-try">
            <div className="pf-try-head">Try it: passenger is <b>{tk} km</b> off your route</div>
            <Slider min={0} max={maxTry} step={1} value={tk} onChange={setTryKm} tooltip={{ open: false }} />
            <div className={`pf-try-out ${tryZone}`}>
              {tryZone === "ok" && <>On your route. <b>No extra fare.</b></>}
              {tryZone === "warn" && (
                <>
                  {tk} × 2 = {tryExtra} km extra × ₹{fmt(rate)} = <b>+₹{tryFare}</b>
                </>
              )}
              {tryZone === "no" && <>Too far. <b>Can't join.</b></>}
            </div>
          </div>
        </div>

        <div className="pf-note">
          You approve every request. A detour passenger sees the extra amount before they ask, and pays it with their seat.
        </div>
      </Modal>
    </>
  );
}
