import { useEffect, useState } from "react";
import { Modal, Button, Input } from "antd";
import { CheckOutlined, LockOutlined, ArrowRightOutlined, ArrowLeftOutlined, EnvironmentOutlined, MobileOutlined } from "@ant-design/icons";
import { paymentService } from "../../services/paymentService.js";
import BrandLoader from "../ui/BrandLoader.jsx";

/** What the passenger pays, split into the ride's fare, any detour extra and the platform fee. */
export function fareBreakdown(booking) {
  const ride = booking.ride || {};
  const tip = Number(booking.tipAmount) || 0;
  const rideFare = ride.rideType === "WITH_TIP" ? Math.min(tip, (Number(ride.tipAmount) || 0) * (Number(booking.seats) || 1)) : 0;
  return {
    rideFare,
    detourExtra: Math.max(0, Math.round((tip - rideFare) * 100) / 100),
    platformFee: Number(booking.platformFee) || 0,
    total: Number(booking.totalAmount) || 0,
  };
}

// UPI apps offered at checkout. `mark` is a short brand-coloured badge (we ship
// no brand logos), `color` its background.
export const UPI_APPS = [
  { id: "gpay", name: "Google Pay", mark: "G", color: "#4285F4" },
  { id: "phonepe", name: "PhonePe", mark: "Pe", color: "#5F259F" },
  { id: "paytm", name: "Paytm", mark: "P", color: "#00B9F1" },
  { id: "bhim", name: "BHIM", mark: "B", color: "#F47B20" },
  { id: "amazonpay", name: "Amazon Pay", mark: "a", color: "#FF9900" },
  { id: "cred", name: "CRED", mark: "C", color: "#1C1C1C" },
];
const OTHER_UPI = { id: "upi-id", name: "Other UPI ID" };
const LAST_APP_KEY = "bikeride_last_upi_app";

// name@bank - letters, digits, dots, dashes and underscores before the @.
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

function readLastApp() {
  try {
    const id = window.localStorage.getItem(LAST_APP_KEY);
    return [...UPI_APPS, OTHER_UPI].some((a) => a.id === id) ? id : UPI_APPS[0].id;
  } catch {
    return UPI_APPS[0].id;
  }
}

/**
 * Pay for a booking in clear steps: review the amount -> choose a UPI app ->
 * waiting for approval in that app -> payment successful (booking confirmed).
 * Payments go through the app's mock gateway, so no real money moves and the
 * chosen app is only simulated.
 */
