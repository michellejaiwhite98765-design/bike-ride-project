import { useEffect, useRef, useState } from "react";

// Turn-by-turn guidance for the live tracking full-screen view: the road route
// from the bike's current position to where it's going, from OSRM, and the
// next manoeuvre on it ("Turn right in 200 m onto MG Road").

const REFETCH_MIN_MS = 15000; // don't ask OSRM more often than this...
const REFETCH_MOVED_M = 60; // ...and only once the bike has actually moved

function metersBetween(a, b) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** "250 m" / "1.4 km" - rounded the way navigation apps call distances out. */
export function formatDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) return "";
  if (meters < 50) return "now";
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

/**
 * Which way to point the arrow, and what to say, for an OSRM step.
 * direction: left | right | slight-left | slight-right | sharp-left | sharp-right | straight | uturn | arrive | roundabout
 */
export function describeStep(step) {
  const { type, modifier, exit } = step.maneuver || {};
  const road = step.name || step.ref || "";
  const onto = road ? ` onto ${road}` : "";
  const direction =
    type === "arrive" ? "arrive"
      : type === "roundabout" || type === "rotary" || type === "roundabout turn" ? "roundabout"
        : (modifier || "straight").replace(" ", "-");
  const turnWords = {
    left: "Turn left",
    right: "Turn right",
    "slight-left": "Keep left",
    "slight-right": "Keep right",
    "sharp-left": "Sharp left",
    "sharp-right": "Sharp right",
    uturn: "Make a U-turn",
    straight: "Continue straight",
  };

  let text;
  if (type === "arrive") text = "Arrive at destination";
  else if (direction === "roundabout") text = `At the roundabout, take the ${ordinal(exit || 1)} exit${onto}`;
  else if (type === "merge") text = `Merge${modifier ? ` ${modifier.replace("slight ", "")}` : ""}${onto}`;
  else if (type === "fork") text = `${modifier?.includes("left") ? "Keep left" : "Keep right"} at the fork${onto}`;
  else if (type === "end of road") text = `${turnWords[direction] || "Turn"} at the end of the road${onto}`;
  else if (type === "on ramp") text = `Take the ramp${onto}`;
  else if (type === "off ramp") text = `Take the exit${onto}`;
  else text = `${turnWords[direction] || "Continue"}${onto}`;
  return { direction, text, road };
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

async function fetchSteps(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    "?overview=false&steps=true";
  const res = await fetch(url);
  if (!res.ok) throw new Error("route unavailable");
  const data = await res.json();
  return data?.routes?.[0]?.legs?.[0]?.steps || [];
}

/**
 * Next manoeuvre for a bike at `position` heading to `target`:
 * { direction, text, road, distanceM, thenText } or null while loading/unavailable.
 * The route is fetched from the bike's position, so step 0 starts where the bike
 * is and its length is the distance to the next turn.
 */
export function useNextTurn(position, target, enabled = true) {
  const [nextTurn, setNextTurn] = useState(null);
  const last = useRef({ at: 0, from: null, key: "" });
  const latestRequest = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const lat = position ? Number(position.latitude) : null;
  const lng = position ? Number(position.longitude) : null;
  const targetKey = target ? `${target.latitude},${target.longitude}` : "";

  useEffect(() => {
    if (!enabled || lat == null || lng == null || !target) {
      setNextTurn(null);
      return undefined;
    }
    const from = { latitude: lat, longitude: lng };
    const prev = last.current;
    const sameTarget = prev.key === targetKey;
    const moved = prev.from ? metersBetween(prev.from, from) : Infinity;
    if (sameTarget && (Date.now() - prev.at < REFETCH_MIN_MS || moved < REFETCH_MOVED_M)) return undefined;

    // Not aborted when the position changes: a newer position that arrives
    // inside the throttle window must not cancel this (only) request.
    const requestId = (latestRequest.current += 1);
    last.current = { at: Date.now(), from, key: targetKey };
    fetchSteps(from, target)
      .then((steps) => {
        if (!mounted.current || requestId !== latestRequest.current) return;
        if (!steps.length) return setNextTurn(null);
        // steps[0] is "depart" from the bike's spot; steps[1] is the next manoeuvre.
        const upcoming = steps[1] || steps[0];
        const after = steps[2];
        setNextTurn({
          ...describeStep(upcoming),
          distanceM: steps[1] ? steps[0].distance : 0,
          from,
          thenText: after ? describeStep(after).text : null,
        });
      })
      .catch(() => {
        // Routing down / offline: keep the last instruction rather than flicker.
      });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, lat, lng, targetKey]);

  // Between route fetches, count the distance down as the bike moves: the road
  // distance at fetch time, less how far the bike has come since.
  if (!nextTurn || lat == null) return nextTurn;
  const travelled = nextTurn.from ? metersBetween(nextTurn.from, { latitude: lat, longitude: lng }) : 0;
  return { ...nextTurn, distanceM: Math.max(0, nextTurn.distanceM - travelled) };
}

export { metersBetween };
