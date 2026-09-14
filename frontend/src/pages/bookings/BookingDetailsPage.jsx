import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Descriptions, Button, App, Skeleton, Divider, Popconfirm, Modal, Form, Rate, Input } from "antd";
import dayjs from "dayjs";
import { bookingService } from "../../services/bookingService.js";
import { paymentService } from "../../services/paymentService.js";
import { ratingService } from "../../services/ratingService.js";
import StatusTag from "../../components/StatusTag.jsx";

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { message } = App.useApp();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateForm] = Form.useForm();
  const [rating, setRating] = useState(false);

  async function load() {
    setLoading(true);
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

  if (loading || !booking) return <Skeleton active />;

  const isFree = booking.ride.rideType === "WITHOUT_TIP";

  async function payAndConfirm() {
    setPaying(true);
    try {
      const order = await paymentService.createOrder(booking.id);
      await paymentService.verify({
        bookingId: booking.id,
        providerOrderId: order.orderId,
        providerPaymentId: order.providerPaymentId,
        signature: order.mockSignature,
      });
      message.success("Payment successful. Booking confirmed!");
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setPaying(false);
    }
  }

  async function cancelBooking() {
    setCancelling(true);
    try {
      await bookingService.cancel(booking.id, "Cancelled by passenger");
      message.success("Booking cancelled");
      load();
    } catch (err) {
      message.error(err.message);
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
      ["Tip", isFree ? "₹0" : `₹${booking.tipAmount}`],
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

  async function submitRating() {
    try {
      const values = await rateForm.validateFields();
      setRating(true);
      await ratingService.create({ bookingId: booking.id, revieweeId: booking.ride.riderId, ...values });
      message.success("Thanks for rating your ride!");
      setRateOpen(false);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message);
    } finally {
      setRating(false);
    }
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
          <Descriptions.Item label="Tip">{isFree ? "₹0" : `₹${booking.tipAmount}`}</Descriptions.Item>
          {!isFree && <Descriptions.Item label="Platform Fee">₹{booking.platformFee}</Descriptions.Item>}
          <Descriptions.Item label={<strong>Total</strong>}>
            <strong>₹{booking.totalAmount}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Payment status">
            <StatusTag status={booking.paymentStatus} />
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {booking.bookingStatus === "PAYMENT_PENDING" && (
            <Button type="primary" size="large" style={{ background: "#0f766e" }} loading={paying} onClick={payAndConfirm}>
              Pay &amp; Confirm
            </Button>
          )}
          {["PAYMENT_PENDING", "CONFIRMED"].includes(booking.bookingStatus) && !["STARTED", "COMPLETED"].includes(booking.ride.status) && (
            <Popconfirm title="Cancel this booking?" onConfirm={cancelBooking}>
              <Button size="large" danger loading={cancelling}>
                Cancel Booking
              </Button>
            </Popconfirm>
          )}
          {booking.ride.status === "COMPLETED" && booking.bookingStatus === "CONFIRMED" && (
            <Button size="large" onClick={() => setRateOpen(true)}>
              Rate this ride
            </Button>
          )}
          {booking.bookingStatus === "CONFIRMED" && (
            <Button size="large" onClick={downloadReceipt}>
              Download Receipt
            </Button>
          )}
        </div>
      </Card>

      <Modal title="Rate your ride" open={rateOpen} onCancel={() => setRateOpen(false)} onOk={submitRating} confirmLoading={rating} okText="Submit">
        <Form form={rateForm} layout="vertical">
          <Form.Item name="score" label="Score" rules={[{ required: true, message: "Please select a rating" }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Comment (optional)">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