export default function PaymentModal({ booking, open, onClose, onPaid, onViewReceipt }) {
  const [step, setStep] = useState("review"); // review | method | paying | done | failed
  const [error, setError] = useState(null);
  const [appId, setAppId] = useState(readLastApp);
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState(null);

  useEffect(() => {
    if (open) {
      setStep("review");
      setError(null);
      setUpiError(null);
    }
  }, [open]);

  if (!booking) return null;
  const fare = fareBreakdown(booking);
  const ride = booking.ride || {};

  const isUpiId = appId === OTHER_UPI.id;
  const selectedApp = isUpiId ? OTHER_UPI : UPI_APPS.find((a) => a.id === appId) || UPI_APPS[0];

  async function pay() {
    if (isUpiId && !UPI_ID_PATTERN.test(upiId.trim())) {
      setUpiError("Enter a valid UPI ID, like name@bank");
      return;
    }
    try {
      window.localStorage.setItem(LAST_APP_KEY, appId);
    } catch {
      // Remembering the last app is a convenience only.
    }
    setStep("paying");
    try {
      const order = await paymentService.createOrder(booking.id);
      // Small pause so the "paying" step is seen rather than flashed.
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await paymentService.verify({
        bookingId: booking.id,
        providerOrderId: order.orderId,
        providerPaymentId: order.providerPaymentId,
        signature: order.mockSignature,
      });
      setStep("done");
      onPaid?.();
    } catch (err) {
      setError(err.message);
      setStep("failed");
    }
  }

  return (
    <Modal open={open} onCancel={step === "paying" ? undefined : onClose} footer={null} width={420} centered closable={step !== "paying"} maskClosable={false} className="pay-modal">
      {step === "review" && (
        <div className="pm-body">
          <div className="pm-title">Pay for your seat</div>
          <div className="pm-route">
            <EnvironmentOutlined /> {ride.sourceName?.split(",")[0]} <ArrowRightOutlined className="pm-arrow" /> {ride.destinationName?.split(",")[0]}
          </div>
          <div className="pm-lines">
            {fare.rideFare > 0 && <Line label={`Ride fare (${booking.seats} seat${booking.seats > 1 ? "s" : ""})`} value={fare.rideFare} />}
            {fare.detourExtra > 0 && <Line label="Detour pickup extra" value={fare.detourExtra} />}
            <Line label="Platform fee" value={fare.platformFee} />
            <div className="pm-total">
              <span>Total</span>
              <strong>₹{fare.total}</strong>
            </div>
          </div>
          <Button block size="large" className="pm-pay" icon={<ArrowRightOutlined />} onClick={() => setStep("method")}>
            Choose payment method
          </Button>
        </div>
      )}

      {step === "method" && (
        <div className="pm-body">
          <button type="button" className="pm-back" onClick={() => setStep("review")}>
            <ArrowLeftOutlined /> Back
          </button>
          <div className="pm-title">Pay ₹{fare.total} with UPI</div>
          <div className="pm-sub-left">Pick the app you want to pay with.</div>

          <div className="pm-apps" role="radiogroup" aria-label="UPI apps">
            {UPI_APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                role="radio"
                aria-checked={appId === app.id}
                className={`pm-app ${appId === app.id ? "selected" : ""}`}
                onClick={() => {
                  setAppId(app.id);
                  setUpiError(null);
                }}
              >
                <span className="pm-app-mark" style={{ background: app.color }}>{app.mark}</span>
                <span className="pm-app-name">{app.name}</span>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={isUpiId}
              className={`pm-app ${isUpiId ? "selected" : ""}`}
              onClick={() => setAppId(OTHER_UPI.id)}
            >
              <span className="pm-app-mark pm-app-mark-other"><MobileOutlined /></span>
              <span className="pm-app-name">{OTHER_UPI.name}</span>
            </button>
          </div>

          {isUpiId && (
            <div>
              <Input
                size="large"
                placeholder="yourname@bank"
                value={upiId}
                status={upiError ? "error" : undefined}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setUpiError(null);
                }}
                onPressEnter={pay}
                autoFocus
              />
              {upiError && <div className="pm-field-error">{upiError}</div>}
            </div>
          )}

          <Button block size="large" className="pm-pay" icon={<LockOutlined />} onClick={pay}>
            Pay ₹{fare.total} with {selectedApp.name}
          </Button>
          <div className="pm-note">Demo payment - no real money is charged.</div>
        </div>
      )}

      {step === "paying" && (
        <BrandLoader
          variant="inline"
          label={
            isUpiId
              ? `Waiting for you to approve the ₹${fare.total} request sent to ${upiId.trim()}…`
              : `Approve the ₹${fare.total} request in ${selectedApp.name}…`
          }
        />
      )}

      {step === "done" && (
        <div className="pm-body pm-center">
          <div className="pm-check"><CheckOutlined /></div>
          <div className="pm-title">Payment successful</div>
          <div className="pm-amount">₹{fare.total} paid</div>
          <div className="pm-sub">Paid via {isUpiId ? upiId.trim() : selectedApp.name}. Your seat is confirmed and the rider has been notified.</div>
          <div className="pm-actions">
            {onViewReceipt && <Button size="large" onClick={onViewReceipt}>Receipt</Button>}
            <Button size="large" className="pm-pay" onClick={onClose}>Done</Button>
          </div>
        </div>
      )}

      {step === "failed" && (
        <div className="pm-body pm-center">
          <div className="pm-title">Payment didn&apos;t go through</div>
          <div className="pm-sub">{error}</div>
          <div className="pm-actions">
            <Button size="large" onClick={onClose}>Close</Button>
            <Button size="large" className="pm-pay" onClick={() => setStep("method")}>Try again</Button>
          </div>
        </div>
      )}

      <style>{`
        .pay-modal .ant-modal-container,.pay-modal .ant-modal-content{border-radius:20px!important}
        .pm-body{display:flex;flex-direction:column;gap:14px;padding:6px 2px}
        .pm-center{align-items:center;text-align:center}
        .pm-title{font-size:18px;font-weight:800}
        .pm-route{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-weight:650;color:var(--text-secondary)}
        .pm-route .anticon:first-child{color:#2DD4BF}
        .pm-arrow{font-size:11px}
        .pm-lines{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:14px;background:var(--chrome-tint,rgba(148,163,184,.08));border:1px solid var(--border-light)}
        .pm-line{display:flex;justify-content:space-between;font-size:13.5px;color:var(--text-secondary)}
        .pm-total{display:flex;justify-content:space-between;align-items:baseline;padding-top:8px;margin-top:2px;border-top:1px dashed var(--border-light);font-weight:700}
        .pm-total strong{font-size:22px;color:#2DD4BF}
        .pm-pay{height:46px!important;border:none!important;border-radius:12px!important;font-weight:800!important;color:#fff!important;background:linear-gradient(135deg,#2DD4BF,#8B5CF6)!important;box-shadow:0 10px 26px rgba(45,212,191,.3)}
        .pm-back{align-self:flex-start;border:0;background:none;cursor:pointer;padding:0;font-size:13px;font-weight:600;color:var(--text-secondary);display:inline-flex;align-items:center;gap:6px}
        .pm-back:hover{color:var(--text-primary)}
        .pm-sub-left{margin-top:-8px;font-size:13px;color:var(--text-secondary)}
        .pm-apps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .pm-app{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 6px;border-radius:14px;cursor:pointer;color:var(--text-primary);background:var(--chrome-tint,rgba(148,163,184,.08));border:1.5px solid var(--border-light);transition:border-color .15s ease,transform .15s ease,background .15s ease}
        .pm-app:hover{transform:translateY(-2px)}
        .pm-app.selected{border-color:#2DD4BF;background:rgba(45,212,191,.12);box-shadow:0 0 0 3px rgba(45,212,191,.16)}
        .pm-app-mark{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:18px;letter-spacing:-.5px}
        .pm-app-mark-other{background:var(--text-tertiary,#64748b);font-size:20px}
        .pm-app-name{font-size:12px;font-weight:650;text-align:center;line-height:1.2}
        .pm-field-error{margin-top:6px;font-size:12px;color:#ef4444}
        .pm-note{font-size:11.5px;color:var(--text-tertiary);text-align:center}
        .pm-check{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;font-size:34px;color:#fff;background:linear-gradient(135deg,#22c55e,#2DD4BF);box-shadow:0 0 0 10px rgba(34,197,94,.14);animation:pmPop .45s cubic-bezier(.2,1.4,.4,1)}
        @keyframes pmPop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
        .pm-amount{font-size:26px;font-weight:800;color:#22c55e}
        .pm-sub{font-size:13px;color:var(--text-secondary);max-width:300px}
        .pm-actions{display:flex;gap:10px;width:100%}
        .pm-actions .ant-btn{flex:1}
      `}</style>
    </Modal>
  );
}

function Line({ label, value }) {
  return (
    <div className="pm-line">
      <span>{label}</span>
      <span>₹{value}</span>
    </div>
  );
}
