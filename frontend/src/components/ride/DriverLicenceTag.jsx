import { SafetyCertificateFilled, WarningFilled } from "@ant-design/icons";

/**
 * "Verified driver" when the driver's licence is verified (and not expired),
 * otherwise "Unverified driver" - drivers can create trips before adding it.
 * Renders nothing when the trip data doesn't say (older API).
 */
export default function DriverLicenceTag({ rider, compact = false }) {
  if (rider?.licenceVerified === undefined) return null;
  const ok = Boolean(rider.licenceVerified);
  return (
    <span
      className={`dlt ${ok ? "dlt-ok" : "dlt-no"}`}
      title={ok ? "Driving licence verified" : "This driver hasn't verified a driving licence yet"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? "1px 7px" : "2px 9px",
        borderRadius: 999,
        fontSize: compact ? 10.5 : 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: ok ? "#15803d" : "#b45309",
        background: ok ? "rgba(34,197,94,.14)" : "rgba(245,158,11,.16)",
        border: `1px solid ${ok ? "rgba(34,197,94,.4)" : "rgba(245,158,11,.45)"}`,
      }}
    >
      {ok ? <SafetyCertificateFilled /> : <WarningFilled />}
      {ok ? "Verified driver" : "Unverified driver"}
    </span>
  );
}
