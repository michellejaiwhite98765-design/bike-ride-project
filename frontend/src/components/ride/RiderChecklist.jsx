import { Link } from "react-router-dom";
import { Button, Card } from "antd";
import { CheckCircleFilled, ClockCircleFilled, ExclamationCircleFilled, IdcardOutlined, CarOutlined } from "@ant-design/icons";

/**
 * What a user still needs before they can create a trip: a verified driving
 * licence and a verified vehicle. `status` comes from useRiderStatus().
 */
export default function RiderChecklist({ status, vehicles = [], next = "/rides/create" }) {
  const licence = status?.licence || { status: "NOT_SUBMITTED" };
  const licenceOk = licence.status === "VERIFIED";
  const vehicleOk = (status?.verifiedVehicleCount ?? 0) > 0;
  const vehiclePending = !vehicleOk && vehicles.length > 0;
  const pendingVehicle = vehicles.find((v) => v.verificationStatus !== "VERIFIED");

  const licenceText = {
    VERIFIED: `Verified · ${licence.licenceNumber}`,
    REJECTED: "Couldn't verify - please upload it again",
    EXPIRED: "Expired - upload your renewed licence",
    NOT_SUBMITTED: "Add your licence number and a photo of it",
  }[licence.status];

  const items = [
    {
      key: "licence",
      icon: <IdcardOutlined />,
      title: "Driving licence",
      done: licenceOk,
      text: licenceText,
      action: !licenceOk && (
        <Link to={`/profile/licence?next=${encodeURIComponent(next)}`}>
          <Button type="primary" style={{ background: "#0f766e" }}>
            {licence.status === "NOT_SUBMITTED" ? "Add licence" : "Update licence"}
          </Button>
        </Link>
      ),
    },
    {
      key: "vehicle",
      icon: <CarOutlined />,
      title: "Vehicle registration",
      done: vehicleOk,
      pending: vehiclePending,
      text: vehicleOk
        ? `${status.verifiedVehicleCount} verified vehicle${status.verifiedVehicleCount === 1 ? "" : "s"}`
        : vehiclePending
          ? "Your vehicle isn't verified yet - upload its RC"
          : "Add your vehicle and its RC",
      action: !vehicleOk && (
        <Link to={pendingVehicle ? `/vehicles/${pendingVehicle.id}/edit` : "/vehicles/add"}>
          <Button type="primary" style={{ background: "#0f766e" }}>
            {pendingVehicle ? "Verify vehicle" : "Add vehicle"}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="rcl-wrap">
      <Card className="rcl-card">
        <h2>Before you create a trip</h2>
        <p>For everyone's safety, riders verify their driving licence and vehicle once. Passengers don't need this.</p>
        {items.map((it) => (
          <div key={it.key} className={`rcl-item ${it.done ? "done" : ""}`}>
            <span className="rcl-icon">{it.icon}</span>
            <div className="rcl-body">
              <strong>{it.title}</strong>
              <span>{it.text}</span>
            </div>
            {it.done ? (
              <CheckCircleFilled className="rcl-state ok" />
            ) : it.pending ? (
              <ClockCircleFilled className="rcl-state wait" />
            ) : (
              <ExclamationCircleFilled className="rcl-state todo" />
            )}
            {it.action && <div className="rcl-action">{it.action}</div>}
          </div>
        ))}
      </Card>
      <style>{`
        .rcl-wrap{max-width:560px;margin:0 auto;padding:90px 14px 24px}
        .rcl-card h2{margin:0 0 6px;font-size:20px}
        .rcl-card p{margin:0 0 16px;color:var(--text-secondary)}
        .rcl-item{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:6px 12px;padding:14px;border:1px solid var(--border);border-radius:14px;margin-bottom:12px}
        .rcl-item.done{border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.06)}
        .rcl-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;background:rgba(45,212,191,.12);color:#2DD4BF}
        .rcl-body{min-width:0}
        .rcl-body strong{display:block}
        .rcl-body span{display:block;font-size:12px;color:var(--text-secondary)}
        .rcl-state{font-size:20px}.rcl-state.ok{color:#22C55E}.rcl-state.wait{color:#F59E0B}.rcl-state.todo{color:#F97316}
        .rcl-action{grid-column:2/4}
        @media(max-width:768px){.rcl-wrap{padding-top:84px}}
      `}</style>
    </div>
  );
}
