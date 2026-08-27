import { Button as AntButton } from "antd";
import styled from "styled-components";
import colors from "../../theme/colors.js";

const StyledButton = styled(AntButton)`
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: none;
  border: none;

  &.ant-btn-primary {
    background-color: ${colors.primary};
    color: white;

    &:hover {
      background-color: ${colors.primaryDark};
      box-shadow: ${colors.shadowMd};
    }

    &:active {
      background-color: ${colors.primaryDark};
    }
  }

  &.ant-btn-default {
    color: ${colors.textPrimary};
    border: 1px solid ${colors.border};
    background-color: white;

    &:hover {
      color: ${colors.primary};
      border-color: ${colors.primary};
    }
  }

  &.ant-btn-text {
    color: ${colors.textSecondary};

    &:hover {
      color: ${colors.primary};
    }
  }

  &.ant-btn-dashed {
    border: 1px dashed ${colors.border};
    color: ${colors.textSecondary};

    &:hover {
      color: ${colors.primary};
      border-color: ${colors.primary};
    }
  }

  &.ant-btn-lg {
    height: 48px;
    font-size: 16px;
  }

  &.ant-btn-sm {
    height: 32px;
    font-size: 12px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default function Button(props) {
  return <StyledButton {...props} />;
}
