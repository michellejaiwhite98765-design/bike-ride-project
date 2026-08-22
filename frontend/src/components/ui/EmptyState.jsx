import styled from "styled-components";
import colors from "../../theme/colors.js";
import { Empty } from "antd";
import { SearchOutlined, EnvironmentOutlined, AlertOutlined } from "@ant-design/icons";

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 400px;

  .empty-icon {
    font-size: 64px;
    color: ${colors.textTertiary};
    margin-bottom: 24px;
    opacity: 0.5;
  }

  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: ${colors.textPrimary};
    margin-bottom: 8px;
  }

  .empty-description {
    font-size: 14px;
    color: ${colors.textSecondary};
    max-width: 400px;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .empty-action {
    button {
      min-width: 180px;
    }
  }
`;

export function EmptyState({ icon = null, title, description, action = null }) {
  return (
    <EmptyStateContainer>
      {icon && <div className="empty-icon">{icon}</div>}
      {title && <div className="empty-title">{title}</div>}
      {description && <div className="empty-description">{description}</div>}
      {action && <div className="empty-action">{action}</div>}
    </EmptyStateContainer>
  );
}

export function NoRidesEmpty() {
  return (
    <EmptyState
      icon={<SearchOutlined />}
      title="No rides found"
      description="Try changing your pickup location, destination, or date to find more rides."
    />
  );
}

export function NoLocationEmpty() {
  return (
    <EmptyState
      icon={<EnvironmentOutlined />}
      title="Enable location access"
      description="We need your location to show you nearby rides. Please enable location permission in your browser settings."
    />
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry = null }) {
  return (
    <EmptyState
      icon={<AlertOutlined />}
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "10px 24px",
              background: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Try Again
          </button>
        )
      }
    />
  );
}

export default EmptyState;
