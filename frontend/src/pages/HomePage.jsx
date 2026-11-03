import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import HomeMapView from "../components/home/HomeMapView.jsx";
import HomeCardView from "../components/home/HomeCardView.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useActiveBookings } from "../components/home/MyBookingCard.jsx";

function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // The map is the default view; logged-in users get a toggle to the card view.
  // Callers can ask for a specific view via navigate("/", { state: { view } })
  // (e.g. closing the create-ride drawer lands on the map).
  const requestedView = useLocation().state?.view;
  const [view, setView] = useState(requestedView || "map");
  useEffect(() => {
    setView(requestedView || "map");
  }, [isAuthenticated, requestedView]);

  const findRide = () => navigate("/search");

  const [nearbyRides, setNearbyRides] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch nearby available rides using the browser's geolocation as the
  // starting point, defaulting to today and 1 seat.
  useEffect(() => {
    let cancelled = false;

    function runSearch(lat, lng) {
      setUserLocation({ latitude: lat, longitude: lng });
      setLoadingNearby(true);
      rideService
        // Every upcoming published trip (next 7 days), nearest first - not just
        // trips whose start AND end are both within 50 km of the viewer, which
        // hid other users' trips whenever they were farther away.
        .explore({
          from: dayjs().format("YYYY-MM-DD"),
          days: 7,
          latitude: lat,
          longitude: lng,
        })
        .then((data) => {
          if (!cancelled) setNearbyRides(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setNearbyRides([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingNearby(false);
        });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => runSearch(pos.coords.latitude, pos.coords.longitude),
        // Fall back to Madurai if location access is denied/unavailable.
        () => runSearch(9.9252, 78.1198),
        { timeout: 5000 }
      );
    } else {
      runSearch(9.9252, 78.1198);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // The passenger's accepted rides: shown on the map and as a "your ride" card
  // (with Pay now while payment is due). An accepted ride is usually full, so
  // it isn't in the explore list - add it so it still appears.
  const myBookings = useActiveBookings(isAuthenticated);
  const ridesOnMap = useMemo(() => {
    const booked = myBookings.map((b) => ({ ...b.ride, id: b.ride?.id || b.rideId, myBooking: b }));
    const bookedIds = new Set(booked.map((r) => r.id));
    return [...booked, ...nearbyRides.filter((r) => !bookedIds.has(r.id))];
  }, [myBookings, nearbyRides]);

  return (
    <div className="hp-shell">
      {isAuthenticated && (
        <div className="hp-tabs">
          <div className="hp-tabs-inner">
            <button type="button" className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
              Map view
            </button>
            <button type="button" className={view === "card" ? "active" : ""} onClick={() => setView("card")}>
              Card view
            </button>
          </div>
        </div>
      )}

      <div className="hp-stage">
        {view === "card" && isAuthenticated ? (
          <HomeCardView nearbyRides={nearbyRides} myBookings={myBookings} loading={loadingNearby} onSearchAll={findRide} />
        ) : (
          <HomeMapView userLocation={userLocation} nearbyRides={ridesOnMap} myBookings={myBookings} loading={loadingNearby} />
        )}
      </div>

      <style>{`
        .hp-shell{position:relative;height:100%}
        .hp-stage{position:absolute;inset:0;overflow:auto;z-index:1}

        .hp-tabs{position:absolute;top:102px;left:50%;transform:translateX(-50%);z-index:600}
        .hp-tabs-inner{display:flex;background:var(--bg-primary);border:1px solid var(--chrome-border);border-radius:999px;padding:4px;gap:2px;box-shadow:var(--shadow-lg)}
        .hp-tabs button{border:none;cursor:pointer;padding:8px 20px;border-radius:999px;font-size:13px;font-weight:600;background:transparent;color:var(--text-secondary);transition:background .2s ease,color .2s ease}
        .hp-tabs button.active{background:#2DD4BF;color:var(--text-inverse)}

        @media (max-width:480px){
          .hp-tabs{top:94px}
          .hp-tabs button{padding:7px 16px;font-size:12.5px}
        }
      `}</style>
    </div>
  );
}

export default HomePage;
