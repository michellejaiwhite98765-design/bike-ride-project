import { useCallback, useEffect, useState } from "react";
import { userService } from "../services/userService.js";

/**
 * The signed-in user's rider status: a user with a vehicle is a rider; they
 * can create trips once their driving licence and a vehicle are verified.
 * status is null while loading.
 */
export function useRiderStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setError(null);
    return userService
      .getRiderStatus()
      .then((s) => {
        setStatus(s);
        return s;
      })
      .catch((err) => {
        setError(err);
        // Treat as "can't tell": don't hide anything the user may need.
        setStatus({ isRider: true, canCreateTrip: false, missing: [], licence: { status: "NOT_SUBMITTED" }, unknown: true });
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, loading: status === null, error, reload };
}
