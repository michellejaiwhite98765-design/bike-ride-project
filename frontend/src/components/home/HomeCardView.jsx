import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import RideCard from "../ride/RideCard.jsx";
import BrandLoader from "../ui/BrandLoader.jsx";
import MyTripCard from "./MyTripCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function HomeCardView({ nearbyRides: allRides, loading, onSearchAll }) {
  const { user } = useAuth();
  // The user's own open trip is shown in MyTripCard, not again in the grid.
  const nearbyRides = allRides.filter((ride) => ride.riderId !== user?.id);
  return (
    <div className="hcv-wrap">
      <MyTripCard />
      {loading ? (
        <BrandLoader variant="inline" label="Finding rides near you…" />
      ) : nearbyRides.length === 0 ? (
        <Empty description="No nearby rides found right now.">
          <Button type="primary" onClick={onSearchAll}>
            Search all rides
          </Button>
        </Empty>
      ) : (
        <div className="hcv-grid">
          {nearbyRides.map((ride) => (
            <RideCard key={ride.id} ride={ride} showMatch />
          ))}
        </div>
      )}

      {!loading && nearbyRides.length > 0 && (
        <Button type="link" className="hcv-more" onClick={onSearchAll}>
          Search all rides <ArrowRightOutlined />
        </Button>
      )}

      <style>{`
        .hcv-wrap{padding:160px 16px 16px}
        .hcv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .hcv-more{padding-left:0;margin-top:8px}
        @media (max-width:480px){
          .hcv-wrap{padding:150px 12px 12px}
        }
      `}</style>
    </div>
  );
}
