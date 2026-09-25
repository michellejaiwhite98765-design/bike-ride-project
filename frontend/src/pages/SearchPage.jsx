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

  // No filter UI: every search is always "today", any seat count, any ride
  // type (with tip and without), including rides with no seats left - the
  // map should show the full picture, not a pre-filtered slice.
  useEffect(() => {
    if (!sourceLatitude || !sourceLongitude || !destinationLatitude || !destinationLongitude) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = {
          sourceLatitude: Number(sourceLatitude),
          sourceLongitude: Number(sourceLongitude),
          destinationLatitude: Number(destinationLatitude),
          destinationLongitude: Number(destinationLongitude),
          date: dayjs().format("YYYY-MM-DD"),
          includeFull: true,
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
  }, [sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude, message]);

  const needsDestination = !destinationLatitude || !destinationLongitude;

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
              {needsDestination
                ? "Choose a destination above to see today's rides."
                : hasSearched
                ? "No rides found for this route today."
                : "Choose a pickup above to see today's rides."}
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
