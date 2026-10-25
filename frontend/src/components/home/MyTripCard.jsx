import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Avatar, Button, Popconfirm } from "antd";
import {
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  PlayCircleFilled,
  RocketOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../../services/rideService.js";
import { connectSocket } from "../../services/socket.js";
import BrandLoader from "../ui/BrandLoader.jsx";

const STEPS = [
  { status: "DRAFT", label: "Draft" },
  { status: "PUBLISHED", label: "Published" },
  { status: "STARTED", label: "On the way" },
  { status: "COMPLETED", label: "Completed" },
];
const OPEN = ["STARTED", "PUBLISHED", "DRAFT"];

/**
 * The rider's current trip, first thing on the home card view: where it's
 * going, its progress, the passengers asking to join (accept / reject right
 * here) and the next step - publish, start or complete the ride. Renders
 * nothing when the user has no open trip.
 */
export default function MyTripCard({ onChanged }) {
  const { message } = App.useApp();
  const [ride, setRide] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // id of the request / "trip" being acted on

  const load = useCallback(async () => {
    try {
      const mine = await rideService.listMine();
      const open = (Array.isArray(mine) ? mine : [])
        .filter((r) => OPEN.includes(r.status))
        .sort((a, b) => OPEN.indexOf(a.status) - OPEN.indexOf(b.status))[0];
      setRide(open || null);
      setRequests(open ? await rideService.listRequests(open.id) : []);
    } catch {
      setRide(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // New join requests (and cancellations) arrive as notifications.
    const socket = connectSocket();
    socket.on("notification:new", load);
    return () => socket.off("notification:new", load);
  }, [load]);

  async function act(key, fn, successMsg) {
    setBusy(key);
    try {
      await fn();
      message.success(successMsg);
      await load();
      onChanged?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="mtc-card"><BrandLoader variant="inline" label="Loading your trip…" /><MyTripCardStyles /></div>;
  if (!ride) return null;

  const pending = requests.filter((r) => r.status === "REQUESTED");
  const accepted = requests.filter((r) => r.status === "ACCEPTED");
  const stepIndex = STEPS.findIndex((s) => s.status === ride.status);

  return (
    <section className="mtc-card">
      <div className="mtc-glow" />
      <header className="mtc-head">
        <div>
          <div className="mtc-eyebrow">Your trip</div>
          <div className="mtc-route">
            <EnvironmentOutlined /> {ride.sourceName?.split(",")[0]} <ArrowRightOutlined className="mtc-arrow" /> {ride.destinationName?.split(",")[0]}
          </div>
          <div className="mtc-meta">
            <span><ClockCircleOutlined /> {dayjs(ride.departureDate).format("DD MMM")} · {ride.departureTime}</span>
            <span><TeamOutlined /> {ride.availableSeats}/{ride.totalSeats} seats left</span>
            <span>{ride.rideType === "WITHOUT_TIP" ? "Free ride" : `Tip ₹${ride.tipAmount}`}</span>
          </div>
        </div>
        <Link to={`/rides/${ride.id}`} className="mtc-open">Open <ArrowRightOutlined /></Link>
      </header>

      <ol className="mtc-steps">
        {STEPS.map((step, i) => (
          <li key={step.status} className={i < stepIndex ? "done" : i === stepIndex ? "current" : ""}>
            <span className="mtc-dot">{i < stepIndex ? <CheckOutlined /> : i + 1}</span>
            <span className="mtc-step-label">{step.label}</span>
          </li>
        ))}
      </ol>

      {ride.status !== "STARTED" && (
        <div className="mtc-requests">
          <div className="mtc-sub">
            Join requests {pending.length > 0 && <span className="mtc-badge">{pending.length} new</span>}
          </div>
          {pending.length === 0 && <div className="mtc-empty">No pending requests right now - they&apos;ll show up here.</div>}
          {pending.map((req) => (
            <div key={req.id} className="mtc-req">
              <Avatar size={38} icon={<UserOutlined />} className="mtc-avatar">
                {req.passenger?.firstName?.[0]}
              </Avatar>
              <div className="mtc-req-info">
                <div className="mtc-req-name">
                  {req.passenger?.firstName} {req.passenger?.lastName}
                  <span className="mtc-seats">{req.seatsRequested} seat{req.seatsRequested !== 1 ? "s" : ""}</span>
                </div>
                <div className="mtc-req-route">
                  {req.pickupName?.split(",")[0]} → {req.dropName?.split(",")[0]}
                </div>
                {req.pickupZone === "DETOUR" && (
                  <div className="mtc-detour">Detour {Number(req.pickupDistanceKm)} km off your route · +₹{Number(req.extraTip)}</div>
                )}
              </div>
              <div className="mtc-req-actions">
                <Button
                  shape="circle"
                  className="mtc-reject"
                  icon={<CloseOutlined />}
                  loading={busy === `reject-${req.id}`}
                  disabled={Boolean(busy)}
                  onClick={() => act(`reject-${req.id}`, () => rideService.rejectRequest(req.id), "Request rejected")}
                  aria-label="Reject"
                />
                <Button
                  className="mtc-accept"
                  icon={<CheckOutlined />}
                  loading={busy === `accept-${req.id}`}
                  disabled={Boolean(busy)}
                  onClick={() => act(`accept-${req.id}`, () => rideService.acceptRequest(req.id), "Passenger accepted")}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mtc-riders">
          <span className="mtc-sub">Riding with you</span>
          <Avatar.Group max={{ count: 4 }}>
            {accepted.map((req) => (
              <Avatar key={req.id} className="mtc-avatar" icon={<UserOutlined />}>{req.passenger?.firstName?.[0]}</Avatar>
            ))}
          </Avatar.Group>
        </div>
      )}

      <div className="mtc-cta">
        {ride.status === "DRAFT" && (
          <Button block size="large" className="mtc-primary" icon={<RocketOutlined />} loading={busy === "trip"}
            onClick={() => act("trip", () => rideService.publish(ride.id), "Trip published")}>
            Publish trip
          </Button>
        )}
        {ride.status === "PUBLISHED" && (
          <Popconfirm
            title="Start this ride now?"
            description={
              accepted.length === 0
                ? "No passengers accepted yet - you'll ride alone."
                : `${accepted.length} passenger(s) will be notified. Anyone who hasn't paid yet is released from the ride.`
            }
            okText="Start"
            onConfirm={() =>
              act("trip", async () => {
                const started = await rideService.start(ride.id);
                if (started?.releasedUnpaid) message.warning(`${started.releasedUnpaid} unpaid passenger(s) were released from the ride`);
              }, "Ride started - have a safe trip!")
            }
          >
            <Button block size="large" className="mtc-primary" icon={<PlayCircleFilled />} loading={busy === "trip"}>
              Start ride
            </Button>
          </Popconfirm>
        )}
        {ride.status === "STARTED" && (
          <>
            <Link to={`/rides/${ride.id}`} style={{ flex: 1 }}>
              <Button block size="large" className="mtc-secondary">Live tracking</Button>
            </Link>
            <Popconfirm title="Mark this ride as completed?" okText="Complete"
              onConfirm={() => act("trip", () => rideService.complete(ride.id), "Ride completed")}>
              <Button size="large" className="mtc-primary" icon={<FlagOutlined />} loading={busy === "trip"} style={{ flex: 1 }}>
                Complete ride
              </Button>
            </Popconfirm>
          </>
        )}
      </div>
      <MyTripCardStyles />
    </section>
  );
}

function MyTripCardStyles() {
  return (
    <style>{`
      .mtc-card{position:relative;overflow:hidden;margin-bottom:18px;padding:18px;border-radius:20px;background:linear-gradient(160deg,rgba(45,212,191,.10),rgba(139,92,246,.08) 60%,transparent),var(--bg-primary);border:1px solid rgba(45,212,191,.28);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:16px}
      .mtc-glow{position:absolute;top:-80px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.25),transparent 70%);pointer-events:none}
      .mtc-head{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .mtc-eyebrow{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2DD4BF;margin-bottom:4px}
      .mtc-route{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:18px;font-weight:800;color:var(--text-primary)}
      .mtc-route>.anticon:first-child{color:#2DD4BF}
      .mtc-arrow{font-size:12px;color:var(--text-tertiary)}
      .mtc-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;font-size:12.5px;color:var(--text-secondary)}
      .mtc-meta span{display:inline-flex;align-items:center;gap:5px}
      .mtc-open{flex-shrink:0;font-size:12.5px;font-weight:700;color:#2DD4BF;padding:6px 12px;border-radius:999px;background:rgba(45,212,191,.12)}

      .mtc-steps{position:relative;display:grid;grid-template-columns:repeat(4,1fr);margin:0;padding:0;list-style:none}
      .mtc-steps li{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11.5px;color:var(--text-tertiary)}
      .mtc-steps li:not(:last-child)::after{content:"";position:absolute;top:13px;left:calc(50% + 16px);right:calc(-50% + 16px);height:2px;border-radius:2px;background:var(--border-light)}
      .mtc-steps li.done:not(:last-child)::after{background:linear-gradient(90deg,#2DD4BF,#8B5CF6)}
      .mtc-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;background:var(--chrome-tint);border:1px solid var(--border-light);color:var(--text-tertiary)}
      .mtc-steps li.done .mtc-dot{background:#2DD4BF;border-color:#2DD4BF;color:#04110f}
      .mtc-steps li.current .mtc-dot{background:linear-gradient(135deg,#2DD4BF,#8B5CF6);border:none;color:#fff;box-shadow:0 0 0 5px rgba(45,212,191,.18);animation:mtcPulse 1.8s ease-in-out infinite}
      .mtc-steps li.current{color:var(--text-primary);font-weight:700}
      @keyframes mtcPulse{0%,100%{box-shadow:0 0 0 4px rgba(45,212,191,.18)}50%{box-shadow:0 0 0 8px rgba(45,212,191,.06)}}

      .mtc-sub{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-secondary)}
      .mtc-badge{padding:2px 8px;border-radius:999px;background:#f59e0b;color:#1f1300;font-size:10.5px;letter-spacing:0}
      .mtc-requests{display:flex;flex-direction:column;gap:10px}
      .mtc-empty{font-size:12.5px;color:var(--text-tertiary);padding:10px 12px;border-radius:12px;border:1px dashed var(--border-light)}
      .mtc-req{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:var(--chrome-tint);border:1px solid var(--chrome-border);animation:mtcIn .3s ease}
      @keyframes mtcIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      .mtc-avatar{background:linear-gradient(135deg,#2DD4BF,#60A5FA)!important;color:#04110f!important;flex-shrink:0}
      .mtc-req-info{flex:1;min-width:0}
      .mtc-req-name{display:flex;align-items:center;gap:8px;font-weight:750;font-size:13.5px;color:var(--text-primary)}
      .mtc-seats{font-size:11px;font-weight:600;color:var(--text-tertiary)}
      .mtc-req-route{font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mtc-detour{margin-top:2px;font-size:11.5px;font-weight:700;color:#f59e0b}
      .mtc-req-actions{display:flex;gap:8px;flex-shrink:0}
      .mtc-accept{border-radius:999px!important;font-weight:700!important;background:#2DD4BF!important;border-color:#2DD4BF!important;color:#04110f!important}
      .mtc-reject{color:#f87171!important;border-color:rgba(248,113,113,.4)!important;background:transparent!important}

      .mtc-riders{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .mtc-cta{display:flex;gap:10px}
      .mtc-cta>.ant-btn,.mtc-cta>span{flex:1}
      .mtc-primary{height:48px!important;border-radius:14px!important;border:none!important;font-weight:800!important;color:#fff!important;background:linear-gradient(135deg,#2DD4BF,#8B5CF6)!important;box-shadow:0 10px 28px rgba(45,212,191,.3)}
      .mtc-primary:hover{filter:brightness(1.08)}
      .mtc-secondary{height:48px!important;border-radius:14px!important;font-weight:700!important}

      @media (max-width:480px){
        .mtc-card{padding:14px;border-radius:16px}
        .mtc-route{font-size:16px}
        .mtc-req{flex-wrap:wrap}
        .mtc-req-actions{width:100%;justify-content:flex-end}
        .mtc-step-label{font-size:10.5px}
      }
    `}</style>
  );
}
