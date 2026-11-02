// Tells listeners (the floating Live track button) that this user's current
// trip may have changed - a ride started, completed or cancelled, a booking
// cancelled, a passenger dropped off - so they re-check now instead of on the
// next poll. Returns `value` so it can sit at the end of a promise chain.
const EVENT = "bikeride:trip-changed";

export function notifyTripChanged(value) {
  window.dispatchEvent(new Event(EVENT));
  return value;
}

export function onTripChanged(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
