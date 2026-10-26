import { useEffect, useState } from "react";
import { Modal, Button } from "antd";
import { CheckOutlined, LockOutlined, ArrowRightOutlined, EnvironmentOutlined } from "@ant-design/icons";
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

/**
 * Pay for a booking in three clear steps: review the amount -> paying ->
 * payment successful (booking confirmed). Payments go through the app's
 * mock gateway, so no real money moves.
 */
export default function PaymentModal({ booking, open, onClose, onPaid, onViewReceipt }) {
  const [step, setStep] = useState("review"); // review | paying | done | failed
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setStep("review");
      setError(null);
    }
  }, [open]);

  if (!booking) return null;
  const fare = fareBreakdown(booking);
  const ride = booking.ride || {};

  async function pay() {
    setStep("paying");
    try {
      const order = await paymentService.createOrder(booking.id);
      // Small pause so the "paying" step is seen rather than flashed.
      await new Promise((resolve) => setTimeout(resolve, 900));
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
          <Button block size="large" className="pm-pay" icon={<LockOutlined />} onClick={pay}>
            Pay ₹{fare.total}
          </Button>
          <div className="pm-note">Demo payment - no real money is charged.</div>
        </div>
      )}

      {step === "paying" && <BrandLoader variant="inline" label={`Processing your payment of ₹${fare.total}…`} />}

      {step === "done" && (
        <div className="pm-body pm-center">
          <div className="pm-check"><CheckOutlined /></div>
          <div className="pm-title">Payment successful</div>
          <div className="pm-amount">₹{fare.total} paid</div>
          <div className="pm-sub">Your seat is confirmed. The rider has been notified.</div>
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
            <Button size="large" className="pm-pay" onClick={() => setStep("review")}>Try again</Button>
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
