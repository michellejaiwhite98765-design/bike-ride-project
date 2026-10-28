import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Tag } from "antd";
import { CheckCircleFilled, ClockCircleOutlined, KeyOutlined, SafetyCertificateOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { bookingService } from "../../services/bookingService.js";

// The two OTP hand-offs of a trip, on both sides of the booking:
//   pickup  - once the rider meets the passenger, the rider sends an OTP; the
//             passenger enters it and is on board (only after paying).
//   drop-off - at the destination, a second OTP; the passenger confirming it
//             releases the rider's payment.

const RESEND_SECONDS = 30;

function useCountdown(sentAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!sentAt) return 0;
  return Math.max(0, RESEND_SECONDS - Math.floor((now - new Date(sentAt).getTime()) / 1000));
}

const money = (value) => `₹${Number(value) || 0}`;

/** Passenger's view: what to do next, and the OTP entry when the rider has sent one. */
export function PassengerBoardingPanel({ booking, onChanged }) {
  const { notification } = App.useApp();
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const rideStatus = booking.ride?.status;
  const status = booking.boardingStatus;

  if (booking.bookingStatus === "CANCELLED") return null;
  if (!["PUBLISHED", "STARTED"].includes(rideStatus) && status !== "DROPPED") return null;

  async function submit(kind) {
    if (otp.length !== 6) {
      notification.error({ title: "Error", description: "Enter the 6-digit OTP" });
      return;
    }
    setBusy(true);
    try {
      await (kind === "pickup" ? bookingService.verifyPickup(booking.id, otp) : bookingService.verifyDrop(booking.id, otp));
      notification.success({
        title: "Success",
        description: kind === "pickup" ? "You're on board - have a safe ride!" : "Drop-off confirmed. Payment released to your rider.",
      });
      setOtp("");
      onChanged?.();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
      setOtp(""); // start fresh so the next try is a clean entry
    } finally {
      setBusy(false);
    }
  }

  const otpEntry = (kind, label) => (
    <div className="bp-otp">
      <div className="bp-otp-hint">
        <KeyOutlined /> Your rider sent you an OTP - check your notifications.
        {booking.pickupOtpExpiresAt && <span> Valid until {dayjs(booking.pickupOtpExpiresAt).format("h:mm A")}.</span>}
      </div>
      <Input.OTP length={6} value={otp} onChange={setOtp} size="large" inputMode="numeric" />
      <Button type="primary" size="large" loading={busy} disabled={otp.length !== 6} onClick={() => submit(kind)} style={{ marginTop: 12 }}>
        {label}
      </Button>
    </div>
  );

  let body;
  if (booking.bookingStatus === "PAYMENT_PENDING") {
    body = (
      <Alert
        type="warning"
        showIcon
        icon={<WalletOutlined />}
        title="Pay first to get your pickup OTP"
        description="Your OTP is only sent after your payment is complete. Complete the payment above, then you'll get a confirmation and later your pickup OTP."
      />
    );
  } else if (status === "DROPPED") {
    body = (
      <Alert
        type="success"
        showIcon
        title="You've been dropped off"
        description={
          booking.riderPayoutStatus === "RELEASED"
            ? `Your payment of ${money(booking.riderPayoutAmount)} has been released to your rider.`
            : "Thanks for riding with Liftshare."
        }
      />
    );
  } else if (rideStatus !== "STARTED") {
    body = (
      <Alert
        type="info"
        showIcon
        icon={<CheckCircleFilled />}
        title={booking.paymentStatus === "SUCCESS" ? "Payment complete" : "Seat confirmed"}
        description="When the ride starts and your rider meets you, you'll receive a pickup OTP here and in your notifications. Enter it to join the ride."
      />
    );
  } else if (status === "NOT_BOARDED") {
    body = <Alert type="info" showIcon icon={<ClockCircleOutlined />} title="Waiting for your pickup OTP" description="Your rider sends it when you meet. It will appear in your notifications." />;
  } else if (status === "OTP_SENT") {
    body = otpEntry("pickup", "Verify OTP and join the ride");
  } else if (status === "BOARDED") {
    body = (
      <Alert
        type="success"
        showIcon
        title="You're on board"
        description={`${booking.boardedAt ? `Boarded at ${dayjs(booking.boardedAt).format("h:mm A")}. ` : ""}When you reach your drop-off your rider will send a drop-off OTP.${booking.riderPayoutStatus === "HELD" ? " Your payment is released to the rider only after you confirm it." : ""}`}
      />
    );
  } else if (status === "DROP_OTP_SENT") {
    body = otpEntry("drop", "Confirm drop-off");
  }

  return (
    <div className="bp-panel">
      <div className="bp-title">
        <SafetyCertificateOutlined /> Pickup &amp; drop-off
      </div>
      {body}
      <style>{`
        .bp-panel{margin-top:16px;padding:14px;border-radius:14px;border:1px solid var(--border-light);background:var(--chrome-tint,rgba(148,163,184,.06))}
        .bp-title{font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:8px}
        .bp-otp-hint{font-size:13px;color:var(--text-secondary);margin-bottom:10px}
      `}</style>
    </div>
  );
}

