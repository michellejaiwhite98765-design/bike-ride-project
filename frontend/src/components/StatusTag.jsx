import { Tag } from "antd";

const COLORS = {
  DRAFT: "default",
  PUBLISHED: "blue",
  STARTED: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
  EXPIRED: "default",
  REQUESTED: "gold",
  ACCEPTED: "success",
  REJECTED: "error",
  PAYMENT_PENDING: "warning",
  PAYMENT_REQUIRED: "warning",
  CONFIRMED: "success",
  NOT_REQUIRED: "default",
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "error",
  REFUNDED: "purple",
  VERIFIED: "success",
  REJECTED_VEHICLE: "error",
};

export default function StatusTag({ status }) {
  if (!status) return null;
  return <Tag color={COLORS[status] || "default"}>{status.replace(/_/g, " ")}</Tag>;
}
