import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, App, Row, Col, Steps } from "antd";
import { MailOutlined, LockOutlined, PhoneOutlined, ArrowLeftOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../services/authService.js";
import BikeSpinner from "../../components/ui/BikeSpinner.jsx";
import AuthShell from "../../components/auth/AuthShell.jsx";
import OtpCodeNotice from "../../components/OtpCodeNotice.jsx";
import { useTranslation } from "react-i18next";
import { LanguageSelect } from "../../components/LanguagePicker.jsx";

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
  const { t, i18n } = useTranslation();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(null); // step-1 values, phone as 10 digits
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null); // shown while OTP_DEV_MODE is on (testing)
  const [smsSent, setSmsSent] = useState(false);
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
      setSmsSent(Boolean(res?.smsSent));
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
      notification.success({ title: t("reg.welcome"), description: t("reg.created") });
      navigate("/", { replace: true });
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
      notification.error({ title: t("reg.verifyTitle") });
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
    <AuthShell>
    <div className="rp-wrap">
      <Card title={t("reg.title")} className="rp-card">
        <Steps
          size="small"
          current={step}
          responsive={false}
          style={{ marginBottom: 24 }}
          items={[{ title: t("reg.stepDetails") }, { title: t("reg.stepVerify") }]}
        />

        {/* Step 1: details. Kept mounted (hidden) so going back keeps what was typed. */}
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <Form form={form} layout="vertical" onFinish={onContinue} requiredMark={false} initialValues={{ language: i18n.language }}>
            <Form.Item name="language" label={t("reg.language")}>
              <LanguageSelect />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="firstName" label={t("reg.firstName")} rules={[{ required: true, message: t("reg.required") }]}>
                  <Input placeholder={t("reg.firstName")} size="large" autoComplete="given-name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lastName" label={t("reg.lastName")} rules={[{ required: true, message: t("reg.required") }]}>
                  <Input placeholder={t("reg.lastName")} size="large" autoComplete="family-name" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="phone"
              label={t("reg.mobile")}
              extra={t("reg.mobileHint")}
              rules={[
                { required: true, message: t("reg.mobileRequired") },
                {
                  validator: (_, v) =>
                    !v || MOBILE_RE.test(cleanPhone(v)) ? Promise.resolve() : Promise.reject(new Error(t("reg.mobileInvalid"))),
                },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="98765 43210" size="large" inputMode="tel" maxLength={16} autoComplete="tel" />
            </Form.Item>
            <Form.Item
              name="email"
              label={t("reg.email")}
              rules={[{ required: true, message: t("reg.emailRequired") }, { type: "email", message: t("reg.emailInvalid") }]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t("reg.password")}
              rules={[{ required: true, message: t("reg.passwordRequired") }, { min: 8, message: t("reg.passwordMin") }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t("reg.passwordMin")} size="large" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={sending || submitting ? { icon: <BikeSpinner /> } : false} style={{ marginTop: 8 }}>
              {t("reg.continue")}
            </Button>
          </Form>
        </div>

        {/* Step 2: OTP */}
        {step === 1 && details && (
          <div>
            <div className="rp-otp-head">
              <SafetyCertificateOutlined className="rp-otp-icon" />
              <h3>{t("reg.verifyTitle")}</h3>
              <div style={{ color: "var(--text-secondary)" }}>
                {t("reg.codeSentTo", { phone: `+91 ${masked(details.phone)}` })}
              </div>
            </div>

            <OtpCodeNotice code={devOtp} smsSent={smsSent} style={{ marginBottom: 12 }} />

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
              loading={submitting ? { icon: <BikeSpinner /> } : false}
              disabled={otp.length !== 6}
              className="rp-verify-btn"
            >
              {t("reg.verifyCreate")}
            </Button>

            <div className="rp-otp-links">
              <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setStep(0)} style={{ padding: 0 }}>
                {t("reg.changeDetails")}
              </Button>
              <Button type="link" onClick={() => sendCode(details.phone)} disabled={resendIn > 0 || sending} loading={sending} style={{ padding: 0 }}>
                {resendIn > 0 ? t("reg.resendIn", { s: resendIn }) : t("reg.resend")}
              </Button>
            </div>
          </div>
        )}

        <div className="rp-foot">
          {t("reg.haveAccount")} <Link to="/login">{t("nav.login")}</Link>
        </div>
      </Card>
      <style>{`
        /* Same card + lime button as the login page */
        .rp-card.ant-card{background:#0A0D12;border-radius:22px;border:0;box-shadow:0 30px 60px -20px rgba(10,13,18,.35);color:#F4F5F1;overflow:hidden}
        .rp-card .ant-card-head{border-bottom:1px dashed rgba(255,255,255,.14);color:#F4F5F1}
        .rp-card .ant-btn-primary{background:#CFFF5C!important;color:#0a0d08!important;border:0;border-radius:12px;height:48px;font-weight:600;box-shadow:none}
        .rp-card .ant-btn-primary:hover:not(:disabled){filter:brightness(1.06)}
        .rp-card .ant-btn-primary:disabled{opacity:.45}
        @media(max-width:920px){
          .rp-card.ant-card{background:rgba(13,17,23,.52);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 60px -18px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08)}
        }
        .rp-wrap{position:relative;width:100%;max-width:400px;padding:12px}
        .rp-foot{text-align:center;margin-top:20px}
        .rp-otp-head{text-align:center;margin-bottom:20px}
        .rp-otp-icon{font-size:40px;color:#2DD4BF}
        .rp-otp-head h3{margin:10px 0 4px}
        .rp-dev-otp{margin-bottom:16px}
        .rp-verify-btn{margin-top:16px}
        .rp-otp-links{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
        /* Phones: everything on one screen, no scrolling. */
        @media(max-width:768px){
          .rp-wrap{padding:0 10px}
          .rp-card .ant-card-head{min-height:44px;padding:0 16px}
          .rp-card .ant-card-head-title{padding:10px 0;font-size:16px}
          .rp-card .ant-card-body{padding:12px 16px 14px}
          .rp-card .ant-steps{margin-bottom:12px!important}
          .rp-card .ant-form-item{margin-bottom:10px}
          .rp-card .ant-form-item-label{padding-bottom:3px}
          .rp-card .ant-form-item-label>label{height:auto;font-size:13px}
          .rp-card .ant-form-item-extra{display:none}
          .rp-card .ant-input-affix-wrapper-lg,.rp-card .ant-input-lg{padding-top:7px;padding-bottom:7px}
          .rp-foot{margin-top:12px}
          .rp-otp-head{margin-bottom:12px}
          .rp-otp-icon{font-size:28px}
          .rp-otp-head h3{margin:6px 0 2px}
          .rp-dev-otp{margin-bottom:12px;padding:6px 10px}
          .rp-verify-btn{margin-top:12px}
          .rp-otp-links{margin-top:8px}
        }
      `}</style>
    </div>
    </AuthShell>
  );
}
