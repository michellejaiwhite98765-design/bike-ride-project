import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, App, Drawer, Button } from "antd";
import { SwapOutlined, UpOutlined, CloseOutlined } from "@ant-design/icons";
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

export default function SearchPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  useAutoCurrentLocation(form, "source");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(64);
  const sheetRef = useRef(null);

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

  const hasSource = Boolean(sourceLatitude && sourceLongitude);
  const hasDestination = Boolean(destinationLatitude && destinationLongitude);
  const hasBoth = hasSource && hasDestination;

  // Once both ends are picked, tuck the sheet away so the routes are visible.
  useEffect(() => {
    if (isMobile && hasBoth) setSheetOpen(false);
  }, [isMobile, hasBoth]);
  const sourceName = Form.useWatch("sourceName", form);
  const destinationName = Form.useWatch("destinationName", form);
  // The searched start/end double as the pickup/drop for "Request to join".
  const pickup = hasBoth ? { name: sourceName, latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) } : undefined;
  const drop = hasBoth ? { name: destinationName, latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) } : undefined;

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
      <div className="sp-hint">
        Rides along your route show up on the map as you fill in the start and end.
        Within 2.5 km of a rider&apos;s route is a normal pickup; farther away the rider can make a short detour for a higher fare.
      </div>
    </>
  );

  const summary =
    sourceName || destinationName
      ? `${(sourceName || "Start").split(",")[0]} → ${(destinationName || "Where to?").split(",")[0]}`
      : "Where to?";

  return (
    <div className={`sp-shell ${isMobile ? "sp-mobile" : ""}`} style={{ "--sheet-h": `${sheetHeight}px` }}>
      <div className="sp-map-stage">
        <HomeMapView
          userLocation={
            sourceLatitude && sourceLongitude
              ? { latitude: Number(sourceLatitude), longitude: Number(sourceLongitude) }
              : null
          }
          nearbyRides={results}
          loading={loading}
          pickup={pickup}
          drop={drop}
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

      {isMobile ? (
        <div ref={sheetRef} className={`sp-sheet ${sheetOpen ? "open" : ""}`}>
          <div className="sp-sheet-head">
            <button type="button" className="sp-sheet-toggle" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen}>
              <span className="sp-sheet-grip" />
              <span className="sp-sheet-title">{sheetOpen ? "Find trip" : summary}</span>
              <UpOutlined className="sp-sheet-chevron" />
            </button>
            <button type="button" className="sp-sheet-close" onClick={goHome} aria-label="Close">
              <CloseOutlined />
            </button>
          </div>
          <div className="sp-sheet-body">{fields}</div>
        </div>
      ) : (
        <Drawer placement="left" open onClose={goHome} mask={false} width={380} title="Find trip" rootClassName="sp-drawer">
          {fields}
        </Drawer>
      )}

      <style>{`
        .sp-shell{position:relative;height:100%}
        .sp-map-stage{position:absolute;inset:0;z-index:1}

        .sp-drawer .ant-drawer-content-wrapper{top:92px!important;height:calc(100% - 92px)!important;box-shadow:none!important}
        .sp-drawer .ant-drawer-section{background:rgba(11,15,23,0.42);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-right:1px solid var(--chrome-border);box-shadow:var(--shadow-lg)}
        .sp-drawer .ant-drawer-header{background:transparent;border-color:var(--chrome-border)}
        .sp-drawer .ant-drawer-title{color:var(--text-primary)}
        .sp-hint{margin-top:8px;font-size:12.5px;color:var(--text-secondary)}

        .sp-sheet{position:absolute;left:0;right:0;bottom:0;z-index:600;max-height:70%;display:flex;flex-direction:column;border-radius:20px 20px 0 0;background:rgba(11,15,23,0.72);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-top:1px solid var(--chrome-border);box-shadow:0 -10px 30px rgba(0,0,0,.3)}
        .sp-sheet-head{display:flex;align-items:center;gap:4px;padding:6px 8px 6px 4px}
        .sp-sheet-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:10px;position:relative;border:0;background:none;cursor:pointer;padding:16px 8px 10px 12px;color:var(--text-primary);text-align:left}
        .sp-sheet-grip{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:38px;height:4px;border-radius:4px;background:var(--chrome-border)}
        .sp-sheet-title{flex:1;min-width:0;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sp-sheet-chevron{font-size:13px;color:var(--text-secondary);transition:transform .2s ease;transform:rotate(180deg)}
        .sp-sheet.open .sp-sheet-chevron{transform:rotate(0)}
        .sp-sheet-close{border:0;background:none;cursor:pointer;color:var(--text-secondary);font-size:15px;width:36px;height:36px;border-radius:50%}
        .sp-sheet-body{overflow:auto;padding:0 16px 16px;max-height:0;transition:max-height .25s ease;padding-bottom:0}
        .sp-sheet.open .sp-sheet-body{max-height:60vh;padding-bottom:16px}

        .sp-mobile .sp-hint{display:none}
        .sp-mobile .sp-sheet .ant-form-item-label{display:none}
        .sp-mobile .sp-swap{margin:-2px 0 6px!important}
        .sp-mobile .sp-sheet .ant-form-item{margin-bottom:8px}
        .sp-mobile .leaflet-control-zoom{display:none}
        .sp-mobile .hmv-locate-btn{bottom:calc(var(--sheet-h, 64px) + 14px)}
        .sp-mobile .sp-empty-card{top:84px;bottom:auto}

        .sp-empty-card{position:absolute;left:14px;right:14px;bottom:14px;z-index:500;background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:14px;text-align:center;color:#475569;font-size:13px}
      `}</style>
    </div>
  );
}
