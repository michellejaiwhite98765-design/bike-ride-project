import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, InputNumber, Select, DatePicker, Radio, Button, App, Skeleton, Alert, Checkbox, Modal, Space } from "antd";
import {
  EnvironmentOutlined,
  CarOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  AimOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { vehicleService } from "../../services/vehicleService.js";
import { rideService } from "../../services/rideService.js";
import LocationFields from "../../components/LocationFields.jsx";
import RideCreationMap from "../../components/RideCreationMap.jsx";
import colors from "../../theme/colors.js";
import { ErrorState } from "../../components/ui/index.js";
import useOnlineStatus from "../../hooks/useOnlineStatus.js";
import { haversineKm, reverseGeocode, countryMismatch } from "../../utils/geo.js";
import { parseSharedLocationLink, isShortLink } from "../../utils/parseSharedLocation.js";
import { TIP_RATE_PER_KM } from "../../constants/pricing.js";

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px 24px 100px;
  min-height: 100%;
  background:
    radial-gradient(circle at 90% 8%, rgba(167, 139, 250, 0.14), transparent 28%),
    radial-gradient(circle at 8% 25%, rgba(45, 212, 191, 0.14), transparent 26%),
    linear-gradient(180deg, #05070d 0%, #05070d 58%, #0B0F17 100%);

  @media (max-width: 600px) {
    padding: 14px 14px 100px;
  }
`;

const CreateRideGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 0.8fr) minmax(520px, 1.2fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

const FormColumn = styled.div`
  min-width: 0;
`;

const MapColumn = styled.div`
  position: sticky;
  top: 24px;
  min-width: 0;

  @media (max-width: 1050px) {
    position: relative;
    top: auto;
    order: -1;
  }
`;

const RouteMapCard = styled(Card)`
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(11, 15, 23, 0.85);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);

  .ant-card-body {
    padding: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 32px 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.textPrimary};

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    font-size: 15px;
    color: #2DD4BF;
    background: rgba(45, 212, 191, 0.12);
  }

  &:first-of-type {
    margin-top: 0;
  }
`;

const FormCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(11, 15, 23, 0.85);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding: 16px 0;

  @media (max-width: 600px) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    gap: 8px;
    padding: 16px;
    background: ${colors.bgPrimary};
    border-top: 1px solid ${colors.border};
    margin: 0;
    max-width: none;

    button {
      flex: 1;
    }
  }
`;

