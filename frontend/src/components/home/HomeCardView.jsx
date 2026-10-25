import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import RideCard from "../ride/RideCard.jsx";
import AppLoader from "../ui/AppLoader.jsx";
import { RideCardLoadingSkeleton } from "../ui/Loading.jsx";

export default function HomeCardView({ nearbyRides, loading, onSearchAll }) {
  return (
    <div className="hcv-wrap">
      {loading ? (
        <>
          <AppLoader fullscreen={false} label="Finding rides near you…" />
          <div className="hcv-grid hcv-skeletons" aria-hidden="true">
            <RideCardLoadingSkeleton />
            <RideCardLoadingSkeleton />
            <RideCardLoadingSkeleton />
          </div>
        </>
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
        .hcv-wrap > .app-loader{padding:8px 16px 24px}
        .hcv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .hcv-skeletons{opacity:.55}
        .hcv-more{padding-left:0;margin-top:8px}
        @media (max-width:480px){
          .hcv-wrap{padding:150px 12px 12px}
        }
      `}</style>
    </div>
  );
}
