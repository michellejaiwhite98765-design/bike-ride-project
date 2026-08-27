import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, InputNumber, Select, DatePicker, Radio, Button, App, Skeleton, Alert } from "antd";
import { EnvironmentOutlined, CarOutlined, ClockCircleOutlined, DollarCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { vehicleService } from "../../services/vehicleService.js";
import { rideService } from "../../services/rideService.js";
import LocationFields from "../../components/LocationFields.jsx";
import RideCreationMap from "../../components/RideCreationMap.jsx";
import colors from "../../theme/colors.js";

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px 24px 100px;
  min-height: 100%;
  background:
    radial-gradient(circle at 90% 8%, rgba(224, 231, 255, 0.65), transparent 28%),
    radial-gradient(circle at 8% 25%, rgba(219, 234, 254, 0.55), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 58%, #f8fafc 100%);

  @media (max-width: 600px) {
    padding: 14px 14px 100px;
  }
`;

const CreateRideGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(460px, 1.1fr);
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
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 24px 60px rgba(37, 99, 235, 0.10);
  backdrop-filter: blur(18px);

  .ant-card-body {
    padding: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 32px 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.textPrimary};

  .icon {
    font-size: 18px;
    color: ${colors.primary};
  }

  &:first-of-type {
    margin-top: 0;
  }
`;

const FormCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
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
  const rideType = Form.useWatch("rideType", form) || "WITHOUT_TIP";
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
      setSubmitting(true);
      const payload = { ...values, departureDate: values.departureDate.format("YYYY-MM-DD") };
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

  if (loading) return <Skeleton active />;

  if (vehicles.length === 0) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Add a vehicle first"
        description="You need at least one vehicle before you can create a ride."
        action={
          <Button
style={{ backgroundColor: "#2563e3" }}           size="small" onClick={() => navigate("/vehicles/add")}>
            Add Vehicle
          </Button>
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
              placeholder="Select a vehicle"
              options={vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registrationNumber})` }))}
            />
          </Form.Item>
          <Form.Item name="availableSeats" label="Available Seats" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: "100%" }} min={1} max={6} />
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
            <Form.Item name="tipAmount" label="Tip Amount (₹)" rules={[{ required: true, type: "number", min: 1, message: "Tip must be greater than 0" }]}>
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

        {/* Action Buttons */}
        <ActionButtons>
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
    </PageContainer>
  );
}
