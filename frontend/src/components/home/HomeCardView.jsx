import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Empty, Skeleton } from "antd";
import RideCard from "../ride/RideCard.jsx";

export default function HomeCardView({ nearbyRides, loading, onSearchAll }) {
  return (
    <div className="hcv-wrap">
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
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
