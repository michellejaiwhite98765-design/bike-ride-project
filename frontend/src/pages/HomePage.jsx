import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import HomeMapView from "../components/home/HomeMapView.jsx";
import HomeCardView from "../components/home/HomeCardView.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // Guests only get the map; once logged in the card view is the default,
  // with a toggle to switch back to the map.
  // Callers can ask for a specific view via navigate("/", { state: { view } })
  // (e.g. closing the create-ride drawer lands on the map).
  const requestedView = useLocation().state?.view;
  const [view, setView] = useState(requestedView || (isAuthenticated ? "card" : "map"));
  useEffect(() => {
    setView(requestedView || (isAuthenticated ? "card" : "map"));
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
        .search({
          sourceLatitude: lat,
          sourceLongitude: lng,
          destinationLatitude: lat,
          destinationLongitude: lng,
          date: dayjs().format("YYYY-MM-DD"),
          seats: 1,
          radius: 50,
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
          <HomeCardView nearbyRides={nearbyRides} loading={loadingNearby} onSearchAll={findRide} />
        ) : (
          <HomeMapView userLocation={userLocation} nearbyRides={nearbyRides} loading={loadingNearby} />
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
