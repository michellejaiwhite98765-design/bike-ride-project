import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, App, Drawer, Button } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import HomeMapView from "../components/home/HomeMapView.jsx";
import useAutoCurrentLocation from "../hooks/useAutoCurrentLocation.js";
import LocationFields from "../components/LocationFields.jsx";

export default function SearchPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  useAutoCurrentLocation(form, "source");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  function swapLocations() {
    const v = form.getFieldsValue(true);
    form.setFieldsValue({
      sourceName: v.destinationName,
      sourceLatitude: v.destinationLatitude,
      sourceLongitude: v.destinationLongitude,
      sourceCountry: v.destinationCountry,
      destinationName: v.sourceName,
      destinationLatitude: v.sourceLatitude,
      destinationLongitude: v.sourceLongitude,
      destinationCountry: v.sourceCountry,
    });
  }

  const sourceLatitude = Form.useWatch("sourceLatitude", form);
  const sourceLongitude = Form.useWatch("sourceLongitude", form);
  const destinationLatitude = Form.useWatch("destinationLatitude", form);
  const destinationLongitude = Form.useWatch("destinationLongitude", form);

  const hasSource = Boolean(sourceLatitude && sourceLongitude);
  const hasDestination = Boolean(destinationLatitude && destinationLongitude);
  const hasBoth = hasSource && hasDestination;

  // No filter UI: every search is always "today", any seat count, any ride
  // type (with tip and without), including rides with no seats left - the
  // map should show the full picture, not a pre-filtered slice.
  //
  // Mirrors the home page until both ends are known: with only one point set
  // (source auto-filled by geolocation, or the user typed just one field),
  // search broadly around that single point instead of showing nothing.
  // Once both source and destination are set, switch to the precise,
  // directional route match.
  useEffect(() => {
    if (!hasSource && !hasDestination) {
      setResults([]);
      return undefined;
    }

    const anchorLat = hasSource ? sourceLatitude : destinationLatitude;
    const anchorLng = hasSource ? sourceLongitude : destinationLongitude;

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = {
          sourceLatitude: Number(hasSource ? sourceLatitude : anchorLat),
          sourceLongitude: Number(hasSource ? sourceLongitude : anchorLng),
          destinationLatitude: Number(hasDestination ? destinationLatitude : anchorLat),
          destinationLongitude: Number(hasDestination ? destinationLongitude : anchorLng),
          date: dayjs().format("YYYY-MM-DD"),
          includeFull: true,
          ...(hasBoth ? {} : { radius: 50 }),
        };

        const data = await rideService.search(params);
        if (!cancelled) {
          setResults(Array.isArray(data) ? data : []);
          setHasSearched(true);
        }
      } catch (err) {
        if (!cancelled) message.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasSource, hasDestination, hasBoth, sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude, message]);

  return (
    <div className="sp-shell">
      <div className="sp-map-stage">
        <HomeMapView
          userLocation={
            sourceLatitude && sourceLongitude
              ? { latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) }
              : null
          }
          nearbyRides={results}
          loading={loading}
          emptyState={
            <div className="sp-empty-card">
              {!hasSource && !hasDestination
                ? "Choose a pickup or destination to see today's rides."
                : hasSearched
                ? hasBoth
                  ? "No rides found for this exact route today."
                  : "No rides found near this location today."
                : "Finding rides…"}
            </div>
          }
        />
      </div>

      <Drawer
        placement="left"
        open
        onClose={() => navigate("/", { state: { view: "map" } })}
        mask={false}
        width={380}
        title="Find trip"
        rootClassName="sp-drawer"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {["sourceLatitude", "sourceLongitude", "sourceCountry", "destinationLatitude", "destinationLongitude", "destinationCountry"].map((name) => (
            <Form.Item key={name} name={name} hidden>
              <Input />
            </Form.Item>
          ))}
          <LocationFields prefix="source" label="Start Location" placeholder="Where do you want to be picked up?" />
          <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0 8px" }}>
            <Button shape="round" icon={<SwapOutlined />} onClick={swapLocations}>
              Swap
            </Button>
          </div>
          <LocationFields prefix="destination" label="End Location" placeholder="Where are you going?" />
        </Form>
        <div className="sp-hint">
          Rides along your route show up on the map as you fill in the start and end.
        </div>
      </Drawer>

      <style>{`
        .sp-shell{position:relative;height:100%}
        .sp-map-stage{position:absolute;inset:0;z-index:1}

        .sp-drawer .ant-drawer-content-wrapper{top:92px!important;height:calc(100% - 92px)!important;box-shadow:none!important}
        .sp-drawer .ant-drawer-section{background:rgba(11,15,23,0.42);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-right:1px solid var(--chrome-border);box-shadow:var(--shadow-lg)}
        .sp-drawer .ant-drawer-header{background:transparent;border-color:var(--chrome-border)}
        .sp-drawer .ant-drawer-title{color:var(--text-primary)}
        .sp-hint{margin-top:8px;font-size:12.5px;color:var(--text-secondary)}

        .sp-empty-card{position:absolute;left:14px;right:14px;bottom:14px;z-index:500;background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:14px;text-align:center;color:#475569;font-size:13px}
      `}</style>
    </div>
  );
}