export default function CreateRidePage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [sharedLinkInput, setSharedLinkInput] = useState("");
  const [termsModal, setTermsModal] = useState(null); // "terms" | "security" | null
  const isOnline = useOnlineStatus();
  const rideType = Form.useWatch("rideType", form) || "WITHOUT_TIP";
  const vehicleId = Form.useWatch("vehicleId", form);
  const sourceLatitude = Form.useWatch("sourceLatitude", form);
  const sourceLongitude = Form.useWatch("sourceLongitude", form);
  const destinationLatitude = Form.useWatch("destinationLatitude", form);
  const destinationLongitude = Form.useWatch("destinationLongitude", form);

  const sourcePoint = sourceLatitude != null && sourceLongitude != null
    ? { latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) }
    : null;
  const destinationPoint = destinationLatitude != null && destinationLongitude != null
    ? { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) }
    : null;
  const distanceKm = sourcePoint && destinationPoint
    ? haversineKm(sourcePoint.latitude, sourcePoint.longitude, destinationPoint.latitude, destinationPoint.longitude)
    : null;

  // Only verified vehicles can be used to create a ride (the backend rejects
  // unverified ones anyway) - filter them out of the picker entirely instead
  // of letting the user select one just to get a submit-time error.
  const verifiedVehicles = vehicles.filter((v) => v.verificationStatus === "VERIFIED");
  const selectedVehicle = verifiedVehicles.find((v) => v.id === vehicleId);
  const maxSeats = selectedVehicle?.seatCapacity ?? 1;

  // Suggested tip = distance x rate, prefilled but still editable - recomputes
  // whenever the route or ride type changes while WITH_TIP is selected.
  // Skipped while the initial data load is in flight so opening an existing
  // ride for edit doesn't silently overwrite its already-set tip amount.
  useEffect(() => {
    if (loading) return;
    if (rideType === "WITH_TIP" && distanceKm != null) {
      form.setFieldValue("tipAmount", Math.round(distanceKm * TIP_RATE_PER_KM));
    } else if (rideType === "WITHOUT_TIP") {
      form.setFieldValue("tipAmount", 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideType, distanceKm]);

  async function applyPoint(prefix, latitude, longitude) {
    try {
      const { name, country } = await reverseGeocode(latitude, longitude);
      const mismatchError = countryMismatch(form, prefix, country);
      if (mismatchError) {
        message.error(mismatchError);
        return false;
      }
      form.setFieldsValue({
        [`${prefix}Name`]: name.slice(0, 150),
        [`${prefix}Latitude`]: latitude,
        [`${prefix}Longitude`]: longitude,
        [`${prefix}Country`]: country,
      });
      return true;
    } catch {
      message.error("Could not resolve this location");
      return false;
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      message.error("Geolocation is not supported by your browser");
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyPoint("source", pos.coords.latitude, pos.coords.longitude);
        setLocatingMe(false);
      },
      () => {
        message.error("Could not access your location. Please allow location permission.");
        setLocatingMe(false);
      }
    );
  }

  async function applySharedLink(prefix) {
    const point = parseSharedLocationLink(sharedLinkInput);
    if (!point) {
      message.error(
        isShortLink(sharedLinkInput)
          ? "Short links can't be read directly — open it and paste the full Google Maps link instead."
          : "Couldn't read a location from that link. Paste the full Google Maps (or WhatsApp shared location) link."
      );
      return;
    }
    const ok = await applyPoint(prefix, point.latitude, point.longitude);
    if (ok) setSharedLinkInput("");
  }

  function handleVehicleChange() {
    const vehicle = verifiedVehicles.find((v) => v.id === form.getFieldValue("vehicleId"));
    const cap = vehicle?.seatCapacity ?? 1;
    if (form.getFieldValue("availableSeats") > cap) {
      form.setFieldValue("availableSeats", cap);
    }
  }

  function handleReset() {
    form.resetFields();
    setSharedLinkInput("");
  }

  useEffect(() => {
    async function load() {
      const myVehicles = await vehicleService.list();
      setVehicles(myVehicles);

      if (isEdit) {
        const ride = await rideService.getById(id);
        form.setFieldsValue({
          ...ride,
          departureDate: dayjs(ride.departureDate),
          tipAmount: Number(ride.tipAmount),
        });
      } else {
        form.setFieldsValue({ rideType: "WITHOUT_TIP", tipAmount: 0, availableSeats: 1, pickupPreference: "ON_ROUTE" });
      }
      setLoading(false);
    }
    load();
  }, [id, isEdit, form]);

  async function submit(publish) {
    if (!isOnline) {
      message.error("No Internet Connection");
      return;
    }
    try {
      const values = await form.validateFields();
      if (!values.sourceLatitude || !values.sourceLongitude) {
        message.error("Please select a start location");
        return;
      }
      if (!values.destinationLatitude || !values.destinationLongitude) {
        message.error("Please select an end location");
        return;
      }
      if (values.sourceCountry && values.destinationCountry && values.sourceCountry !== values.destinationCountry) {
        message.error("Start and end locations must be in the same country");
        return;
      }
      setSubmitting(true);
      const { agreeTerms: _agreeTerms, agreeSecurity: _agreeSecurity, sourceCountry: _sourceCountry, destinationCountry: _destinationCountry, ...rest } = values;
      const payload = { ...rest, departureDate: values.departureDate.format("YYYY-MM-DD") };
      if (values.rideType === "WITHOUT_TIP") payload.tipAmount = 0;

      let ride;
      if (isEdit) {
        ride = await rideService.update(id, payload);
      } else {
        ride = await rideService.create(payload);
      }

      if (publish && ride.status === "DRAFT") {
        ride = await rideService.publish(ride.id);
      }

      message.success(publish ? "Ride published" : "Ride saved as draft");
      navigate(`/rides/${ride.id}`);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOnline) {
    return (
      <ErrorState
        title="No Internet Connection"
        description="Check your connection and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading) return <Skeleton active />;

  if (verifiedVehicles.length === 0) {
    const hasPendingVehicles = vehicles.length > 0;
    return (
      <Alert
        type="warning"
        showIcon
        message={hasPendingVehicles ? "Vehicle verification pending" : "Add a vehicle first"}
        description={
          hasPendingVehicles
            ? "Your vehicle is still being verified. You'll be able to create a ride once it's verified."
            : "You need at least one verified vehicle before you can create a ride."
        }
        action={
          !hasPendingVehicles && (
            <Button size="small" onClick={() => navigate("/vehicles/add")}>
              Add Vehicle
            </Button>
          )
        }
      />
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
          {isEdit ? "Edit Your Ride" : "Create a New Ride"}
        </h1>
        <p style={{ margin: "8px 0 0", color: colors.textSecondary }}>
          {isEdit ? "Update your ride details below" : "Fill in your ride details to get started"}
        </p>
      </div>

      <CreateRideGrid>
        <FormColumn>
          <Form form={form} layout="vertical" requiredMark={false}>
        <SectionHeader>
          <EnvironmentOutlined className="icon" />
          Route
        </SectionHeader>
        <FormCard>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<AimOutlined />} loading={locatingMe} onClick={useCurrentLocation}>
              Use my current location as start
            </Button>
          </div>

          <LocationFields
            prefix="source"
            label="Start Location"
            placeholder="Where does your ride start?"
          />

          <LocationFields
            prefix="destination"
            label="End Location"
            placeholder="Where does your ride end?"
          />

          <Form.Item label="Or paste a shared location link" extra="Works with Google Maps and WhatsApp-shared location links.">
            <Space.Compact style={{ display: "flex" }}>
              <Input
                prefix={<LinkOutlined />}
                placeholder="https://maps.google.com/..."
                value={sharedLinkInput}
                onChange={(e) => setSharedLinkInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button onClick={() => applySharedLink("source")}>Set as start</Button>
              <Button onClick={() => applySharedLink("destination")}>Set as end</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="pickupPreference"
            label="Passenger Pickup Preference"
            rules={[{ required: true, message: "Please choose how you want to pick up passengers" }]}
            extra="Choose whether you will pick passengers along your route or go to their location."
          >
            <Select
              size="large"
              placeholder="How should passenger pickup work?"
              options={[
                {
                  value: "ON_ROUTE",
                  label: "Pick up passenger along my route",
                },
                {
                  value: "PASSENGER_LOCATION",
                  label: "Pick up passenger from their location",
                },
              ]}
            />
          </Form.Item>
        </FormCard>

        {/* Schedule Section */}
        <SectionHeader>
          <ClockCircleOutlined className="icon" />
          Schedule
        </SectionHeader>
        <FormCard>
          <Form.Item name="departureDate" label="Departure Date" rules={[{ required: true }]}>
            <DatePicker size="large" style={{ width: "100%" }} disabledDate={(d) => d && d < dayjs().startOf("day")} />
          </Form.Item>
          <Form.Item name="departureTime" label="Departure Time" rules={[{ required: true, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Use HH:mm format" }]}>
            <Input size="large" placeholder="08:00" />
          </Form.Item>
        </FormCard>

        {/* Vehicle & Capacity Section */}
        <SectionHeader>
          <CarOutlined className="icon" />
          Vehicle & Capacity
        </SectionHeader>
        <FormCard>
          <Form.Item name="vehicleId" label="Vehicle" rules={[{ required: true }]}>
            <Select
              size="large"
              placeholder="Select a verified vehicle"
              onChange={handleVehicleChange}
              options={verifiedVehicles.map((v) => ({
                value: v.id,
                label: (
                  <span>
                    <b>{v.brand} {v.model}</b>
                    {" · "}
                    <span style={{ textTransform: "capitalize" }}>{v.color}</span>
                    {" · "}
                    {v.registrationNumber}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="availableSeats"
            label="Available Seats"
            rules={[{ required: true }]}
            extra={selectedVehicle ? `This vehicle carries up to ${maxSeats} passenger${maxSeats === 1 ? "" : "s"}.` : undefined}
          >
            <InputNumber size="large" style={{ width: "100%" }} min={1} max={maxSeats} />
          </Form.Item>
        </FormCard>

        {/* Payment Section */}
        <SectionHeader>
          <DollarCircleOutlined className="icon" />
          Payment
        </SectionHeader>
        <FormCard>
          <Form.Item name="rideType" label="Ride Type" rules={[{ required: true }]}>
            <Radio.Group size="large" style={{ display: "flex" }}>
              <Radio.Button value="WITHOUT_TIP" style={{ flex: 1, textAlign: "center" }}>
                Without Tip
              </Radio.Button>
              <Radio.Button value="WITH_TIP" style={{ flex: 1, textAlign: "center" }}>
                With Tip
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          {rideType === "WITH_TIP" && (
            <Form.Item
              name="tipAmount"
              label="Tip Amount (₹)"
              rules={[{ required: true, type: "number", min: 1, message: "Tip must be greater than 0" }]}
              extra={distanceKm != null ? `Suggested from distance: ${distanceKm.toFixed(1)} km × ₹${TIP_RATE_PER_KM}/km. Feel free to adjust.` : undefined}
            >
              <InputNumber size="large" style={{ width: "100%" }} min={1} placeholder="Enter tip amount" />
            </Form.Item>
          )}
        </FormCard>

        {/* Additional Info Section */}
        <SectionHeader>
          <FileTextOutlined className="icon" />
          Additional Information
        </SectionHeader>
        <FormCard>
          <Form.Item name="notes" label="Notes for Passengers (optional)">
            <Input.TextArea rows={3} maxLength={500} placeholder="E.g., air conditioning available, prefer quiet ride, etc." showCount />
          </Form.Item>
        </FormCard>

        {/* Terms Section */}
        <SectionHeader>
          <SafetyCertificateOutlined className="icon" />
          Terms &amp; Safety
        </SectionHeader>
        <FormCard>
          <Form.Item
            name="agreeTerms"
            valuePropName="checked"
            rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error("You must accept the Terms & Conditions"))) }]}
          >
            <Checkbox>
              I agree to the{" "}
              <a onClick={(e) => { e.preventDefault(); setTermsModal("terms"); }}>Terms &amp; Conditions</a>
            </Checkbox>
          </Form.Item>
          <Form.Item
            name="agreeSecurity"
            valuePropName="checked"
            rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error("You must accept the Security Terms"))) }]}
          >
            <Checkbox>
              I agree to the{" "}
              <a onClick={(e) => { e.preventDefault(); setTermsModal("security"); }}>Security &amp; Safety Terms</a>
            </Checkbox>
          </Form.Item>
        </FormCard>

        {/* Action Buttons */}
        <ActionButtons>
          <Button size="large" icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button size="large" block loading={submitting} onClick={() => submit(false)} style={{ background: colors.bgSecondary }}>
            Save as Draft
          </Button>
          <Button size="large" type="primary" block loading={submitting} style={{ background: colors.primary }} onClick={() => submit(true)}>
            Publish Ride
          </Button>
        </ActionButtons>
          </Form>
        </FormColumn>

        <MapColumn>
          <RouteMapCard>
            <RideCreationMap source={sourcePoint} destination={destinationPoint} form={form} />
          </RouteMapCard>
        </MapColumn>
      </CreateRideGrid>

      <Modal title="Terms & Conditions" open={termsModal === "terms"} onCancel={() => setTermsModal(null)} footer={null}>
        <p>By publishing a ride, you agree that:</p>
        <ul>
          <li>The information you provide about your route, vehicle, and departure time is accurate.</li>
          <li>You will not use the platform for any commercial taxi-style service; tips are voluntary, not a fare.</li>
          <li>You are responsible for holding a valid license and any insurance required to operate your vehicle.</li>
          <li>Passengers may cancel a confirmed booking subject to this platform's cancellation rules.</li>
          <li>BikeRide may suspend accounts that violate community guidelines or receive verified safety reports.</li>
        </ul>
      </Modal>

      <Modal title="Security & Safety Terms" open={termsModal === "security"} onCancel={() => setTermsModal(null)} footer={null}>
        <p>For everyone's safety:</p>
        <ul>
          <li>Never share payment details, passwords, or OTPs with another rider or passenger.</li>
          <li>Verify the rider/vehicle details shown in-app match the person and vehicle you meet.</li>
          <li>Use the in-app "Report User" option for any safety concern during or after a ride.</li>
          <li>The SOS feature is a reminder only and does not connect to emergency services directly — always call local emergency services for urgent situations.</li>
          <li>Ride data (route, timing) may be shared with the other party in a confirmed booking for coordination purposes.</li>
        </ul>
      </Modal>
    </PageContainer>
  );
}
