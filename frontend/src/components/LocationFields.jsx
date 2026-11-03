import { Form, Input, AutoComplete, Spin, App } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import { countryMismatch, reverseGeocode, geocodePlaceName, UnknownLocationError, UNKNOWN_LOCATION_MESSAGE } from "../utils/geo.js";
import { isGoogleLocationLink, resolveSharedLocationLink } from "../utils/parseSharedLocation.js";
import { locationService } from "../services/locationService.js";

// Replace manual place name input with an autocomplete backed by
// OpenStreetMap's Nominatim search. When a suggestion is selected,
// the component fills the corresponding latitude/longitude fields on the
// surrounding form. No API key required for development.
// Only real, named places are offered: towns, villages, areas, stations,
// bus stands, airports and landmarks - never roads, house numbers, shops or
// anything outside India.
const PLACE_CLASSES = new Set(["place", "boundary", "railway", "aeroway", "tourism", "historic", "natural"]);
const PLACE_BUS = new Set(["bus_station", "bus_stop"]);
function knownPlaces(results) {
  const seen = new Set();
  return (results || [])
    .filter((d) => {
      if ((d.address?.country_code || "in") !== "in") return false;
      const ok =
        PLACE_CLASSES.has(d.class) ||
        (d.class === "amenity" && ["bus_station", "college", "university", "hospital"].includes(d.type)) ||
        (d.class === "highway" && PLACE_BUS.has(d.type)) ||
        (d.class === "public_transport" && d.type === "station");
      if (!ok) return false;
      if (d.class === "boundary" && d.type !== "administrative") return false;
      if (d.class === "place" && ["house", "plot", "postcode", "locality"].includes(d.type)) return false;
      const key = (d.display_name || "").split(",").slice(0, 3).join(",").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

export default function LocationFields({ prefix, label, placeholder }) {
  const { notification } = App.useApp();
  const form = Form.useFormInstance();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(null); // inline error under the field
  const timerRef = useRef(null);
  const eraseRef = useRef(null); // clears text that isn't a known place
  const requestRef = useRef(0); // drops responses to out-of-date queries
  const nameValue = Form.useWatch(`${prefix}Name`, form);

  // Form reset / programmatic fill: nothing left to complain about.
  useEffect(() => {
    if (!nameValue) setNotFound(null);
  }, [nameValue]);

  // A pasted Google Maps / WhatsApp shared-location link isn't a search
  // term - resolve and apply it directly instead of sending it to Nominatim
  // (which would just return no results for a URL).
  async function applySharedLink(value) {
    setLoading(true);
    try {
      const point = await resolveSharedLocationLink(value, locationService.resolveLink, geocodePlaceName);
      if (!point) {
        notification.error({ title: "Error", description: "Couldn't read a location from that link." });
        return;
      }
      const { name, country } = await reverseGeocode(point.latitude, point.longitude);
      const mismatchError = countryMismatch(form, prefix, country);
      if (mismatchError) {
        notification.error({ title: "Error", description: mismatchError });
        return;
      }
      form.setFieldsValue({
        [`${prefix}Name`]: name.length > 150 ? name.slice(0, 150) : name,
        [`${prefix}Latitude`]: point.latitude,
        [`${prefix}Longitude`]: point.longitude,
        [`${prefix}Country`]: country,
      });
    } catch (err) {
      notification.error({ title: "Error", description: err instanceof UnknownLocationError ? UNKNOWN_LOCATION_MESSAGE : "Couldn't resolve that link. Please try again." });
    } finally {
      setLoading(false);
      setOptions([]);
    }
  }

  // Text with no real place behind it is erased after a second, so a made-up
  // or foreign place never lingers in the box.
  const eraseSoon = () => {
    clearTimeout(eraseRef.current);
    eraseRef.current = setTimeout(() => {
      if (form.getFieldValue(`${prefix}Latitude`) == null) {
        form.setFieldsValue({ [`${prefix}Name`]: "" });
        setOptions([]);
      }
    }, 1000);
  };

  const handleSearch = (value) => {
    clearTimeout(eraseRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    requestRef.current += 1;
    const requestId = requestRef.current;
    setNotFound(null);

    // Editing the text invalidates a previously picked place - otherwise the
    // old coordinates would silently stay attached to different text.
    if (form.getFieldValue(`${prefix}Latitude`) != null) {
      form.setFieldsValue({
        [`${prefix}Latitude`]: undefined,
        [`${prefix}Longitude`]: undefined,
        [`${prefix}Country`]: undefined,
      });
    }

    if (isGoogleLocationLink(value)) {
      setOptions([]);
      applySharedLink(value);
      return;
    }

    // debounce queries
    if (!value || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = encodeURIComponent(value);
        // India only; extra results requested because the non-places are filtered out below.
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=20&countrycodes=in&accept-language=en`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (requestId !== requestRef.current) return;
        const opts = knownPlaces(data).map((d) => ({ value: d.display_name, raw: d }));
        setOptions(opts);
        if (opts.length === 0) {
          const text = `Unknown location "${value.trim()}". Please search for a known place.`;
          setNotFound(text);
          notification.error({ title: "Error", description: text, key: `location-${prefix}` });
          eraseSoon();
        }
      } catch (e) {
        if (requestId !== requestRef.current) return;
        setOptions([]);
        const text = "Couldn't search locations. Check your connection and try again.";
        setNotFound(text);
        notification.error({ title: "Error", description: text, key: `location-${prefix}` });
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(eraseRef.current);
    };
  }, []);

  const onSelect = (value, option) => {
    const d = option?.raw;
    if (!d) return;
    // Nominatim returns lat/lon as strings
    const lat = Number(d.lat);
    const lon = Number(d.lon);
    const country = d.address?.country || null;
    setNotFound(null);

    const mismatchError = countryMismatch(form, prefix, country);
    if (mismatchError) {
      notification.error({ title: "Error", description: mismatchError });
      setOptions([]);
      return;
    }

    // Truncate display name to the server-side limit to avoid validation errors
    const displayName = d.display_name.length > 150 ? d.display_name.slice(0, 150) : d.display_name;
    form.setFieldsValue({
      [`${prefix}Name`]: displayName,
      [`${prefix}Latitude`]: lat,
      [`${prefix}Longitude`]: lon,
      [`${prefix}Country`]: country,
    });
    setOptions([]);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <Form.Item
        name={`${prefix}Name`}
        label={label}
        validateStatus={notFound ? "error" : undefined}
        help={notFound || undefined}
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: `${label} is required` },
          { type: "string", max: 150, message: `${label} must be 150 characters or fewer` },
          {
            // Text alone isn't a location - it has to have been picked from
            // the suggestions (or resolved from a link) to carry coordinates.
            validator: () =>
              form.getFieldValue(`${prefix}Latitude`) != null && form.getFieldValue(`${prefix}Longitude`) != null
                ? Promise.resolve()
                : Promise.reject(new Error("Please pick a location from the suggestions")),
          },
        ]}
      >
        <AutoComplete
          options={options}
          onSearch={handleSearch}
          onSelect={onSelect}
          onBlur={() => {
            // Left the box with text that was never picked from the suggestions.
            if (form.getFieldValue(`${prefix}Name`) && form.getFieldValue(`${prefix}Latitude`) == null) eraseSoon();
          }}
          notFoundContent={loading ? <Spin size="small" /> : null}
        >
          <Input prefix={<EnvironmentOutlined />} placeholder={placeholder} size="large" maxLength={150} />
        </AutoComplete>
      </Form.Item>
      <Form.Item name={`${prefix}Latitude`} noStyle hidden>
        <Input />
      </Form.Item>
      <Form.Item name={`${prefix}Longitude`} noStyle hidden>
        <Input />
      </Form.Item>
      <Form.Item name={`${prefix}Country`} noStyle hidden>
        <Input />
      </Form.Item>
    </div>
  );
}
