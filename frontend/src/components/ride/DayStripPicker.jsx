import { useRef, useEffect, useState } from "react";
import { DatePicker } from "antd";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const DAYS = 30;
const SLOTS = Array.from({ length: 38 }, (_, i) => dayjs().startOf("day").add(5 * 60 + i * 30, "minute"));

/** Swipeable day strip. Works as an antd Form.Item control (value = dayjs | undefined). */
export function DayStrip({ value, onChange }) {
  const today = dayjs().startOf("day");
  const [more, setMore] = useState(false);
  const selRef = useRef(null);
  const inStrip = value && value.startOf("day").diff(today, "day") < DAYS;

  useEffect(() => {
    selRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div className="ds-wrap">
      <div className="ds-strip" role="listbox" aria-label="Departure date">
        {Array.from({ length: DAYS }, (_, i) => {
          const d = today.add(i, "day");
          const sel = value && value.isSame(d, "day");
          return (
            <button
              type="button"
              key={i}
              ref={sel ? selRef : null}
              className={`ds-day${sel ? " sel" : ""}`}
              onClick={() => onChange?.(d)}
              aria-selected={Boolean(sel)}
            >
              <small>{i === 0 ? "TODAY" : d.format("ddd").toUpperCase()}</small>
              <b>{d.format("D")}</b>
              <small>{d.format("MMM").toUpperCase()}</small>
            </button>
          );
        })}
        <div role="button" tabIndex={0} className={`ds-day ds-more${value && !inStrip ? " sel" : ""}`} onClick={() => setMore(true)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMore(true)}>
          <CalendarOutlined />
          <small>{value && !inStrip ? value.format("D MMM") : "MORE"}</small>
          <DatePicker
            open={more}
            onOpenChange={setMore}
            value={value}
            onChange={(d) => d && onChange?.(d)}
            disabledDate={(d) => d && d < today}
            className="ds-hidden-picker"
            getPopupContainer={() => document.body}
          />
        </div>
      </div>
      <div className="ds-picked">{value ? value.format("dddd, D MMMM YYYY") : "Pick a day"}</div>
    </div>
  );
}

/** Time chips in 30-minute steps plus an exact-time picker. value = dayjs | undefined. */
export function TimeChips({ value, onChange, date }) {
  const now = dayjs();
  const isToday = date && date.isSame(now, "day");
  const isSlot = value && SLOTS.some((s) => s.hour() === value.hour() && s.minute() === value.minute());
  const pastSlot = (s) => isToday && s.hour() * 60 + s.minute() <= now.hour() * 60 + now.minute();

  // Switching to today with an earlier time already chosen: clear it so a past time can't be submitted.
  useEffect(() => {
    if (isToday && value && value.hour() * 60 + value.minute() <= now.hour() * 60 + now.minute()) onChange?.(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, value]);

  return (
    <div className="ds-wrap">
      <div className="ds-times" role="listbox" aria-label="Departure time">
        {SLOTS.filter((s) => !pastSlot(s)).map((s) => {
          const sel = value && value.hour() === s.hour() && value.minute() === s.minute();
          return (
            <button
              type="button"
              key={s.format("HHmm")}
              disabled={pastSlot(s)}
              className={`ds-time${sel ? " sel" : ""}`}
              onClick={() => onChange?.(dayjs(s.format("HH:mm"), "HH:mm"))}
              aria-selected={Boolean(sel)}
            >
              {s.format("h:mm A")}
            </button>
          );
        })}
        <label className={`ds-time ds-other${value && !isSlot ? " sel" : ""}`}>
          <ClockCircleOutlined /> {value && !isSlot ? value.format("h:mm A") : "Exact time"}
          <input
            type="time"
            className="ds-native"
            value={value ? value.format("HH:mm") : ""}
            min={isToday ? now.add(1, "minute").format("HH:mm") : undefined}
            onChange={(e) => {
              if (!e.target.value) return;
              const t = dayjs(e.target.value, "HH:mm");
              const mins = t.hour() * 60 + t.minute();
              // Today: only a time later than now.
              if (isToday && mins <= now.hour() * 60 + now.minute()) return;
              onChange?.(t);
            }}
          />
        </label>
      </div>
      <div className="ds-picked">{value ? `Leaving at ${value.format("h:mm A")}` : "Pick a time"}</div>
    </div>
  );
}
