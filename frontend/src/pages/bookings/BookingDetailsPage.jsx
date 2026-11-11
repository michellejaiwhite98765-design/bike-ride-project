import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Card, Descriptions, Button, App, Divider, Popconfirm, Rate } from "antd";
import dayjs from "dayjs";
import { bookingService } from "../../services/bookingService.js";
import { RateDriverModal, DriverReviewsSheet } from "../../components/ride/DriverReviews.jsx";
import StatusTag from "../../components/StatusTag.jsx";
import BrandLoader from "../../components/ui/BrandLoader.jsx";
import PaymentModal, { fareBreakdown } from "../../components/booking/PaymentModal.jsx";
import { PassengerBoardingPanel } from "../../components/booking/BoardingPanels.jsx";
import LiveTrackingMap from "../../components/ride/LiveTrackingMap.jsx";

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { notification } = App.useApp();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  // Opened straight away when arriving from the ride page's "Pay" button.
  const navState = useLocation().state;
  const [payOpen, setPayOpen] = useState(Boolean(navState?.pay));
  const [cancelling, setCancelling] = useState(false);
  // Opened straight away from the "How was your ride?" notification.
  const [rateOpen, setRateOpen] = useState(Boolean(navState?.rate));
  const [reviewsOpen, setReviewsOpen] = useState(false);

  async function load() {
    // Full-page loader only the first time; later refreshes (after paying
    // or cancelling) update in place so open dialogs stay put.
    if (!booking) setLoading(true);
    try {
      setBooking(await bookingService.getById(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // While the trip is on, keep the page current so an OTP the rider sends
  // (or a rider-side change) shows up without a manual refresh.
  // The driver review opens as soon as the passenger is dropped off.
  const canRate = booking?.bookingStatus === "CONFIRMED" && (booking.boardingStatus === "DROPPED" || booking.ride?.status === "COMPLETED");
  const driverName = booking?.ride?.rider?.firstName || "your driver";
  const tripActive = booking && ["PUBLISHED", "STARTED"].includes(booking.ride?.status) && booking.bookingStatus !== "CANCELLED";
  useEffect(() => {
    if (!tripActive) return undefined;
    const timer = setInterval(() => load(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripActive, id]);

  if (loading || !booking) return <BrandLoader label="Loading booking…" />;

  // Free unless there's something to pay - a tipped ride, or a detour
  // pickup's extra fare on an otherwise free ride.
  const fare = fareBreakdown(booking);
  const isFree = fare.total === 0;

  async function cancelBooking() {
    setCancelling(true);
    try {
      await bookingService.cancel(booking.id, "Cancelled by passenger");
      notification.success({ title: "Success", description: "Booking cancelled" });
      load();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setCancelling(false);
    }
  }

  // Printable receipt built client-side from data already on this page - no
  // backend endpoint needed. Printed via a hidden iframe (rather than
  // window.open) so it can't be blocked by the browser's popup blocker;
  // the user can save it as a PDF or print it directly from the dialog.
  function downloadReceipt() {
    const rows = [
      ["Booking ID", booking.id],
      ["Rider", `${booking.ride.rider?.firstName ?? ""} ${booking.ride.rider?.lastName ?? ""}`.trim()],
      ["Route", `${booking.ride.sourceName} → ${booking.ride.destinationName}`],
      ["Date", dayjs(booking.ride.departureDate).format("DD MMM YYYY")],
      ["Time", booking.ride.departureTime],
      [
        "Vehicle",
        `${booking.ride.vehicle?.brand ?? ""} ${booking.ride.vehicle?.model ?? ""} (${booking.ride.vehicle?.registrationNumber ?? ""})`,
      ],
      ["Seats", booking.seats],
      ...(fare.rideFare > 0 ? [["Ride fare", `₹${fare.rideFare}`]] : []),
      ...(fare.detourExtra > 0 ? [["Detour pickup extra", `₹${fare.detourExtra}`]] : []),
      ...(isFree ? [] : [["Platform Fee", `₹${booking.platformFee}`]]),
      ["Total Paid", `₹${booking.totalAmount}`],
      ["Payment Status", booking.paymentStatus],
    ];
    const rowsHtml = rows
      .map(([label, value]) => `<tr><td class="label">${label}</td><td>${value}</td></tr>`)
      .join("");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
      <html><head><title>Receipt - ${booking.id}</title>
      <style>
        body { font-family: -apple-system, Segoe UI, Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #666; margin-bottom: 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .label { color: #666; width: 40%; }
        .total td { font-weight: 700; font-size: 16px; border-bottom: none; padding-top: 12px; }
      </style></head>
      <body>
        <h1>BikeRide — Trip Receipt</h1>
        <div class="sub">Issued ${dayjs().format("DD MMM YYYY, HH:mm")}</div>
        <table>${rowsHtml}</table>
      </body></html>`);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }



  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Card title="Booking Details" extra={<StatusTag status={booking.bookingStatus} />}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Rider">
            {booking.ride.rider?.firstName} {booking.ride.rider?.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Route">
            {booking.ride.sourceName} → {booking.ride.destinationName}
          </Descriptions.Item>
          <Descriptions.Item label="Date">{dayjs(booking.ride.departureDate).format("DD MMM YYYY")}</Descriptions.Item>
          <Descriptions.Item label="Time">{booking.ride.departureTime}</Descriptions.Item>
          <Descriptions.Item label="Vehicle">
            {booking.ride.vehicle?.brand} {booking.ride.vehicle?.model} ({booking.ride.vehicle?.registrationNumber})
          </Descriptions.Item>
          <Descriptions.Item label="Seats">{booking.seats}</Descriptions.Item>
          <Descriptions.Item label="Ride status">
            <StatusTag status={booking.ride.status} />
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Descriptions column={1} size="small">
          {isFree && <Descriptions.Item label="Fare">Free ride</Descriptions.Item>}
          {fare.rideFare > 0 && <Descriptions.Item label="Ride fare">₹{fare.rideFare}</Descriptions.Item>}
          {fare.detourExtra > 0 && <Descriptions.Item label="Detour pickup extra">₹{fare.detourExtra}</Descriptions.Item>}
          {!isFree && <Descriptions.Item label="Platform Fee">₹{booking.platformFee}</Descriptions.Item>}
          <Descriptions.Item label={<strong>Total</strong>}>
            <strong>₹{booking.totalAmount}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Payment status">
            <StatusTag status={booking.paymentStatus} />
          </Descriptions.Item>
        </Descriptions>

        {booking.paymentStatus === "SUCCESS" && (
          <div className="bd-paid">✓ Paid ₹{booking.totalAmount} - your seat is confirmed</div>
        )}
        {booking.bookingStatus === "PAYMENT_PENDING" && (
          <div className="bd-due">Pay within 30 minutes of being accepted, or the seat is released.</div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {booking.bookingStatus === "PAYMENT_PENDING" && (
            <Button type="primary" size="large" style={{ background: "linear-gradient(135deg,#2DD4BF,#8B5CF6)", border: "none", fontWeight: 700 }} onClick={() => setPayOpen(true)}>
              Pay ₹{booking.totalAmount}
            </Button>
          )}
          {["PAYMENT_PENDING", "CONFIRMED"].includes(booking.bookingStatus) && !["STARTED", "COMPLETED"].includes(booking.ride.status) && (
            <Popconfirm title="Cancel this booking?" onConfirm={cancelBooking}>
              <Button size="large" danger loading={cancelling}>
                Cancel Booking
              </Button>
            </Popconfirm>
          )}
          {booking.bookingStatus === "CONFIRMED" && (
            <Button size="large" onClick={downloadReceipt}>
              Download Receipt
            </Button>
          )}
        </div>

        <PassengerBoardingPanel booking={booking} onChanged={load} />

        {canRate && (
          <div className="bd-review">
            {booking.myDriverRating ? (
              <>
                <div className="bd-review-title">Your review of {driverName}</div>
                <Rate disabled value={booking.myDriverRating.score} />
                {booking.myDriverRating.comment && <p className="bd-review-comment">{booking.myDriverRating.comment}</p>}
              </>
            ) : (
              <>
                <div className="bd-review-title">How was your ride with {driverName}?</div>
                <Rate value={0} onChange={() => setRateOpen(true)} style={{ fontSize: 28 }} />
                <Button type="primary" block size="large" style={{ marginTop: 10 }} onClick={() => setRateOpen(true)}>
                  Rate your driver
                </Button>
              </>
            )}
            <Button type="link" onClick={() => setReviewsOpen(true)} style={{ paddingLeft: 0 }}>See all reviews of {driverName}</Button>
          </div>
        )}
      </Card>

      {tripActive && booking.boardingStatus !== "DROPPED" && (
        <div style={{ marginTop: 16 }}>
          {/* Live map from acceptance: the rider's position, your pickup point and you. */}
          <LiveTrackingMap ride={booking.ride} isOwner={false} autoShare />
        </div>
      )}

      <PaymentModal
        booking={booking}
        open={payOpen && booking.bookingStatus === "PAYMENT_PENDING" || payOpen === "done"}
        onClose={() => setPayOpen(false)}
        onPaid={() => {
          setPayOpen("done");
          load();
        }}
        onViewReceipt={downloadReceipt}
      />

      <style>{`
        .bd-review{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(234,179,8,.4);background:rgba(234,179,8,.08);text-align:center}
        .bd-review-title{font-weight:800;margin-bottom:6px}
        .bd-review-comment{margin:6px 0 0;color:var(--text-secondary)}
        .bd-paid{margin-top:16px;padding:10px 14px;border-radius:12px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.4);color:#16a34a;font-weight:700}
        .bd-due{margin-top:16px;padding:10px 14px;border-radius:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);color:#d97706;font-size:13px;font-weight:600}
      `}</style>

      {canRate && !booking.myDriverRating && (
        <RateDriverModal booking={booking} open={rateOpen} onClose={() => setRateOpen(false)} onDone={load} />
      )}
      <DriverReviewsSheet driver={booking.ride.rider} open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
    </div>
  );
}