/** Rider's view of one accepted passenger: payment, OTP buttons and payout state. */
export function RiderBoardingControls({ request, ride, onChanged }) {
  const { notification } = App.useApp();
  const [busy, setBusy] = useState(false);
  const booking = request.booking;
  const secondsLeft = useCountdown(booking?.pickupOtpSentAt);
  if (request.status !== "ACCEPTED" || !booking || booking.bookingStatus === "CANCELLED") return null;

  const status = booking.boardingStatus;
  const started = ride.status === "STARTED";

  async function send(kind) {
    setBusy(true);
    try {
      await (kind === "pickup" ? bookingService.sendPickupOtp(booking.id) : bookingService.sendDropOtp(booking.id));
      notification.success({ title: "Success", description: `${kind === "pickup" ? "Pickup" : "Drop-off"} OTP sent to ${request.passenger?.firstName || "the passenger"}` });
      onChanged?.();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setBusy(false);
    }
  }

  let action;
  if (booking.bookingStatus === "PAYMENT_PENDING") {
    action = <Tag color="gold">Waiting for payment - the passenger gets their OTP only after paying</Tag>;
  } else if (status === "DROPPED") {
    action = <Tag color="green">Dropped off{booking.droppedAt ? ` at ${dayjs(booking.droppedAt).format("h:mm A")}` : ""}</Tag>;
  } else if (!started) {
    action = <Tag>Start the ride to pick up this passenger</Tag>;
  } else if (status === "NOT_BOARDED") {
    action = (
      <Button type="primary" size="small" loading={busy} onClick={() => send("pickup")}>
        Send pickup OTP
      </Button>
    );
  } else if (status === "OTP_SENT") {
    action = (
      <>
        <Tag color="blue">Pickup OTP sent - waiting for the passenger to enter it</Tag>
        <Button size="small" loading={busy} disabled={secondsLeft > 0} onClick={() => send("pickup")}>
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend OTP"}
        </Button>
      </>
    );
  } else if (status === "BOARDED") {
    action = (
      <>
        <Tag color="green">On board{booking.boardedAt ? ` since ${dayjs(booking.boardedAt).format("h:mm A")}` : ""}</Tag>
        <Button type="primary" size="small" loading={busy} onClick={() => send("drop")}>
          Send drop-off OTP
        </Button>
      </>
    );
  } else if (status === "DROP_OTP_SENT") {
    action = (
      <>
        <Tag color="blue">Drop-off OTP sent - waiting for the passenger to confirm</Tag>
        <Button size="small" loading={busy} disabled={secondsLeft > 0} onClick={() => send("drop")}>
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend OTP"}
        </Button>
      </>
    );
  }

  const payout = booking.riderPayoutStatus;
  return (
    <div className="rbc">
      <div className="rbc-actions">{action}</div>
      {payout === "HELD" && (
        <div className="rbc-payout">
          <WalletOutlined /> {money(booking.riderPayoutAmount)} paid by the passenger - released to you after the drop-off OTP is confirmed
        </div>
      )}
      {payout === "RELEASED" && (
        <div className="rbc-payout rbc-received">
          <CheckCircleFilled /> {money(booking.riderPayoutAmount)} payment received
        </div>
      )}
      {payout === "REFUNDED" && <div className="rbc-payout">Payment was refunded to the passenger</div>}
      <style>{`
        .rbc{margin-top:12px;padding-top:12px;border-top:1px dashed var(--border-light)}
        .rbc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
        .rbc-actions .ant-tag{margin:0;white-space:normal}
        .rbc-payout{margin-top:8px;font-size:12.5px;color:var(--text-secondary);display:flex;gap:6px;align-items:center}
        .rbc-received{color:#16a34a;font-weight:700}
      `}</style>
    </div>
  );
}
