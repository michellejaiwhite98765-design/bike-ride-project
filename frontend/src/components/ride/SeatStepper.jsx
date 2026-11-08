import { MinusOutlined, PlusOutlined } from "@ant-design/icons";

/**
 * Seat picker: tap - / +, no typing. Works as an antd Form.Item control
 * (value = number). Never goes above `max` (the vehicle's passenger seats).
 */
export default function SeatStepper({ value, onChange, max = 1, min = 1, disabled = false }) {
  const v = Number(value) || min;
  const set = (n) => onChange?.(Math.min(max, Math.max(min, n)));
  return (
    <div className={`seat-stepper${disabled ? " off" : ""}`}>
      <button type="button" aria-label="Fewer seats" disabled={disabled || v <= min} onClick={() => set(v - 1)}>
        <MinusOutlined />
      </button>
      <div className="seat-count" aria-live="polite">
        <b>{v}</b>
        <span>
          {v === 1 ? "seat" : "seats"} · max {max}
        </span>
      </div>
      <button type="button" aria-label="More seats" disabled={disabled || v >= max} onClick={() => set(v + 1)}>
        <PlusOutlined />
      </button>
      <div className="seat-dots" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < v ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
