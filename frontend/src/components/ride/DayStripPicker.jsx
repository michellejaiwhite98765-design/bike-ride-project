import { useRef, useEffect, useState } from "react";
import { DatePicker } from "antd";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { createPortal } from "react-dom";

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

// Times up to this many minutes ago can still be picked today, for "Start trip now".
export const START_GRACE_MIN = 5;

/** Time chips in 30-minute steps plus an exact-time picker. value = dayjs | undefined. */
export function TimeChips({ value, onChange, date }) {
  const now = dayjs();
  // No day picked yet counts as today (the earliest day allowed), so past times never show.
  const isToday = !date || date.isSame(now, "day");
  const isSlot = value && SLOTS.some((s) => s.hour() === value.hour() && s.minute() === value.minute());
  // Today: anything earlier than START_GRACE_MIN minutes ago is past (a trip can start a few minutes "late").
  const earliest = now.hour() * 60 + now.minute() - START_GRACE_MIN;
  const pastSlot = (s) => isToday && s.hour() * 60 + s.minute() < earliest;
  // Was the time chosen with "Pick time"? Then that chip shows it (even if it
  // happens to match a half-hour chip); tapping a half-hour chip resets this.
  const [fromPicker, setFromPicker] = useState(() => Boolean(value && !isSlot));
  const showPicked = Boolean(value) && (fromPicker || !isSlot);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Switching to today with an earlier time already chosen: clear it so a past time can't be submitted.
  useEffect(() => {
    if (isToday && value && value.hour() * 60 + value.minute() < earliest) onChange?.(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, value]);

  return (
    <div className="ds-wrap">
      <div className="ds-times" role="listbox" aria-label="Departure time">
        {/* Opens the phone's own time picker; first so any time is one tap away. */}
        <button type="button" className={`ds-time ds-other${showPicked ? " sel" : ""}`} onClick={() => setSheetOpen(true)}>
          <ClockCircleOutlined /> {showPicked ? value.format("h:mm A") : "Pick time"}
        </button>
        {isToday && (
          <button
            type="button"
            className="ds-time"
            onClick={() => {
              setFromPicker(true);
              onChange?.(dayjs().second(0).millisecond(0));
            }}
          >
            Now
          </button>
        )}
        {SLOTS.filter((s) => !pastSlot(s)).map((s) => {
          const sel = !showPicked && value && value.hour() === s.hour() && value.minute() === s.minute();
          return (
            <button
              type="button"
              key={s.format("HHmm")}
              disabled={pastSlot(s)}
              className={`ds-time${sel ? " sel" : ""}`}
              onClick={() => {
                setFromPicker(false);
                onChange?.(dayjs(s.format("HH:mm"), "HH:mm"));
              }}
              aria-selected={Boolean(sel)}
            >
              {s.format("h:mm A")}
            </button>
          );
        })}
      </div>
      <div className="ds-picked">{value ? `Leaving at ${value.format("h:mm A")}` : "Pick a time"}</div>
      <TimeSheet
        open={sheetOpen}
        initial={value}
        minMinutes={isToday ? Math.max(0, earliest) : 0}
        onClose={() => setSheetOpen(false)}
        onPick={(t) => {
          setSheetOpen(false);
          setFromPicker(true);
          onChange?.(t);
        }}
      />
    </div>
  );
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const to24 = (h12, ampm) => (h12 % 12) + (ampm === "PM" ? 12 : 0);

/**
 * App-themed time picker (the browser's own one can't be styled): hour,
 * minute (5-min steps) and AM/PM columns. Times before minMinutes (minutes
 * after midnight; today = from now) are disabled.
 */
function TimeSheet({ open, initial, minMinutes = 0, onClose, onPick }) {
  const firstFree = () => {
    const m = Math.ceil(Math.max(minMinutes, 0) / 5) * 5;
    return dayjs().startOf("day").add(Math.min(m, 23 * 60 + 55), "minute");
  };
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const [ap, setAp] = useState("AM");

  useEffect(() => {
    if (!open) return;
    const start = initial && initial.hour() * 60 + initial.minute() >= minMinutes ? initial : firstFree();
    setH(start.hour() % 12 || 12);
    setM(Math.round(start.minute() / 5) * 5 % 60);
    setAp(start.hour() >= 12 ? "PM" : "AM");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mins = (hh, mm, a) => to24(hh, a) * 60 + mm;
  const hourOff = (hh) => mins(hh, 55, ap) < minMinutes;
  const minuteOff = (mm) => mins(h, mm, ap) < minMinutes;
  const apOff = (a) => mins(11, 55, a) < minMinutes;
  const valid = mins(h, m, ap) >= minMinutes;

  // Keep the selected item of each column in view when the sheet opens.
  const colRefs = useRef([]);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      colRefs.current.forEach((c) => c?.querySelector(".ts-opt.sel")?.scrollIntoView({ block: "center" }))
    );
    return () => cancelAnimationFrame(id);
  }, [open, h, m, ap]);

  if (!open) return null;
  const col = (i, items, isSel, isOff, onSel, fmt) => (
    <div className="ts-col" ref={(el) => (colRefs.current[i] = el)} role="listbox">
      {items.map((it) => (
        <button type="button" key={it} disabled={isOff(it)} className={`ts-opt${isSel(it) ? " sel" : ""}`} onClick={() => onSel(it)}>
          {fmt(it)}
        </button>
      ))}
    </div>
  );

  // Portal to <body>: the Create trip panel uses backdrop-filter, which would
  // otherwise trap this fixed overlay inside the panel.
  return createPortal(
    <div className="ts-backdrop" onClick={onClose}>
      <div className="ts-sheet" role="dialog" aria-label="Pick a time" onClick={(e) => e.stopPropagation()}>
        <div className="ts-head">
          <span>Start time</span>
          <b>
            {h}:{String(m).padStart(2, "0")} {ap}
          </b>
        </div>
        <div className="ts-cols">
          {col(0, HOURS, (x) => x === h, hourOff, setH, (x) => x)}
          <span className="ts-colon">:</span>
          {col(1, MINUTES, (x) => x === m, minuteOff, setM, (x) => String(x).padStart(2, "0"))}
          {col(2, ["AM", "PM"], (x) => x === ap, apOff, setAp, (x) => x)}
        </div>
        <div className="ts-actions">
          <button type="button" className="ts-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ts-btn primary"
            disabled={!valid}
            onClick={() => onPick(dayjs().startOf("day").add(mins(h, m, ap), "minute"))}
          >
            Set time
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
