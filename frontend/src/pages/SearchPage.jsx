import { useEffect, useState } from "react";
import { Form, Input, App } from "antd";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import HomeMapView from "../components/home/HomeMapView.jsx";
import useAutoCurrentLocation from "../hooks/useAutoCurrentLocation.js";
import { useSearchHeaderRegistration } from "../context/SearchHeaderContext.jsx";

export default function SearchPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  useAutoCurrentLocation(form, "source");
  useSearchHeaderRegistration(form);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
      <Form form={form} className="sp-hidden-form">
        <Form.Item name="sourceName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="sourceLatitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="sourceLongitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="sourceCountry" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="destinationName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="destinationLatitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="destinationLongitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="destinationCountry" hidden>
          <Input />
        </Form.Item>
      </Form>

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
                ? "Choose a pickup or destination above to see today's rides."
                : hasSearched
                ? hasBoth
                  ? "No rides found for this exact route today."
                  : "No rides found near this location today."
                : "Finding rides…"}
            </div>
          }
        />
      </div>

      <style>{`
        .sp-shell{position:relative;height:100%}
        .sp-hidden-form{display:none}
        .sp-map-stage{position:absolute;inset:0;z-index:1}

        .sp-empty-card{background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:14px;text-align:center;color:#475569;font-size:13px}
      `}</style>
    </div>
  );
}
