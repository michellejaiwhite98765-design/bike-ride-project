import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, App, Row, Col, Alert } from "antd";
import { MailOutlined, LockOutlined, PhoneOutlined, CheckCircleFilled, EditOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../services/authService.js";

// Indian mobile: 10 digits starting 6-9 (a +91 / 0 prefix and spaces are fine).
const MOBILE_RE = /^(\+?91|0)?[6-9]\d{9}$/;
const cleanPhone = (v) => String(v || "").replace(/[\s-]/g, "");

/**
 * Single sign-up form. The mobile number is mandatory and must be verified
 * with a one-time code before "Sign up" is enabled: Send OTP -> enter the
 * 6-digit code -> Verify. Changing the number after verifying starts over.
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Phone verification state
  const [otpSentTo, setOtpSentTo] = useState(null); // phone the current code was sent to
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null); // test mode only (no SMS provider yet)
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [verified, setVerified] = useState(null); // { phone, token }

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendOtp() {
    try {
      await form.validateFields(["phone"]);
    } catch {
      return;
    }
    const phone = cleanPhone(form.getFieldValue("phone"));
    setSending(true);
    try {
      const res = await authService.sendPhoneOtp(phone);
      setOtpSentTo(phone);
      setOtp("");
      setDevOtp(res?.devOtp || null);
      setResendIn(res?.resendAfterSeconds || 30);
      notification.success({
        title: "OTP sent",
        description: res?.devOtp ? "Test mode: no SMS is sent yet, the code is shown on screen." : `We've sent a 6-digit code to ${phone}.`,
      });
    } catch (err) {
      notification.error({ title: "Couldn't send OTP", description: err.message });
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      notification.error({ title: "Error", description: "Enter the 6-digit code" });
      return;
    }
    setVerifying(true);
    try {
      const res = await authService.verifyPhoneOtp(otpSentTo, otp);
      setVerified({ phone: otpSentTo, token: res.verificationToken });
      setDevOtp(null);
      notification.success({ title: "Verified", description: "Your mobile number is verified." });
    } catch (err) {
      notification.error({ title: "Verification failed", description: err.message });
    } finally {
      setVerifying(false);
    }
  }

  function changeNumber() {
    setVerified(null);
    setOtpSentTo(null);
    setOtp("");
    setDevOtp(null);
  }

  // Editing the number after a code was sent / verified invalidates it.
  function onValuesChange(changed) {
    if ("phone" in changed && (otpSentTo || verified) && cleanPhone(changed.phone) !== (verified?.phone || otpSentTo)) {
      changeNumber();
    }
  }

  async function onFinish(values) {
    if (!verified) {
      notification.error({ title: "Verify your mobile number", description: "Send and enter the OTP to verify your number before signing up." });
      return;
    }
    setSubmitting(true);
    try {
      await register({ ...values, phone: verified.phone, phoneVerificationToken: verified.token });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // A used/expired verification has to be redone.
      if (/verify your mobile/i.test(err.message)) changeNumber();
      notification.error({ title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const codeSent = Boolean(otpSentTo) && !verified;

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 12px" }}>
      <Card title="Create your account">
        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onValuesChange} requiredMark={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="First name" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="Last name" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phone"
            label="Mobile number"
            extra={verified ? null : "We'll send a one-time code to verify it."}
            rules={[
              { required: true, message: "Mobile number is required" },
              { validator: (_, v) => (!v || MOBILE_RE.test(cleanPhone(v)) ? Promise.resolve() : Promise.reject(new Error("Enter a valid 10-digit mobile number"))) },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="98765 43210"
              size="large"
              inputMode="tel"
              maxLength={16}
              disabled={Boolean(verified)}
              suffix={verified ? <CheckCircleFilled style={{ color: "#16a34a" }} aria-label="Verified" /> : null}
              addonAfter={
                verified ? (
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={changeNumber} style={{ padding: 0 }}>
                    Change
                  </Button>
                ) : (
                  <Button type="link" size="small" onClick={sendOtp} loading={sending} disabled={resendIn > 0} style={{ padding: 0 }}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : otpSentTo ? "Resend OTP" : "Send OTP"}
                  </Button>
                )
              }
            />
          </Form.Item>

          {codeSent && (
            <>
              {devOtp && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={`Test mode: your code is ${devOtp}`}
                  description="SMS isn't set up yet, so the code is shown here instead of being texted."
                />
              )}
              <Form.Item label={`Enter the 6-digit code sent to ${otpSentTo}`}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      verifyOtp();
                    }}
                    placeholder="______"
                    size="large"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    style={{ letterSpacing: 6, fontWeight: 700, textAlign: "center" }}
                  />
                  <Button type="primary" size="large" onClick={verifyOtp} loading={verifying} disabled={otp.length !== 6}>
                    Verify
                  </Button>
                </div>
              </Form.Item>
            </>
          )}

          {verified && (
            <div style={{ margin: "-8px 0 16px", color: "#16a34a", fontWeight: 600 }}>
              <CheckCircleFilled /> Mobile number verified
            </div>
          )}

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }, { min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            disabled={!verified}
            style={{ background: verified ? "#0f766e" : undefined, marginTop: 8 }}
          >
            {verified ? "Sign up" : "Verify mobile number to sign up"}
          </Button>
        </Form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </Card>
    </div>
  );
}
