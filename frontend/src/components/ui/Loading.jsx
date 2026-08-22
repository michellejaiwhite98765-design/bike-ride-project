import { Skeleton } from "antd";
import styled from "styled-components";
import colors from "../../theme/colors.js";

const SkeletonContainer = styled.div`
  .ant-skeleton-title {
    margin-bottom: 12px;
  }

  .ant-skeleton-paragraph {
    margin: 0;

    > li {
      height: 12px;
      margin-bottom: 8px;
    }
  }
`;

const RideCardSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: ${colors.bgPrimary};
  box-shadow: ${colors.shadowMd};

  .skeleton-header {
    display: flex;
    gap: 12px;
    align-items: center;

    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${colors.bgSecondary};
      animation: pulse 2s infinite;
    }

    .skeleton-text {
      flex: 1;

      .line {
        height: 12px;
        background: ${colors.bgSecondary};
        border-radius: 4px;
        margin-bottom: 8px;
        animation: pulse 2s infinite;

        &:last-child {
          margin-bottom: 0;
          width: 80%;
        }
      }
    }
  }

  .skeleton-route {
    height: 40px;
    background: ${colors.bgSecondary};
    border-radius: 8px;
    animation: pulse 2s infinite;
  }

  .skeleton-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    .detail-line {
      height: 12px;
      background: ${colors.bgSecondary};
      border-radius: 4px;
      animation: pulse 2s infinite;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
`;

export function LoadingSkeleton() {
  return (
    <SkeletonContainer>
      <Skeleton active paragraph={{ rows: 4 }} />
    </SkeletonContainer>
  );
}

export function RideCardLoadingSkeleton() {
  return (
    <RideCardSkeleton>
      <div className="skeleton-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-text">
          <div className="line" />
          <div className="line" style={{ width: "70%" }} />
        </div>
      </div>
      <div className="skeleton-route" />
      <div className="skeleton-details">
        <div className="detail-line" />
        <div className="detail-line" />
        <div className="detail-line" />
        <div className="detail-line" />
      </div>
    </RideCardSkeleton>
  );
}

export default LoadingSkeleton;
