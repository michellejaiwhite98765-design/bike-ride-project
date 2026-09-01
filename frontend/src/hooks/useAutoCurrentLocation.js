import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { reverseGeocode } from "../utils/geo.js";

/**
 * Silently pre-fills a form's `${prefix}Name/Latitude/Longitude/Country`
 * fields with the signed-in user's current browser location, so pickup
 * fields start populated instead of empty. Only runs once per `enabled`
 * transition, only for logged-in users, and only when that field is still
 * empty — it never overwrites a location the user (or an edit-mode preload)
 * already set. Geolocation errors/denials fail silently since this is a
 * convenience default, not a required step; the field stays manually
 * editable either way.
 */
export default function useAutoCurrentLocation(form, prefix = "source", { enabled = true } = {}) {
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user || !form) return;
    if (!navigator.geolocation) return;
    if (form.getFieldValue(`${prefix}Latitude`) != null) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        try {
          const { name, country } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (cancelled || form.getFieldValue(`${prefix}Latitude`) != null) return;
          form.setFieldsValue({
            [`${prefix}Name`]: name.slice(0, 150),
            [`${prefix}Latitude`]: pos.coords.latitude,
            [`${prefix}Longitude`]: pos.coords.longitude,
            [`${prefix}Country`]: country,
          });
        } catch {
          // Reverse geocoding failed — leave the field empty for manual entry.
        }
      },
      () => {
        // Permission denied / unavailable — leave the field empty for manual entry.
      },
      { timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user, form, prefix]);
}
