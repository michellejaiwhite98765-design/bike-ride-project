import { Card as AntCard } from "antd";
import styled from "styled-components";
import colors from "../../theme/colors.js";

const StyledCard = styled(AntCard)`
  background-color: ${colors.bgPrimary};
  border: none;
  border-radius: 12px;
  box-shadow: ${colors.shadowMd};
  transition: all 0.2s ease;

  .ant-card-head {
    border-bottom: 1px solid ${colors.border};
    padding: 20px;
    background-color: ${colors.bgPrimary};
  }

  .ant-card-body {
    padding: 20px;
  }

  &:hover {
    box-shadow: ${colors.shadowLg};
  }

  &.interactive {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: ${colors.shadowLg};
    }
  }

  &.elevated {
    box-shadow: ${colors.shadowLg};
  }

  &.flat {
    box-shadow: none;
    border: 1px solid ${colors.border};
  }
`;

export default function Card({ interactive = false, elevated = false, flat = false, ...props }) {
  const className = [
    interactive && "interactive",
    elevated && "elevated",
    flat && "flat",
  ]
    .filter(Boolean)
    .join(" ");

  return <StyledCard className={className} {...props} />;
}
