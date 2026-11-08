import { useState } from "react";
import { Modal, Slider } from "antd";
import { EnvironmentOutlined, InfoCircleOutlined, RightOutlined } from "@ant-design/icons";
import { PICKUP_ON_ROUTE_KM, DETOUR_MAX_PERCENT, DETOUR_MAX_KM, TIP_RATE_PER_KM } from "../../constants/pricing.js";

const fmt = (n) => (Math.round(n * 10) / 10).toString();

/**
 * Driver-facing explanation of the two pickup flows:
 *  - ON_ROUTE: pick up along the route only (within 2.5 km), never an extra fare
 *  - PASSENGER_LOCATION: the driver leaves the route, up to 20% of the trip (max 30 km), passenger pays extra
 * `preference` is the flow chosen on the form; the popup opens on it and lets the driver compare.
 */
export default function PickupFareInfo({ distanceKm, tipAmount = 0, preference = "ON_ROUTE" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(null);
  const [tryKm, setTryKm] = useState(5);

  const flow = tab || preference;
  const known = distanceKm != null && distanceKm > 0;
  const detourMax = known ? Math.min((distanceKm * DETOUR_MAX_PERCENT) / 100, DETOUR_MAX_KM) : null;
  // Same rule the server uses: the ride's own per-km rate, but never below the minimum.
  const ownRate = known && tipAmount > 0 ? tipAmount / distanceKm : 0;
  const rate = Math.max(TIP_RATE_PER_KM, ownRate);

  const maxTry = detourMax != null ? Math.max(PICKUP_ON_ROUTE_KM + 1, Math.floor(detourMax)) : DETOUR_MAX_KM;
  const tk = Math.min(tryKm, maxTry);
  const tryZone = tk <= PICKUP_ON_ROUTE_KM ? "ok" : detourMax != null && tk > detourMax ? "no" : "warn";
  const tryExtra = tk * 2;
  const tryFare = tryZone === "warn" ? Math.round(tryExtra * rate) : 0;

  const summary =
    preference === "ON_ROUTE"
      ? `Along your route only · within ${PICKUP_ON_ROUTE_KM} km · no extra fare`
      : `From their place · up to ${detourMax != null ? fmt(detourMax) : `${DETOUR_MAX_PERCENT}% of the trip`} km off route · ₹${fmt(rate)}/km extra`;

  return (
    <>
      <button type="button" className="pf-card" onClick={() => { setTab(null); setOpen(true); }}>
        <span className="pf-icon">
          <EnvironmentOutlined />
        </span>
        <span className="pf-text">
          <b>How passenger pickup works</b>
          <small>{summary}</small>
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
            <InfoCircleOutlined /> How passenger pickups work
          </span>
        }
      >
        <div className="pf-seg" role="tablist">
          <button type="button" role="tab" aria-selected={flow === "ON_ROUTE"} className={flow === "ON_ROUTE" ? "on" : ""} onClick={() => setTab("ON_ROUTE")}>
            Along my route
          </button>
          <button type="button" role="tab" aria-selected={flow === "PASSENGER_LOCATION"} className={flow === "PASSENGER_LOCATION" ? "on" : ""} onClick={() => setTab("PASSENGER_LOCATION")}>
            From their place
          </button>
        </div>

        {known && (
          <p className="pf-lead">
            Your trip is <b>{fmt(distanceKm)} km</b>.
          </p>
        )}

        {flow === "ON_ROUTE" ? (
          <>
            <div className="pf-map" aria-hidden="true">
              <div className="pf-band near" />
              <div className="pf-line" />
              <span className="pf-pin start" />
              <span className="pf-pin end" />
              <span className="pf-tag t1">Pickup zone · {PICKUP_ON_ROUTE_KM} km</span>
            </div>
            <ol className="pf-steps">
              <li>
                <i className="ok">1</i>
                <div>
                  <b>Within {PICKUP_ON_ROUTE_KM} km of your route</b>
                  <p>Passengers whose pickup and drop are close to your road route can join at the normal fare.</p>
                </div>
              </li>
              <li>
                <i className="no">2</i>
                <div>
                  <b>Farther than that</b>
                  <p>They can't request your ride and it doesn't show up in their search. You never drive off your route and there is never an extra fare.</p>
                </div>
              </li>
            </ol>
          </>
        ) : (
          <>
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
                  <p>Within {PICKUP_ON_ROUTE_KM} km of your road route. Normal fare.</p>
                </div>
              </li>
              <li>
                <i className="warn">2</i>
                <div>
                  <b>Detour · extra fare{detourMax != null ? ` · up to ${fmt(detourMax)} km away` : ""}</b>
                  <p>You go to their place and come back to the route. The passenger pays the extra distance, and sees the amount before asking.</p>
                </div>
              </li>
              <li>
                <i className="no">3</i>
                <div>
                  <b>Too far · not allowed</b>
                  <p>
                    Beyond {detourMax != null ? `${fmt(detourMax)} km` : `${DETOUR_MAX_PERCENT}% of the trip (max ${DETOUR_MAX_KM} km)`} off your route they can't request this ride.
                  </p>
                </div>
              </li>
            </ol>

            <div className="pf-formula">
              <div className="pf-ftitle">The formula</div>
              <div className="pf-frow">
                <span className="pf-fn">1</span>
                <div>
                  <b>How far you may go off route</b>
                  <code>
                    limit = min( {DETOUR_MAX_KM} km , max( {PICKUP_ON_ROUTE_KM} km , trip km × {DETOUR_MAX_PERCENT}% ) )
                  </code>
                  {known && (
                    <small>
                      {fmt(distanceKm)} × {DETOUR_MAX_PERCENT}% = {fmt((distanceKm * DETOUR_MAX_PERCENT) / 100)} km, capped at {DETOUR_MAX_KM} km, so <b>{fmt(detourMax)} km</b>.
                    </small>
                  )}
                </div>
              </div>
              <div className="pf-frow">
                <span className="pf-fn">2</span>
                <div>
                  <b>Extra distance you drive</b>
                  <code>extra km = off-route km × 2</code>
                </div>
              </div>
              <div className="pf-frow">
                <span className="pf-fn">3</span>
                <div>
                  <b>Price per km</b>
                  <code>rate = max( ₹{TIP_RATE_PER_KM} , ride tip ÷ trip km )</code>
                  <small>
                    Right now: <b>₹{fmt(rate)}/km</b>
                  </small>
                </div>
              </div>
              <div className="pf-frow">
                <span className="pf-fn">4</span>
                <div>
                  <b>Extra fare</b>
                  <code>extra fare = extra km × rate</code>
                </div>
              </div>

              <div className="pf-try">
                <div className="pf-try-head">
                  Try it: passenger is <b>{tk} km</b> off your route
                </div>
                <Slider min={0} max={maxTry} step={1} value={tk} onChange={setTryKm} tooltip={{ open: false }} />
                <div className={`pf-try-out ${tryZone}`}>
                  {tryZone === "ok" && (
                    <>
                      On your route. <b>No extra fare.</b>
                    </>
                  )}
                  {tryZone === "warn" && (
                    <>
                      {tk} × 2 = {tryExtra} km extra × ₹{fmt(rate)} = <b>+₹{tryFare}</b>
                    </>
                  )}
                  {tryZone === "no" && (
                    <>
                      Too far. <b>Can't join.</b>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pf-note">You approve every request before anyone is booked.</div>
      </Modal>
    </>
  );
}
