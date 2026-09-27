import { useEffect, useRef, useState } from "react";
import { Form, AutoComplete, Input, Spin } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined, SwapOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

function swapFormLocations(form) {
  const values = form.getFieldsValue([
    "sourceName", "sourceLatitude", "sourceLongitude", "sourceCountry",
    "destinationName", "destinationLatitude", "destinationLongitude", "destinationCountry",
  ]);
  form.setFieldsValue({
    sourceName: values.destinationName,
    sourceLatitude: values.destinationLatitude,
    sourceLongitude: values.destinationLongitude,
    sourceCountry: values.destinationCountry,
    destinationName: values.sourceName,
    destinationLatitude: values.sourceLatitude,
    destinationLongitude: values.sourceLongitude,
    destinationCountry: values.sourceCountry,
  });
}

function HeaderLocationField({ form, prefix, placeholder }) {
  const watched = Form.useWatch(`${prefix}Name`, form);
  const [text, setText] = useState(watched || "");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const focusedRef = useRef(false);
  const timerRef = useRef(null);

  // Only mirror the form's value into the visible text while the field is
  // NOT focused - otherwise a background write to the same form field (e.g.
  // useAutoCurrentLocation resolving after the user has already started
  // typing a different pickup) would wipe out their in-progress keystrokes.
  useEffect(() => {
    if (!focusedRef.current) setText(watched || "");
  }, [watched]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSearch = (value) => {
    setText(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        const seen = new Set();
        const opts = [];
        for (const d of data) {
          const key = `${d.display_name}-${d.lat}-${d.lon}`;
          if (seen.has(key)) continue;
          seen.add(key);
          opts.push({ value: d.display_name, key, raw: d });
        }
        setOptions(opts);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (value, option) => {
    const d = option?.raw;
    if (!d) return;
    const name = d.display_name.length > 150 ? d.display_name.slice(0, 150) : d.display_name;
    form.setFieldsValue({
      [`${prefix}Name`]: name,
      [`${prefix}Latitude`]: Number(d.lat),
      [`${prefix}Longitude`]: Number(d.lon),
      [`${prefix}Country`]: d.address?.country || null,
    });
    setOptions([]);
  };

  return (
    <AutoComplete
      value={text}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={setText}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        setText(watched || "");
      }}
      className="shf-field"
      popupMatchSelectWidth={280}
      notFoundContent={loading ? <Spin size="small" /> : null}
    >
      <Input placeholder={placeholder} variant="borderless" />
    </AutoComplete>
  );
}

/**
 * Replaces the normal header content on /search: a back button plus live
 * pickup/destination fields that write straight into the SearchPage form
 * registered via SearchHeaderContext.
 */
export default function SearchHeaderFields({ form }) {
  const navigate = useNavigate();

  return (
    <div className="shf-shell">
      <button type="button" className="shf-back" onClick={() => navigate(-1)} aria-label="Back">
        <ArrowLeftOutlined />
      </button>

      <div className="shf-fields">
        <div className="shf-field-row">
          <EnvironmentOutlined className="shf-icon shf-icon-start" />
          <HeaderLocationField form={form} prefix="source" placeholder="Pickup location" />
        </div>
        <div className="shf-vdivider" />
        <div className="shf-field-row">
          <EnvironmentOutlined className="shf-icon shf-icon-end" />
          <HeaderLocationField form={form} prefix="destination" placeholder="Where to?" />
        </div>
      </div>

      <button type="button" className="shf-swap" onClick={() => swapFormLocations(form)} aria-label="Swap locations">
        <SwapOutlined />
      </button>

      <style>{`
        .shf-shell{display:flex;align-items:center;gap:10px;width:100%}
        .shf-back{flex-shrink:0;width:36px;height:36px;border-radius:50%;border:0;background:var(--chrome-tint);color:var(--text-primary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .shf-back:hover{background:var(--chrome-tint-strong)}

        .shf-fields{flex:1;min-width:0;display:flex;align-items:center;background:var(--chrome-tint);border:1px solid var(--chrome-border);border-radius:999px;padding:2px 6px}
        .shf-field-row{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:8px 10px}
        .shf-icon{font-size:13px;flex-shrink:0}
        .shf-icon-start{color:#2DD4BF}
        .shf-icon-end{color:#F87171}
        .shf-vdivider{width:1px;align-self:stretch;margin:8px 0;background:var(--chrome-border);flex-shrink:0}

        .shf-field{width:100%;min-width:0}
        .shf-field .ant-select-selector,.shf-field.ant-select-single .ant-select-selector{padding:0!important}
        .shf-field input{color:var(--text-primary)!important;font-size:13.5px!important}
        .shf-field input::placeholder{color:var(--text-tertiary)}

        .shf-swap{flex-shrink:0;width:36px;height:36px;border-radius:50%;border:0;background:var(--chrome-tint);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .shf-swap:hover{background:var(--chrome-tint-strong);color:var(--text-primary)}

        @media (max-width:480px){
          .shf-back,.shf-swap{width:32px;height:32px;font-size:13px}
          .shf-field-row{padding:8px 6px;gap:6px}
          .shf-icon{font-size:12px}
        }
      `}</style>
    </div>
  );
}
