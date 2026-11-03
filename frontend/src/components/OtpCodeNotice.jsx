import { Alert } from "antd";

/**
 * Shows an OTP on screen while OTP_DEV_MODE is on (testing): says whether it
 * was also sent by SMS or, with no SMS provider yet, only shown here.
 */
export default function OtpCodeNotice({ code, smsSent, style }) {
  if (!code) return null;
  return (
    <Alert
      type="info"
      showIcon
      style={style}
      message={
        smsSent ? (
          <>Sent by SMS · also shown here for testing: <strong>{code}</strong></>
        ) : (
          <>Test mode (no SMS yet) · your code is <strong>{code}</strong></>
        )
      }
    />
  );
}
