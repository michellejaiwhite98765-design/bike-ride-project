// Suggested tip when a rider chooses WITH_TIP on Create Ride - a starting
// point the rider can still edit, not a locked/enforced price.
export const TIP_RATE_PER_KM = 5;
// Trips longer than this use the lower per-km rate.
export const LONG_TRIP_KM = 300;
export const TIP_RATE_LONG_PER_KM = 4;
export const tipRateForKm = (km) => (Number(km) > LONG_TRIP_KM ? TIP_RATE_LONG_PER_KM : TIP_RATE_PER_KM);

// Pickup zones (mirror the server's defaults in backend/src/config/env.js).
export const PICKUP_ON_ROUTE_KM = 2.5;
export const DETOUR_MAX_PERCENT = 20;
export const DETOUR_MAX_KM = 30;
