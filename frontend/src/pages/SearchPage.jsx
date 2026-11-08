import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Form, App, Drawer, Button, DatePicker } from "antd";
import {
  SwapOutlined,
  CloseOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import HomeMapView from "../components/home/HomeMapView.jsx";
import useAutoCurrentLocation from "../hooks/useAutoCurrentLocation.js";
import LocationFields from "../components/LocationFields.jsx";

// Phones get a bottom sheet instead of the side drawer: the 380px drawer
// covered the whole screen, hiding the map this page exists to show.
function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const short = (name, fallback) => (name || fallback).split(",")[0].trim();

// "today" / "tomorrow" / "on Tue, 4 Nov" / "between 4 and 10 Nov"
function whenText(start, end) {
  const today = dayjs();
  if (start.isSame(end, "day")) {
    if (start.isSame(today, "day")) return "today";
    if (start.isSame(today.add(1, "day"), "day")) return "tomorrow";
    return `on ${start.format("ddd, D MMM")}`;
  }
  return `between ${start.format(start.isSame(end, "month") ? "D" : "D MMM")} and ${end.format("D MMM")}`;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  useAutoCurrentLocation(form, "source");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  // The last search the user ran with the Search button - what they asked
  // for, so the result banner can say it back to them.
  const [lastSearch, setLastSearch] = useState(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [dates, setDates] = useState(() => [dayjs(), dayjs()]);

  const isMobile = useIsMobile();
  // Starts minimized (tap the bar to open), unless a link asked for it open:
  // navigate("/", { state: { openSearch: true } }) e.g. My Bookings' "Find a trip".
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(location.state?.openSearch));
  useEffect(() => {
    if (location.state?.openSearch) setSheetOpen(true);
  }, [location.state]);
  // Desktop side panel: starts closed so the map is clear. A slim tab on the left edge opens it;
  // it closes with its X, Esc, or by itself after a search.
  const [deskOpen, setDeskOpen] = useState(() => Boolean(location.state?.openSearch));
  useEffect(() => {
    if (location.state?.openSearch) setDeskOpen(true);
    else if (location.state?.view === "map") setDeskOpen(false);
  }, [location.state]);
  const [sheetHeight, setSheetHeight] = useState(64);
  const sheetRef = useRef(null);

  // Lift the floating "Live track" button above the search bar.
  useEffect(() => {
    if (!isMobile) return undefined;
    document.documentElement.style.setProperty("--search-sheet-h", `${sheetHeight + 8}px`);
    return () => document.documentElement.style.removeProperty("--search-sheet-h");
  }, [isMobile, sheetHeight]);

  // Keep the map's floating controls clear of the sheet, whatever its height.
  useEffect(() => {
    if (!isMobile || !sheetRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setSheetHeight(Math.round(entry.contentRect.height)));
    observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, [isMobile]);

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
  const sourceName = Form.useWatch("sourceName", form);
  const destinationName = Form.useWatch("destinationName", form);

  // Real numbers only: a bad coordinate would crash the map (blank page).
  const isCoord = (lat, lng) => Boolean(lat && lng) && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const hasSource = isCoord(sourceLatitude, sourceLongitude);
  const hasDestination = isCoord(destinationLatitude, destinationLongitude);
  const hasBoth = hasSource && hasDestination;

  // The searched start/end double as the pickup/drop for "Request to join".
  const pickup = hasBoth ? { name: sourceName, latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) } : undefined;
  const drop = hasBoth ? { name: destinationName, latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) } : undefined;

  // Before the first search: show today's rides around the one point that's
  // known (the auto-filled current location) so the map isn't empty. The
  // route search itself only runs when the user presses Search.
  useEffect(() => {
    if (lastSearch?.kind === "route" || !(hasSource || hasDestination) || hasBoth) return undefined;
    let cancelled = false;
    const lat = Number(hasSource ? sourceLatitude : destinationLatitude);
    const lng = Number(hasSource ? sourceLongitude : destinationLongitude);
    const timer = setTimeout(() => {
      rideService
        .search({ sourceLatitude: lat, sourceLongitude: lng, destinationLatitude: lat, destinationLongitude: lng, date: dayjs().format("YYYY-MM-DD"), includeFull: true, radius: 50 })
        .then((data) => !cancelled && setResults(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lastSearch, hasSource, hasDestination, hasBoth, sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude]);

  async function runSearch() {
    if (!hasBoth) {
      // Red border + message on whichever box is empty / not picked.
      form.validateFields(["sourceName", "destinationName"]).catch(() => {});
      setLastSearch({ kind: "missing", missing: !hasSource ? "pickup" : "destination" });
      setBannerOpen(true);
      return;
    }
    const [start, end] = dates?.[0] ? dates : [dayjs(), dayjs()];
    const asked = { kind: "route", from: short(sourceName, "your pickup"), to: short(destinationName, "your destination"), start, end: end || start };
    setLoading(true);
    try {
      const data = await rideService.search({
        sourceLatitude: Number(sourceLatitude),
        sourceLongitude: Number(sourceLongitude),
        destinationLatitude: Number(destinationLatitude),
        destinationLongitude: Number(destinationLongitude),
        date: asked.start.format("YYYY-MM-DD"),
        toDate: asked.end.format("YYYY-MM-DD"),
        includeFull: true,
      });
      const list = Array.isArray(data) ? data : [];
      setResults(list);
      // Nothing in the chosen dates: look further ahead (one month) so the passenger
      // hears "there is a ride on Wed 11 Nov" instead of just "no rides".
      let later = null;
      if (list.length === 0) {
        try {
          const wider = await rideService.search({
            sourceLatitude: Number(sourceLatitude),
            sourceLongitude: Number(sourceLongitude),
            destinationLatitude: Number(destinationLatitude),
            destinationLongitude: Number(destinationLongitude),
            date: asked.start.format("YYYY-MM-DD"),
            toDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
            includeFull: true,
          });
          const dates = (Array.isArray(wider) ? wider : []).map((r) => String(r.departureDate).slice(0, 10)).sort();
          if (dates.length) later = { count: dates.length, first: dayjs(dates[0]) };
        } catch {
          // The hint is optional.
        }
      }
      setLastSearch({ ...asked, count: list.length, later });
      setBannerOpen(true);
      // Show the rides on the map; with no results keep the form open so they can change the search.
      if (isMobile && list.length > 0) setSheetOpen(false);
      if (!isMobile && list.length > 0) setDeskOpen(false);
    } catch (err) {
      notification.error({ title: "Couldn't search", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  const presets = [
    { label: "Today", value: [dayjs(), dayjs()] },
    { label: "Tomorrow", value: [dayjs().add(1, "day"), dayjs().add(1, "day")] },
    { label: "Next 3 days", value: [dayjs(), dayjs().add(2, "day")] },
    { label: "This week", value: [dayjs(), dayjs().add(6, "day")] },
    { label: "Next month", value: [dayjs(), dayjs().add(1, "month")] },
  ];

  const goHome = () => navigate("/", { state: { view: "map" } });

  const fields = (
    <>
      <Form form={form} layout="vertical" requiredMark={false}>
        <LocationFields prefix="source" label="Start Location" placeholder="Where do you want to be picked up?" />
        <div className="sp-swap" style={{ display: "flex", justifyContent: "center", margin: "-8px 0 8px" }}>
          <Button shape="round" icon={<SwapOutlined />} onClick={swapLocations}>
            Swap
          </Button>
        </div>
        <LocationFields prefix="destination" label="End Location" placeholder="Where are you going?" />
      </Form>

      <div className="sp-date-label">
        <CalendarOutlined /> When
      </div>
      <DatePicker.RangePicker
        className="sp-range"
        classNames={{ popup: { root: "sp-range-popup" } }}
        value={dates}
        onChange={(v) => setDates(v)}
        presets={isMobile ? undefined : presets}
        format="ddd, D MMM"
        allowClear={false}
        inputReadOnly
        placement="bottomLeft"
        separator={<span className="sp-range-sep">→</span>}
        disabledDate={(d) => d.isBefore(dayjs(), "day") || d.isAfter(dayjs().add(1, "month"), "day")}
      />
      {isMobile && (
        <div className="sp-chips">
          {presets.slice(0, 4).map((p) => (
            <button type="button" key={p.label} className="sp-chip" onClick={() => setDates(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <button type="button" className="sp-search-btn" onClick={runSearch} disabled={loading}>
        {loading ? (
          <>
            <span className="sp-search-icon spinning"><SearchOutlined /></span> Searching…
          </>
        ) : (
          <>
            Find trip <ArrowRightOutlined className="sp-arrow" />
          </>
        )}
      </button>

      <div className="sp-hint">
        Within 2.5 km of a rider&apos;s route is a normal pickup. Some riders also pick up from your place, with a detour fare shown before you ask.
      </div>
    </>
  );

  let banner = null;
  if (bannerOpen && lastSearch?.kind === "missing") {
    banner = { tone: "warn", text: `Add your ${lastSearch.missing} to search for rides.` };
  } else if (bannerOpen && lastSearch?.kind === "route") {
    const when = whenText(lastSearch.start, lastSearch.end);
    banner =
      lastSearch.count > 0
        ? { tone: "ok", text: `${lastSearch.count} ride${lastSearch.count > 1 ? "s" : ""} from ${lastSearch.from} to ${lastSearch.to} ${when}` }
        : {
            tone: "warn",
            text: `No rides from ${lastSearch.from} to ${lastSearch.to} ${when}.`,
            hint: lastSearch.later
              ? `${lastSearch.later.count} ride${lastSearch.later.count > 1 ? "s" : ""} on this route from ${lastSearch.later.first.format("ddd, D MMM")} - pick that date.`
              : lastSearch.start.isSame(lastSearch.end, "day") ? "Try a wider date range." : "Try other dates or a nearby town.",
          };
  }

  const summary =
    sourceName || destinationName ? `${short(sourceName, "Start")} → ${short(destinationName, "Where to?")}` : "Where to?";

  return (
    <div className={`sp-shell ${isMobile ? "sp-mobile" : ""}`} style={{ "--sheet-h": `${sheetHeight}px` }}>
      <div className="sp-map-stage">
        <HomeMapView
          userLocation={hasSource ? { latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) } : null}
          nearbyRides={results}
          loading={loading}
          pickup={pickup}
          drop={drop}
        />
      </div>

      {banner && (
        <div className={`sp-banner sp-banner-${banner.tone}`} role="status">
          {banner.tone === "ok" ? <CheckCircleFilled className="sp-banner-icon" /> : <InfoCircleOutlined className="sp-banner-icon" />}
          <span className="sp-banner-text">
            {banner.text}
            {banner.hint && <span className="sp-banner-hint"> {banner.hint}</span>}
          </span>
          <button type="button" className="sp-banner-close" onClick={() => setBannerOpen(false)} aria-label="Dismiss">
            <CloseOutlined />
          </button>
        </div>
      )}

      {isMobile ? (
        <div ref={sheetRef} className={`sp-sheet ${sheetOpen ? "open" : ""}`}>
          <div className="sp-sheet-head">
            <button type="button" className="sp-sheet-toggle" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen}>
              <span className="sp-sheet-grip" />
              {sheetOpen ? (
                <>
                  <span className="sp-sheet-title">Find trip</span>
                </>
              ) : (
                // Minimized: look like a search box so it's clear where to search.
                <span className="sp-search-pill">
                  <SearchOutlined className="sp-search-icon" />
                  <span className="sp-search-text">
                    <strong>{summary}</strong>
                    <small>Tap to search for a trip</small>
                  </span>
                  <span className="sp-search-go" aria-label="Search"><ArrowRightOutlined /></span>
                </span>
              )}
            </button>
            {sheetOpen && (
              <button type="button" className="sp-sheet-close" onClick={() => { setSheetOpen(false); goHome(); }} aria-label="Close">
                <CloseOutlined />
              </button>
            )}
          </div>
          <div className="sp-sheet-body">{fields}</div>
        </div>
      ) : (
        <>
          <Drawer placement="left" open={deskOpen} onClose={() => setDeskOpen(false)} mask={false} width={380} title="Find trip" rootClassName="sp-drawer">
            {fields}
          </Drawer>
          {!deskOpen && (
            <button type="button" className="sp-edge" onClick={() => setDeskOpen(true)} aria-label="Open Find trip">
              <SearchOutlined />
              <span className="t">FIND TRIP</span>
            </button>
          )}
        </>
      )}

      <style>{`
        .sp-shell{position:relative;height:100%}
        .sp-reopen{position:absolute;top:108px;left:16px;z-index:5;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1px solid var(--chrome-border);background:var(--bg-secondary);color:var(--text-primary);font-weight:600;cursor:pointer;box-shadow:var(--shadow-lg)}
        .sp-reopen:hover{border-color:var(--color-primary)}
        .sp-map-stage{position:absolute;inset:0;z-index:1}

        .sp-drawer .ant-drawer-content-wrapper{top:92px!important;height:calc(100% - 92px)!important;box-shadow:none!important}
        .sp-drawer .ant-drawer-section{background:rgba(11,15,23,0.42);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-right:1px solid var(--chrome-border);box-shadow:var(--shadow-lg)}
        .sp-drawer .ant-drawer-header{background:transparent;border-color:var(--chrome-border)}
        .sp-drawer .ant-drawer-title{color:var(--text-primary)}
        .sp-hint{margin-top:12px;font-size:12px;color:var(--text-secondary);line-height:1.5}

        .sp-date-label{display:flex;align-items:center;gap:6px;margin:2px 0 6px;font-size:13px;color:var(--text-secondary)}
        .sp-range{width:100%;height:44px;border-radius:12px!important;background:var(--chrome-tint)!important;border-color:var(--chrome-border)!important}
        .sp-range .ant-picker-input>input{font-weight:650;color:var(--text-primary)!important;text-align:center}
        .sp-range .ant-picker-suffix{color:#2DD4BF}
        .sp-range-sep{color:#2DD4BF;font-weight:800}
        .sp-range.ant-picker-focused,.sp-range:hover{border-color:#2DD4BF!important;box-shadow:0 0 0 3px rgba(45,212,191,.15)!important}
        .sp-range-popup .ant-picker-panel-container{border-radius:16px!important;overflow:hidden}
        .sp-range-popup .ant-picker-presets ul li{border-radius:999px!important;font-weight:600}
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner,
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner{background:#2DD4BF!important;border-radius:50%!important;color:#fff!important}
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-in-range::before,
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-range-start:not(.ant-picker-cell-range-start-single)::before,
        .sp-range-popup .ant-picker-cell-in-view.ant-picker-cell-range-end:not(.ant-picker-cell-range-end-single)::before{background:rgba(45,212,191,.16)!important}
        .sp-range-popup .ant-picker-cell-today .ant-picker-cell-inner::before{border-color:#2DD4BF!important;border-radius:50%!important}
        .sp-range-popup .ant-picker-cell-disabled .ant-picker-cell-inner{color:var(--text-secondary)!important;opacity:.35;text-decoration:line-through}
        .sp-range-popup .ant-picker-cell-disabled{cursor:not-allowed}
        @media (max-width:768px){.sp-range-popup .ant-picker-panels{flex-direction:column}}

        .sp-chips{display:flex;gap:6px;margin-top:8px;overflow-x:auto}
        .sp-chip{flex-shrink:0;border:1px solid var(--chrome-border);background:var(--chrome-tint);color:var(--text-primary);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer}
        .sp-chip:hover{border-color:#2DD4BF;color:#2DD4BF}

        .sp-search-btn{margin-top:14px;width:100%;height:44px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;color:#2DD4BF;background:transparent;border:1.5px solid #2DD4BF;transition:background .15s ease,color .15s ease,transform .15s ease}
        .sp-search-btn:hover{background:rgba(45,212,191,.12)}
        .sp-search-btn:active{transform:scale(.98)}
        .sp-search-btn:disabled{cursor:progress;opacity:.7}
        .sp-search-btn .sp-arrow{transition:transform .15s ease}
        .sp-search-btn:hover .sp-arrow{transform:translateX(3px)}
        .sp-search-icon{display:inline-grid;place-items:center}
        .sp-search-icon.spinning .anticon{animation:spSpin .8s linear infinite}
        @keyframes spSpin{to{transform:rotate(360deg)}}

        .sp-banner{position:absolute;top:108px;left:50%;transform:translateX(-50%);z-index:650;display:flex;align-items:center;gap:8px;width:max-content;max-width:min(560px,calc(100% - 24px));padding:7px 8px 7px 14px;border-radius:999px;font-size:12.5px;line-height:1.35;color:var(--text-primary);background:rgba(11,15,23,.8);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--chrome-border);box-shadow:0 8px 24px rgba(0,0,0,.25);animation:spIn .25s ease}
        .sp-banner-warn{border-color:rgba(245,158,11,.45)}
        .sp-banner-warn .sp-banner-icon{color:#fbbf24}
        .sp-banner-ok{border-color:rgba(45,212,191,.45)}
        .sp-banner-ok .sp-banner-icon{color:#2DD4BF}
        .sp-banner-text{min-width:0}
        .sp-banner-hint{color:var(--text-secondary)}
        .sp-banner-close{flex-shrink:0;border:0;background:none;cursor:pointer;color:var(--text-tertiary);width:22px;height:22px;border-radius:50%;font-size:10px}
        .sp-banner-close:hover{background:var(--chrome-tint);color:var(--text-primary)}
        @keyframes spIn{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
        @media (min-width:769px){.sp-banner{left:calc(380px + (100% - 380px) / 2)}}

        .sp-sheet{position:absolute;left:0;right:0;bottom:0;z-index:600;max-height:78%;display:flex;flex-direction:column;border-radius:20px 20px 0 0;background:rgba(11,15,23,0.72);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-top:1px solid var(--chrome-border);box-shadow:0 -10px 30px rgba(0,0,0,.3)}
        .sp-sheet-head{display:flex;align-items:center;gap:4px;padding:6px 8px 6px 4px}
        .sp-sheet-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:10px;position:relative;border:0;background:none;cursor:pointer;padding:16px 8px 10px 12px;color:var(--text-primary);text-align:left}
        .sp-sheet-grip{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:38px;height:4px;border-radius:4px;background:var(--chrome-border)}
        .sp-sheet-title{flex:1;min-width:0;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sp-sheet-chevron{font-size:13px;color:var(--text-secondary);transition:transform .2s ease;transform:rotate(180deg)}
        .sp-sheet.open .sp-sheet-chevron{transform:rotate(0)}
        .sp-search-pill{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px;border-radius:999px;background:var(--bg-primary);border:1.5px solid #2DD4BF;box-shadow:0 0 0 4px rgba(45,212,191,.15)}
        .sp-search-icon{font-size:18px;color:#2DD4BF}
        .sp-search-text{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
        .sp-search-text strong{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sp-search-text small{font-size:11.5px;color:var(--text-secondary)}
        .sp-search-go{flex-shrink:0;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#2DD4BF;color:#04211d;font-size:15px}
        .sp-sheet-close{border:0;background:none;cursor:pointer;color:var(--text-secondary);font-size:15px;width:36px;height:36px;border-radius:50%}
        .sp-sheet-body{overflow:auto;padding:0 16px 16px;max-height:0;transition:max-height .25s ease;padding-bottom:0}
        .sp-sheet.open .sp-sheet-body{max-height:68vh;padding-bottom:16px}

        .sp-mobile .sp-hint{display:none}
        .sp-mobile .sp-sheet .ant-form-item-label{display:none}
        .sp-mobile .sp-swap{margin:-2px 0 6px!important}
        .sp-mobile .sp-sheet .ant-form-item{margin-bottom:8px}
        .sp-mobile .leaflet-control-zoom{display:none}
        .sp-mobile .hmv-locate-btn{bottom:calc(var(--sheet-h, 64px) + 14px)}
        .sp-mobile .sp-banner{top:84px}
      `}</style>
    </div>
  );
}
