import { useEffect, useMemo, useState } from "react";
import { DayStrip, TimeChips, START_GRACE_MIN } from "../../components/ride/DayStripPicker.jsx";
import SeatStepper from "../../components/ride/SeatStepper.jsx";
import PickupFareInfo from "../../components/ride/PickupFareInfo.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Drawer, Form, Input, InputNumber, Select, Radio, Button, App, Alert, Checkbox, Modal } from "antd";
import {
  EnvironmentOutlined,
  CarOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  AimOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  TeamOutlined,
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
import useAutoCurrentLocation from "../../hooks/useAutoCurrentLocation.js";
import { haversineKm, reverseGeocode, countryMismatch, UnknownLocationError, UNKNOWN_LOCATION_MESSAGE } from "../../utils/geo.js";
import { locationService } from "../../services/locationService.js";
import { tipRateForKm } from "../../constants/pricing.js";
import BrandLoader from "../../components/ui/BrandLoader.jsx";
import RiderChecklist, { licenceLaterKey } from "../../components/ride/RiderChecklist.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import VehicleFormPage from "../vehicles/VehicleFormPage.jsx";
import { useRiderStatus } from "../../hooks/useRiderStatus.js";

// Start trip: the rider must be within this distance of the starting point (the server checks the same).
const START_MAX_DISTANCE_M = 500;

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
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: none;
  backdrop-filter: blur(6px);
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
      min-width: 0;
      padding-inline: 8px;
    }
  }
