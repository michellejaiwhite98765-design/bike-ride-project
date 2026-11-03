import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, App, Row, Col, Alert, Steps } from "antd";
import { MailOutlined, LockOutlined, PhoneOutlined, ArrowLeftOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../services/authService.js";

// Indian mobile: 10 digits starting 6-9 (a +91 / 0 prefix and spaces are fine).
const MOBILE_RE = /^(\+?91|0)?[6-9]\d{9}$/;
const cleanPhone = (v) => String(v || "").replace(/[\s-]/g, "");
const tenDigits = (v) => cleanPhone(v).replace(/^(\+?91|0)(?=\d{10}$)/, "");
const masked = (phone) => `${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`;

/**
 * Two-step sign-up.
 *  1. Details: name, mobile (mandatory), email, password -> Continue sends an OTP.
 *  2. Verify: enter the 6-digit code -> "Verify & create account" verifies the
 *     number and creates the account. The account is only created once the
 *     phone is verified (the server enforces this too).
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(null); // step-1 values, phone as 10 digits
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null); // test mode only (no SMS provider)
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  // Kept while the number is unchanged, so fixing e.g. a taken email and
  // trying again doesn't need a new code.
  const [verified, setVerified] = useState(null); // { phone, token }
  const otpInput = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 1) setTimeout(() => otpInput.current?.focus(), 50);
  }, [step]);

  async function sendCode(phone) {
    setSending(true);
    try {
      const res = await authService.sendPhoneOtp(phone);
      setOtp("");
      setDevOtp(res?.devOtp || null);
      setResendIn(res?.resendAfterSeconds || 30);
      return true;
    } catch (err) {
      notification.error({ title: "Couldn't send OTP", description: err.message });
      return false;
    } finally {
      setSending(false);
    }
  }

  // Step 1 -> 2
  async function onContinue(values) {
    const phone = tenDigits(values.phone);
    const next = { ...values, phone };
    setDetails(next);
    // Same number already verified (came back to fix another field): create the account straight away.
    if (verified?.phone === phone) {
      await createAccount(next, verified.token);
      return;
    }
    setVerified(null);
    if (await sendCode(phone)) setStep(1);
  }

  async function createAccount(values, token) {
    setSubmitting(true);
    try {
      await register({ ...values, phoneVerificationToken: token });
      notification.success({ title: "Welcome!", description: "Your account has been created." });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (/verify your mobile/i.test(err.message)) setVerified(null);
      // Details problem (e.g. email already registered): back to step 1 to fix it.
      setStep(0);
      notification.error({ title: "Couldn't create your account", description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // Step 2: verify the code, then create the account.
  async function onVerify() {
    if (!/^\d{6}$/.test(otp)) {
      notification.error({ title: "Error", description: "Enter the 6-digit code" });
      return;
    }
    setSubmitting(true);
    let token;
    try {
      token = (await authService.verifyPhoneOtp(details.phone, otp)).verificationToken;
      setVerified({ phone: details.phone, token });
    } catch (err) {
      setSubmitting(false);
      notification.error({ title: "Verification failed", description: err.message });
      return;
    }
    await createAccount(details, token);
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 12px" }}>
      <Card title="Create your account">
        <Steps
          size="small"
          current={step}
          responsive={false}
          style={{ marginBottom: 24 }}
          items={[{ title: "Your details" }, { title: "Verify mobile" }]}
        />

        {/* Step 1: details. Kept mounted (hidden) so going back keeps what was typed. */}
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <Form form={form} layout="vertical" onFinish={onContinue} requiredMark={false}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="firstName" label="First name" rules={[{ required: true, message: "Required" }]}>
                  <Input placeholder="First name" size="large" autoComplete="given-name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: "Required" }]}>
                  <Input placeholder="Last name" size="large" autoComplete="family-name" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="phone"
              label="Mobile number"
              extra="We'll send a one-time code to verify it."
              rules={[
                { required: true, message: "Mobile number is required" },
                {
                  validator: (_, v) =>
                    !v || MOBILE_RE.test(cleanPhone(v)) ? Promise.resolve() : Promise.reject(new Error("Enter a valid 10-digit mobile number")),
                },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="98765 43210" size="large" inputMode="tel" maxLength={16} autoComplete="tel" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password is required" }, { min: 8, message: "At least 8 characters" }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" size="large" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={sending || submitting} style={{ background: "#0f766e", marginTop: 8 }}>
              Continue
            </Button>
          </Form>
        </div>

        {/* Step 2: OTP */}
        {step === 1 && details && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <SafetyCertificateOutlined style={{ fontSize: 40, color: "#2DD4BF" }} />
              <h3 style={{ margin: "10px 0 4px" }}>Verify your mobile number</h3>
              <div style={{ color: "var(--text-secondary)" }}>
                Enter the 6-digit code sent to <strong>+91 {masked(details.phone)}</strong>
              </div>
            </div>

            {devOtp && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={`Test mode: your code is ${devOtp}`}
                description="SMS isn't set up on this server yet, so the code is shown here instead of being texted."
              />
            )}

            <Input
              ref={otpInput}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onPressEnter={onVerify}
              placeholder="● ● ● ● ● ●"
              size="large"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label="6-digit code"
              style={{ letterSpacing: 10, fontSize: 24, fontWeight: 800, textAlign: "center", height: 56 }}
            />

            <Button
              type="primary"
              block
              size="large"
              onClick={onVerify}
              loading={submitting}
              disabled={otp.length !== 6}
              style={{ marginTop: 16, background: otp.length === 6 ? "#0f766e" : undefined }}
            >
              Verify & create account
            </Button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setStep(0)} style={{ padding: 0 }}>
                Change details
              </Button>
              <Button type="link" onClick={() => sendCode(details.phone)} disabled={resendIn > 0 || sending} loading={sending} style={{ padding: 0 }}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </Button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </Card>
    </div>
  );
}
