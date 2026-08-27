import { Form, Input, AutoComplete, Spin } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";

// Replace manual place name input with an autocomplete backed by
// OpenStreetMap's Nominatim search. When a suggestion is selected,
// the component fills the corresponding latitude/longitude fields on the
// surrounding form. No API key required for development.
export default function LocationFields({ prefix, label, placeholder }) {
  const form = Form.useFormInstance();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const handleSearch = (value) => {
    // debounce queries
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = encodeURIComponent(value);
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        const opts = data.map((d) => ({ value: d.display_name, raw: d }));
        setOptions(opts);
      } catch (e) {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onSelect = (value, option) => {
    const d = option?.raw;
    if (!d) return;
    // Nominatim returns lat/lon as strings
    const lat = Number(d.lat);
    const lon = Number(d.lon);
    // Truncate display name to the server-side limit to avoid validation errors
    const displayName = d.display_name.length > 150 ? d.display_name.slice(0, 150) : d.display_name;
    form.setFieldsValue({
      [`${prefix}Name`]: displayName,
      [`${prefix}Latitude`]: lat,
      [`${prefix}Longitude`]: lon,
    });
    setOptions([]);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <Form.Item
        name={`${prefix}Name`}
        label={label}
        rules={[
          { required: true, message: `${label} is required` },
          { type: "string", max: 150, message: `${label} must be 150 characters or fewer` },
        ]}
      >
        <AutoComplete
          options={options}
          onSearch={handleSearch}
          onSelect={onSelect}
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
    </div>
  );
}
