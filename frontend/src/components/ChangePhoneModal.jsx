import { useEffect, useState } from "react";
import { Modal, Input, Button, App, Steps } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import { authService } from "../services/authService.js";
import { userService } from "../services/userService.js";
import OtpCodeNotice from "./OtpCodeNotice.jsx";

const MOBILE_RE = /^(\+?91|0)?[6-9]\d{9}$/;
const tenDigits = (v) => String(v || "").replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");
const masked = (p) => (p ? `${p.slice(0, 2)}XXXXXX${p.slice(-2)}` : "");

/**
 * Change the account's mobile number in three steps:
 *  1. Verify current number - OTP to the number on the account.
 *  2. New number - enter it; an OTP goes to it.
 *  3. Verify new number - enter that code; the number is saved.
 * The server requires both verifications. Calls onChanged(user).
 */
export default function ChangePhoneModal({ open, currentPhone, onClose, onChanged }) {
  const { notification } = App.useApp();
  const [step, setStep] = useState(0);
  const [currentToken, setCurrentToken] = useState(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [shown, setShown] = useState(null); // { code, smsSent } while OTP_DEV_MODE is on
  const [sent, setSent] = useState(false); // step 1: code sent to the current number
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setCurrentToken(null);
      setPhone("");
      setOtp("");
      setShown(null);
      setSent(false);
      setResendIn(0);
    }
  }, [open]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const newPhone = tenDigits(phone);

  async function run(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setBusy(false);
    }
  }

  const codeSent = (res) => {
    setShown(res?.devOtp ? { code: res.devOtp, smsSent: res.smsSent } : null);
    setResendIn(res?.resendAfterSeconds || 30);
    setOtp("");
  };

  // Step 1
  const sendCurrent = () => run(async () => {
    codeSent(await userService.sendOwnPhoneOtp(currentPhone));
    setSent(true);
  });
  const verifyCurrent = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit code");
    const res = await userService.verifyOwnPhoneOtp(otp, currentPhone);
    setCurrentToken(res.currentPhoneToken);
    setShown(null);
    setOtp("");
    setResendIn(0);
    setStep(1);
  });

  // Step 2
  const sendNew = () => run(async () => {
    if (!MOBILE_RE.test(String(phone).replace(/[\s-]/g, ""))) throw new Error("Enter a valid 10-digit mobile number");
    if (newPhone === currentPhone) throw new Error("That's already your number");
    codeSent(await authService.sendPhoneOtp(newPhone));
    setStep(2);
  });

  // Step 3
  const verifyNewAndSave = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit code");
    const { verificationToken } = await authService.verifyPhoneOtp(newPhone, otp);
    const updated = await userService.updateProfile({ phone: newPhone, phoneVerificationToken: verificationToken, currentPhoneToken: currentToken });
    notification.success({ title: "Mobile number updated", description: `Your number is now ${newPhone}.` });
    onChanged?.(updated);
    onClose?.();
  });

  const codeInput = (onEnter) => (
    <Input
      value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
      onPressEnter={onEnter}
      placeholder="● ● ● ● ● ●"
      size="large"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus
      aria-label="6-digit code"
      style={{ letterSpacing: 10, fontSize: 22, fontWeight: 800, textAlign: "center" }}
    />
  );
  const primary = { marginTop: 16, background: "#0f766e" };

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Change mobile number" destroyOnHidden centered>
      <Steps
        size="small"
        current={step}
        responsive={false}
        labelPlacement="vertical"
        style={{ marginBottom: 18 }}
        items={[{ title: "Current" }, { title: "New" }, { title: "Verify" }]}
      />

      {step === 0 && (
        <>
          <p style={{ marginTop: 0 }}>
            First, confirm it's you: we'll send a code to your current number <strong>+91 {masked(currentPhone)}</strong>.
          </p>
          {sent ? (
            <>
              <OtpCodeNotice code={shown?.code} smsSent={shown?.smsSent} style={{ marginBottom: 12 }} />
              {codeInput(verifyCurrent)}
              <Button type="primary" block size="large" loading={busy} onClick={verifyCurrent} disabled={otp.length !== 6} style={primary}>
                Verify current number
              </Button>
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <Button type="link" style={{ padding: 0 }} disabled={resendIn > 0 || busy} onClick={sendCurrent}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </Button>
              </div>
            </>
          ) : (
            <Button type="primary" block size="large" loading={busy} onClick={sendCurrent} style={primary}>
              Send OTP to current number
            </Button>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <p style={{ marginTop: 0 }}>Current number verified. Now enter your new mobile number.</p>
          <Input
            prefix={<PhoneOutlined />}
            placeholder="New mobile number"
            size="large"
            inputMode="tel"
            maxLength={16}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onPressEnter={sendNew}
            autoFocus
          />
          <Button type="primary" block size="large" loading={busy} onClick={sendNew} disabled={!phone} style={primary}>
            Send OTP to new number
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ marginTop: 0 }}>
            Enter the 6-digit code sent to <strong>+91 {newPhone}</strong>
          </p>
          <OtpCodeNotice code={shown?.code} smsSent={shown?.smsSent} style={{ marginBottom: 12 }} />
          {codeInput(verifyNewAndSave)}
          <Button type="primary" block size="large" loading={busy} onClick={verifyNewAndSave} disabled={otp.length !== 6} style={primary}>
            Verify & update number
          </Button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <Button type="link" style={{ padding: 0 }} onClick={() => setStep(1)}>
              Change new number
            </Button>
            <Button type="link" style={{ padding: 0 }} disabled={resendIn > 0 || busy} onClick={sendNew}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
