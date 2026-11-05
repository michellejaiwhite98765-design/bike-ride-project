import { Alert } from "antd";

/**
 * Under the code box: while OTP_DEV_MODE is on (testing) shows the code on
 * screen too, and whenever a real SMS was sent reminds people that phone spam
 * filters often move it to Spam/Blocked.
 */
export default function OtpCodeNotice({ code, smsSent, style }) {
  if (!code && !smsSent) return null;
  return (
    <div style={style}>
      {code && (
        <Alert
          type="info"
          showIcon
          message={
            smsSent ? (
              <>Sent by SMS · also shown here for testing: <strong>{code}</strong></>
            ) : (
              <>Test mode (no SMS yet) · your code is <strong>{code}</strong></>
            )
          }
        />
      )}
      {smsSent && (
        <div style={{ marginTop: code ? 8 : 0, fontSize: 12.5, color: "var(--text-secondary)" }}>
          Didn't get the SMS? Check your <strong>Spam</strong> or <strong>Blocked</strong> messages. It can take a minute to arrive.
        </div>
      )}
    </div>
  );
}
