import styled from "styled-components";
import colors from "../../theme/colors.js";
import { CheckCircleOutlined } from "@ant-design/icons";

const BadgeContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &.verified {
    background-color: #dcfce7;
    color: #166534;
  }

  &.success {
    background-color: #dcfce7;
    color: #166534;
  }

  &.warning {
    background-color: #fef3c7;
    color: #92400e;
  }

  &.error {
    background-color: #fee2e2;
    color: #991b1b;
  }

  &.info {
    background-color: #ccfbf1;
    color: #134e4a;
  }

  &.default {
    background-color: ${colors.bgSecondary};
    color: ${colors.textSecondary};
  }

  svg {
    font-size: 14px;
  }
`;

export function Badge({ type = "default", icon = null, children, ...props }) {
  return (
    <BadgeContainer className={type} {...props}>
      {icon}
      {children}
    </BadgeContainer>
  );
}

export function VerifiedBadge(props) {
  return (
    <Badge type="verified" icon={<CheckCircleOutlined />} {...props}>
      Verified
    </Badge>
  );
}

export default Badge;
