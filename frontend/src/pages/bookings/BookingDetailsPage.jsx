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
