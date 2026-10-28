import { useEffect, useState } from "react";
import { Modal, Form, DatePicker, TimePicker, InputNumber, Button, App, Alert } from "antd";
import { ArrowRightOutlined, EnvironmentOutlined, CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../../services/rideService.js";

// A rider may only have one open trip at a time (mirrors the backend rule).
const OPEN_STATUSES = ["DRAFT", "PUBLISHED", "STARTED"];
export const OPEN_TRIP_MESSAGE = "Complete or cancel your current trip before creating a new one";

/**
 * Why a ride can't be cloned at all (null when it can). Cloning re-uses the
 * same vehicle, so the vehicle has to still be usable, and the rider can't
 * have another open trip.
 */
export function getCloneBlockReason(ride, rides = []) {
  if (rides.some((r) => OPEN_STATUSES.includes(r.status))) return OPEN_TRIP_MESSAGE;
  const vehicle = ride?.vehicle;
  if (!vehicle) return "Vehicle details are missing for this ride";
  if (vehicle.isActive === false) return "This vehicle has been removed";
  if (vehicle.verificationStatus && vehicle.verificationStatus !== "VERIFIED") {
    return "This vehicle is not verified";
  }
  return null;
}

function combine(date, time) {
  return date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0);
}

/**
 * Copies a ride (route, vehicle, seats, tip, notes, pickup preference) into a
 * new ride on a date/time the user picks. `rides` is the user's current list,
 * used to catch an already-open trip before the request is even sent (the
 * backend enforces the same rule).
 */
export default function CloneRideModal({ ride, rides = [], open, onClose, onCloned }) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(null); // "draft" | "publish" | null
  const [error, setError] = useState(null);
  const departureDate = Form.useWatch("departureDate", form);

  const seatCapacity = ride?.vehicle?.seatCapacity ?? ride?.totalSeats ?? 1;

  useEffect(() => {
    if (!open || !ride) return;
    setError(null);
    form.setFieldsValue({
      // Tomorrow, same time of day - the original date is already (or about
      // to be) taken, and a clone on the same slot is rejected anyway.
      departureDate: dayjs().add(1, "day"),
      departureTime: dayjs(ride.departureTime, "HH:mm"),
      availableSeats: Math.min(ride.totalSeats ?? ride.availableSeats ?? 1, seatCapacity),
    });
  }, [open, ride, form, seatCapacity]);

  async function submit(publish) {
    setError(null);
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const blocked = getCloneBlockReason(ride, rides);
    if (blocked) {
      setError(blocked);
      return;
    }
    setSubmitting(publish ? "publish" : "draft");
    try {
      const payload = {
        vehicleId: ride.vehicleId,
        sourceName: ride.sourceName,
        sourceLatitude: Number(ride.sourceLatitude),
        sourceLongitude: Number(ride.sourceLongitude),
        destinationName: ride.destinationName,
        destinationLatitude: Number(ride.destinationLatitude),
        destinationLongitude: Number(ride.destinationLongitude),
        pickupPreference: ride.pickupPreference || "ON_ROUTE",
        departureDate: values.departureDate.format("YYYY-MM-DD"),
        departureTime: values.departureTime.format("HH:mm"),
        availableSeats: values.availableSeats,
        rideType: ride.rideType,
        tipAmount: ride.rideType === "WITHOUT_TIP" ? 0 : Number(ride.tipAmount),
        ...(ride.notes ? { notes: ride.notes } : {}),
      };

      let created = await rideService.create(payload);
      if (publish && created.status === "DRAFT") {
        created = await rideService.publish(created.id);
      }
      notification.success({ title: "Success", description: publish ? "Ride cloned and published" : "Ride cloned as draft" });
      onCloned?.(created);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't clone this ride");
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null;

  return (
    <Modal
      title="Clone ride"
      open={open}
      onCancel={busy ? undefined : onClose}
      maskClosable={!busy}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose} disabled={busy}>
          Cancel
        </Button>,
        <Button
          key="draft"
          onClick={() => submit(false)}
          loading={submitting === "draft"}
          disabled={submitting === "publish"}
        >
          Clone as draft
        </Button>,
        <Button
          key="publish"
          type="primary"
          onClick={() => submit(true)}
          loading={submitting === "publish"}
          disabled={submitting === "draft"}
        >
          Clone &amp; publish
        </Button>,
      ]}
    >
      {ride && (
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <EnvironmentOutlined style={{ color: "#2DD4BF" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ride.sourceName?.split(",")[0]} <ArrowRightOutlined style={{ fontSize: 11 }} />{" "}
              {ride.destinationName?.split(",")[0]}
            </span>
          </div>
          <div style={{ marginTop: 6, color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
            <CarOutlined /> {ride.vehicle?.brand} {ride.vehicle?.model} · {ride.vehicle?.registrationNumber}
          </div>
        </div>
      )}

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="departureDate"
          label="Departure date"
          rules={[
            { required: true, message: "Pick a departure date" },
            {
              validator: (_, value) =>
                !value || !value.isBefore(dayjs().startOf("day"))
                  ? Promise.resolve()
                  : Promise.reject(new Error("Departure date can't be in the past")),
            },
          ]}
        >
          <DatePicker
            style={{ width: "100%" }}
            disabledDate={(d) => d && (d < dayjs().startOf("day") || d > dayjs().add(12, "week").endOf("day"))}
          />
        </Form.Item>

        <Form.Item
          name="departureTime"
          label="Departure time"
          dependencies={["departureDate"]}
          rules={[
            { required: true, message: "Pick a departure time" },
            ({ getFieldValue }) => ({
              validator: (_, value) => {
                const date = getFieldValue("departureDate");
                if (!value || !date) return Promise.resolve();
                return combine(date, value).isBefore(dayjs())
                  ? Promise.reject(new Error("Departure time can't be in the past"))
                  : Promise.resolve();
              },
            }),
          ]}
        >
          <TimePicker
            style={{ width: "100%" }}
            format="h:mm A"
            minuteStep={1}
            disabledTime={() => {
              if (!departureDate || !departureDate.isSame(dayjs(), "day")) return {};
              const now = dayjs();
              return {
                disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
                disabledMinutes: (hour) =>
                  hour === now.hour() ? Array.from({ length: now.minute() + 1 }, (_, i) => i) : [],
              };
            }}
          />
        </Form.Item>

        <Form.Item
          name="availableSeats"
          label={`Available seats (max ${seatCapacity})`}
          rules={[
            { required: true, message: "Enter the number of seats" },
            {
              type: "number",
              min: 1,
              max: seatCapacity,
              message: `Seats must be between 1 and ${seatCapacity}`,
            },
          ]}
        >
          <InputNumber min={1} max={seatCapacity} precision={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