`;

export default function CreateRidePage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [vehicles, setVehicles] = useState([]);
  const [openTrip, setOpenTrip] = useState(null); // the rider's current un-closed ride, if any
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(null); // "draft" | "publish" | null
  const [locatingMe, setLocatingMe] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false); // "Add vehicle" panel
  const [termsModal, setTermsModal] = useState(null); // "terms" | "security" | null
  const [selectedRoute, setSelectedRoute] = useState(null);
  // Editing: the route saved with the trip, so the map re-selects it.
  const [savedPath, setSavedPath] = useState(null);
  const isOnline = useOnlineStatus();
  const { status: riderStatus } = useRiderStatus();
  // "Add later" on the licence step, remembered for this user on this device.
  const { user } = useAuth();
  const [licenceLater, setLicenceLater] = useState(() => {
    try { return Boolean(user?.id && localStorage.getItem(licenceLaterKey(user.id))); } catch { return false; }
  });
  const skipLicence = () => {
    try { if (user?.id) localStorage.setItem(licenceLaterKey(user.id), "1"); } catch { /* private mode: just this visit */ }
    setLicenceLater(true);
  };
  useAutoCurrentLocation(form, "source", { enabled: !isEdit && !loading });
  const rideType = Form.useWatch("rideType", form) || "WITHOUT_TIP";
  const vehicleId = Form.useWatch("vehicleId", form);
  const departureDate = Form.useWatch("departureDate", form);
  const watchedTip = Form.useWatch("tipAmount", form);
  const watchedPref = Form.useWatch("pickupPreference", form);
  const sourceLatitude = Form.useWatch("sourceLatitude", form);
  const sourceLongitude = Form.useWatch("sourceLongitude", form);
  const destinationLatitude = Form.useWatch("destinationLatitude", form);
  const destinationLongitude = Form.useWatch("destinationLongitude", form);
  const sourceName = Form.useWatch("sourceName", form);
  const destinationName = Form.useWatch("destinationName", form);

  // Memoized so the map only re-fits/re-flies when the actual coordinates
  // change, not on every unrelated re-render (typing in Notes, ticking a
  // checkbox, etc). A fresh object literal here on every render would give
  // RideCreationMap's fitBounds effect a "new" source/destination each
  // time, restarting its fly animation - visible as the map blinking.
  const sourcePoint = useMemo(
    () =>
      sourceLatitude != null && sourceLongitude != null
        ? { latitude: Number(sourceLatitude), longitude: Number(sourceLongitude), name: sourceName }
        : null,
    [sourceLatitude, sourceLongitude, sourceName]
  );
  const destinationPoint = useMemo(
    () =>
      destinationLatitude != null && destinationLongitude != null
        ? { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude), name: destinationName }
        : null,
    [destinationLatitude, destinationLongitude, destinationName]
  );
  // Prefers the actually-selected driving route's real distance over the
  // straight-line haversine fallback, so the tip suggestion (and anything
  // else derived from distanceKm) matches the road the rider picked.
  const distanceKm = selectedRoute?.distanceKm != null
    ? selectedRoute.distanceKm
    : sourcePoint && destinationPoint
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
      form.setFieldValue("tipAmount", Math.round(distanceKm * tipRateForKm(distanceKm)));
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
        notification.error({ title: "Error", description: mismatchError });
        return false;
      }
      form.setFieldsValue({
        [`${prefix}Name`]: name.slice(0, 150),
        [`${prefix}Latitude`]: latitude,
        [`${prefix}Longitude`]: longitude,
        [`${prefix}Country`]: country,
      });
      return true;
    } catch (err) {
      notification.error({ title: "Error", description: err instanceof UnknownLocationError ? UNKNOWN_LOCATION_MESSAGE : "Could not resolve this location" });
      return false;
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      notification.error({ title: "Error", description: "Geolocation is not supported by your browser" });
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyPoint("source", pos.coords.latitude, pos.coords.longitude);
        setLocatingMe(false);
      },
      () => {
        notification.error({ title: "Error", description: "Could not access your location. Please allow location permission." });
        setLocatingMe(false);
      }
    );
  }

  function handleVehicleChange() {
    const vehicle = verifiedVehicles.find((v) => v.id === form.getFieldValue("vehicleId"));
    const cap = vehicle?.seatCapacity ?? 1;
    if (form.getFieldValue("availableSeats") > cap) {
      form.setFieldValue("availableSeats", cap);
    }
  }

  // "Add vehicle" finished: refresh the list and pick the new vehicle if it's verified.
  async function handleVehicleAdded(added) {
    setAddingVehicle(false);
    const myVehicles = await vehicleService.list();
    setVehicles(myVehicles);
    const fresh = myVehicles.find((v) => v.id === added?.id);
    if (fresh?.verificationStatus === "VERIFIED") {
      form.setFieldValue("vehicleId", fresh.id);
      const cap = fresh.seatCapacity ?? 1;
      if ((form.getFieldValue("availableSeats") || 1) > cap) form.setFieldValue("availableSeats", cap);
      notification.success({ title: "Vehicle added", description: `${fresh.brand} ${fresh.model} is selected for this trip.` });
    }
  }

  useEffect(() => {
    async function load() {
      const myVehicles = await vehicleService.list();
      setVehicles(myVehicles);

      if (isEdit) {
        const ride = await rideService.getById(id);
        // Started, or a passenger has asked to join: send the rider back with the reason.
        if (ride.canEdit === false) {
          notification.info({ title: "Can't edit this trip", description: ride.editBlockedReason, duration: 6 });
          navigate(`/rides/${id}`, { replace: true });
          return;
        }
        setSavedPath(ride.routePath || null);
        form.setFieldsValue({
          ...ride,
          departureDate: dayjs(ride.departureDate),
          departureTime: dayjs(ride.departureTime, "HH:mm"),
          tipAmount: Number(ride.tipAmount),
        });
      } else {
        // One open trip at a time: look for a draft/published/started ride
        // so the form can explain why it's locked instead of failing on submit.
        try {
          const mine = await rideService.listMine();
          setOpenTrip((Array.isArray(mine) ? mine : []).find((r) => ["DRAFT", "PUBLISHED", "STARTED"].includes(r.status)) || null);
        } catch {
          // The backend enforces the rule on submit either way.
        }
        form.setFieldsValue({ rideType: "WITHOUT_TIP", tipAmount: 0, availableSeats: 1, pickupPreference: "ON_ROUTE" });
      }
      setLoading(false);
    }
    load();
  }, [id, isEdit, form]);

  // action: "draft" | "publish" | "start" (publish and start the trip right away).
  async function submit(action) {
    const publish = action !== "draft";
    if (!isOnline) {
      notification.error({ title: "Error", description: "No Internet Connection" });
      return;
    }
    // Start now is only for a start time within ±5 minutes of the current time.
    // Checked first, so a wrong time is flagged even before the rest of the form.
    if (action === "start") {
      const date = form.getFieldValue("departureDate");
      const time = form.getFieldValue("departureTime");
      const when = date && time ? dayjs(`${date.format("YYYY-MM-DD")} ${time.format("HH:mm")}`) : null;
      if (!when || Math.abs(when.diff(dayjs(), "minute", true)) > START_GRACE_MIN) {
        form.scrollToField("departureDate", { behavior: "smooth", block: "start" });
        notification.error({
          title: "Can't start this trip now",
          description: when
            ? `The start time is ${when.format("D MMM, h:mm A")}. To start right away, change the start time to now (${dayjs().format("h:mm A")}, within ${START_GRACE_MIN} minutes either way), or publish the trip instead.`
            : `Pick today's date and the current time (tap "Now") to start the trip right away.`,
          duration: 8,
        });
        return;
      }
    }
    try {
      // Terms are only required to publish; a draft can be saved without them.
      const fieldNames = form.getFieldsError().map((f) => f.name);
      const toCheck = publish ? fieldNames : fieldNames.filter((n) => !["agreeTerms", "agreeSecurity"].includes(n[0]));
      const values = await form.validateFields(toCheck);
      if (!values.sourceLatitude || !values.sourceLongitude) {
        notification.error({ title: "Error", description: "Please select a start location" });
        return;
      }
      if (!values.destinationLatitude || !values.destinationLongitude) {
        notification.error({ title: "Error", description: "Please select an end location" });
        return;
      }
      // Start trip: the rider must be at the starting point (the server checks
      // too). Checked before anything is saved, so a refusal leaves no trip behind.
      if (action === "start") {
        let here;
        try {
          here = await locationService.requestPermission();
        } catch (locErr) {
          notification.error({ title: "Can't start this trip now", description: `${locErr.message} We need your location to check you're at the starting point.`, duration: 8 });
          return;
        }
        const awayM = Math.round(haversineKm(here.latitude, here.longitude, Number(values.sourceLatitude), Number(values.sourceLongitude)) * 1000);
        if (awayM > START_MAX_DISTANCE_M) {
          const away = awayM >= 1000 ? `${(awayM / 1000).toFixed(1)} km` : `${awayM} m`;
          notification.error({
            title: "You're not at the starting point",
            description: `You're ${away} from ${values.sourceName || "the start location"}. Go within ${START_MAX_DISTANCE_M} m of it to start the trip, or publish the trip instead.`,
            duration: 8,
          });
          return;
        }
      }
      if (values.sourceCountry && values.destinationCountry && values.sourceCountry !== values.destinationCountry) {
        notification.error({ title: "Error", description: "Start and end locations must be in the same country" });
        return;
      }
      setSubmittingAction(action);
      const {
        agreeTerms: _agreeTerms,
        agreeSecurity: _agreeSecurity,
        sourceCountry: _sourceCountry,
        destinationCountry: _destinationCountry,
        ...rest
      } = values;
      const payload = {
        ...rest,
        departureDate: values.departureDate.format("YYYY-MM-DD"),
        departureTime: values.departureTime.format("HH:mm"),
      };
      if (values.rideType === "WITHOUT_TIP") payload.tipAmount = 0;
      // Save the road the rider picked on the map, so the trip follows that route.
      const coords = selectedRoute?.coordinates || [];
      // (distanceKm is null for the straight-line fallback when routing failed.)
      if (coords.length >= 2 && selectedRoute?.distanceKm != null) {
        const step = Math.ceil(coords.length / 1900);
        const path = coords.filter((_, i) => i % step === 0);
        if (path[path.length - 1] !== coords[coords.length - 1]) path.push(coords[coords.length - 1]);
        payload.routePath = path.map(([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
      }

      let ride;
      if (isEdit) {
        ride = await rideService.update(id, payload);
      } else {
        ride = await rideService.create(payload);
      }

      if (publish && ride.status === "DRAFT") {
        ride = await rideService.publish(ride.id);
      }

      if (action === "start") {
        try {
          ride = await rideService.start(ride.id);
        } catch (startErr) {
          // The trip is saved and published; it just couldn't start. Open it
          // so the rider can start it from there instead of creating it again.
          notification.warning({ title: "Trip published, not started", description: startErr.message, duration: 8 });
          navigate(`/rides/${ride.id}`);
          return;
        }
      }

      notification.success({
        title: "Success",
        description: action === "start" ? "Trip started" : publish ? "Ride published" : "Ride saved as draft",
      });

      navigate(`/rides/${ride.id}`);
    } catch (err) {
      if (err?.errorFields) {
        const termsMissing = err.errorFields.some((f) => ["agreeTerms", "agreeSecurity"].includes(f.name[0]));
        form.scrollToField(err.errorFields[0].name, { behavior: "smooth", block: "center" });
        if (termsMissing) {
          notification.warning({ title: "Accept the terms", description: "Tick the Terms & Conditions and the Security & Safety Terms to publish." });
        }
        return;
      }
      notification.error({
        title: err.status === 429 ? "Monthly trip limit reached" : "Error",
        description: err.message,
        duration: err.status === 429 ? 8 : undefined,
      });
    } finally {
      setSubmittingAction(null);
    }
  }

  if (!isOnline) {
    return (
      <div style={{ padding: "100px 24px 24px", height: "100%", overflow: "auto", boxSizing: "border-box" }}>
        <ErrorState
          title="No Internet Connection"
          description="Check your connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (loading || !riderStatus) return <BrandLoader label="Loading your trip…" />;

  // A verified vehicle is needed first. The licence is asked for too, but the
  // rider can choose "Add later" (they then show as an Unverified driver).
  const needsVehicle = !riderStatus.canCreateTrip && (!riderStatus.unknown || verifiedVehicles.length === 0);
  const askLicence = !isEdit && !riderStatus.unknown && riderStatus.licenceVerified === false && !licenceLater;
  if (needsVehicle || askLicence) {
    return (
      <RiderChecklist
        status={riderStatus}
        vehicles={vehicles}
        next={isEdit ? `/rides/${id}/edit` : "/rides/create"}
        onLicenceLater={skipLicence}
        licenceLater={licenceLater}
      />
    );
  }

  return (
    <div className="cr-shell">
      <div className="cr-map-stage">
        <RideCreationMap
          source={sourcePoint}
          destination={destinationPoint}
          form={form}
          onRouteSelect={setSelectedRoute}
          savedPath={savedPath}
          occludedLeft={420}
        />
      </div>

      <Drawer
        placement="left"
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        mask={false}
        width={420}
        title={isEdit ? "Edit trip" : "Create trip"}
        rootClassName="cr-drawer"
      >
          <Form form={form} layout="vertical" requiredMark={false}>
        {openTrip && !isEdit && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="You have a trip in progress"
            description={`Complete or cancel your current trip (${openTrip.sourceName?.split(",")[0]} → ${openTrip.destinationName?.split(",")[0]}) before creating a new one.`}
            action={
              <Button size="small" onClick={() => navigate(`/rides/${openTrip.id}`)}>
                View trip
              </Button>
            }
          />
        )}
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

        </FormCard>

        {/* Schedule Section */}
        <SectionHeader>
          <ClockCircleOutlined className="icon" />
          Schedule
        </SectionHeader>
        <FormCard>
          <Form.Item name="departureDate" label="Start date" rules={[{ required: true, message: "Pick a start date" }]}>
            <DayStrip />
          </Form.Item>
          <Form.Item name="departureTime" label="Start time" rules={[{ required: true, message: "Pick a start time" }]}>
            <TimeChips date={departureDate} />
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
          {!isEdit && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              style={{ marginTop: -8, marginBottom: 16 }}
              onClick={() => setAddingVehicle(true)}
            >
              Add vehicle
            </Button>
          )}
          <Form.Item
            name="availableSeats"
            label="Available Seats"
            rules={[{ required: true }]}
            extra={selectedVehicle ? `This vehicle carries up to ${maxSeats} passenger${maxSeats === 1 ? "" : "s"}.` : "Choose a vehicle first."}
          >
            <SeatStepper max={maxSeats} disabled={!selectedVehicle} />
          </Form.Item>
        </FormCard>

        {/* Passenger Pickup Section: how and where passengers are picked up and dropped. */}
        <SectionHeader>
          <TeamOutlined className="icon" />
          Passenger Pickup
        </SectionHeader>
        <FormCard>
          <Form.Item
            name="pickupPreference"
            label="Pickup and drop preference"
            rules={[{ required: true, message: "Please choose how you want to pick up passengers" }]}
            extra="Choose whether you will pick passengers along your route or go to their location."
          >
            <Select
              size="large"
              placeholder="How should passenger pickup work?"
              options={[
                {
                  value: "ON_ROUTE",
                  label: "Along my route",
                },
                {
                  value: "PASSENGER_LOCATION",
                  label: "From the passenger's location",
                },
              ]}
            />
          </Form.Item>
          <PickupFareInfo distanceKm={distanceKm} tipAmount={Number(watchedTip) || 0} preference={watchedPref || "ON_ROUTE"} />
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
          <Form.Item
            name="tipAmount"
            label="Tip Amount (₹)"
            rules={[{ required: rideType === "WITH_TIP", type: "number", min: rideType === "WITH_TIP" ? 1 : 0, message: "Tip must be greater than 0" }]}
            extra={
              rideType === "WITH_TIP" && distanceKm != null
                ? `Auto-calculated from distance: ${distanceKm.toFixed(1)} km × ₹${tipRateForKm(distanceKm)}/km.`
                : rideType !== "WITH_TIP"
                ? 'Select "With Tip" above to set an amount.'
                : undefined
            }
          >
            <InputNumber
              size="large"
              style={{ width: "100%" }}
              min={0}
              max={10000}
              disabled
              // Blocks anything that isn't a plain non-negative number,
              // including a paste of "abc" or "-5" - not just the keyboard.
              parser={(value) => (value == null ? "" : value.replace(/[^\d.]/g, ""))}
              placeholder={rideType === "WITH_TIP" ? "Enter tip amount" : "—"}
            />
          </Form.Item>
        </FormCard>

        {/* Additional Info Section */}
        <SectionHeader>
          <FileTextOutlined className="icon" />
          Additional Information
        </SectionHeader>
        <FormCard>
          <Form.Item name="notes" label="Notes for Passengers (optional)">
            <Input.TextArea
              rows={3}
              maxLength={500}
              placeholder="E.g., air conditioning available, prefer quiet ride, etc."
              showCount
              // Letters, numbers, spaces, commas and full stops only.
              onKeyDown={(e) => {
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !/[\p{L}\p{M}\p{N} ,.]/u.test(e.key)) e.preventDefault();
              }}
              onPaste={(e) => {
                if (/[^\p{L}\p{M}\p{N}\s,.]/u.test(e.clipboardData.getData("text"))) e.preventDefault();
              }}
            />
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
            className="terms-check"
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
            className="terms-check"
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
          <Button
            size="large"
            block
            loading={submittingAction === "draft"}
            disabled={Boolean(submittingAction && submittingAction !== "draft") || Boolean(openTrip && !isEdit)}
            onClick={() => submit("draft")}
            style={{ background: "transparent", borderColor: colors.primary, color: colors.primary }}
          >
            Draft
          </Button>
          <Button
            size="large"
            type="primary"
            block
            loading={submittingAction === "publish"}
            disabled={Boolean(submittingAction && submittingAction !== "publish") || Boolean(openTrip && !isEdit)}
            style={{ background: colors.primary }}
            onClick={() => submit("publish")}
          >
            Publish
          </Button>
          <Button
            size="large"
            type="primary"
            block
            className="start-now"
            loading={submittingAction === "start"}
            disabled={Boolean(submittingAction && submittingAction !== "start") || Boolean(openTrip && !isEdit)}
            style={{ background: colors.primary }}
            onClick={() => submit("start")}
          >
            Start trip
          </Button>
        </ActionButtons>
          </Form>
      </Drawer>

      {!panelOpen && (
        <button type="button" className="cr-reopen" onClick={() => setPanelOpen(true)}>
          {isEdit ? "Edit trip" : "Create trip"}
        </button>
      )}

      {/* Add vehicle without leaving Create trip: the same steps as My Vehicles > Add. */}
      <Drawer
        title="Add vehicle"
        placement={window.innerWidth <= 768 ? "bottom" : "right"}
        size={window.innerWidth <= 768 ? "92%" : 640}
        open={addingVehicle}
        onClose={() => setAddingVehicle(false)}
        destroyOnHidden
        rootClassName="cr-add-vehicle"
        styles={{ body: { padding: 12 } }}
      >
        {addingVehicle && <VehicleFormPage embedded onDone={handleVehicleAdded} />}
      </Drawer>

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

      <style>{`
        .cr-shell{position:relative;height:100%}
        .cr-reopen{position:absolute;top:108px;left:16px;z-index:5;padding:10px 18px;border-radius:999px;border:1px solid var(--chrome-border);background:var(--bg-secondary);color:var(--text-primary);font-weight:600;cursor:pointer;box-shadow:var(--shadow-lg)}
        .cr-reopen:hover{border-color:var(--color-primary)}
        .cr-map-stage{position:absolute;inset:0;z-index:1}

        .cr-drawer .ant-drawer-content-wrapper{top:92px!important;height:calc(100% - 92px)!important;box-shadow:none!important}
        .cr-drawer .ant-drawer-section{background:rgba(var(--glass-rgb),0.42);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-right:1px solid var(--chrome-border);box-shadow:var(--shadow-lg)}
        .cr-drawer .ant-drawer-header{background:transparent;border-color:var(--chrome-border)}
        .cr-drawer .ant-drawer-title{color:${colors.textPrimary}}
        .cr-drawer .ant-drawer-body{padding-bottom:24px}
        /* Phones: Start trip + Draft/Publish are pinned to the bottom, so leave room for them. */
        @media(max-width:600px){.cr-drawer .ant-drawer-body{padding-bottom:110px}}
      `}</style>
    </div>
  );
}
