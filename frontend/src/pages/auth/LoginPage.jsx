import { useForceDark } from "../../context/ThemeContext.jsx";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Form, Input, Button, App } from "antd";
import { MobileOutlined, ArrowRightOutlined, ArrowLeftOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";
import OtpCodeNotice from "../../components/OtpCodeNotice.jsx";
import styled, { css, keyframes } from "styled-components";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../services/authService.js";

/* ---------------------------------------------------------------------- */
/* Design tokens (scoped to this page only)                               */
/* ---------------------------------------------------------------------- */
const INK = "#0A0D12";
const MAP_BG = "#0D1117";
const PAPER = "#F3F1EA";
const LIME = "#CFFF5C";
const ON_DARK = "#F4F5F1";
const ON_DARK_MUTED = "#8B93A0";
const GRID = "rgba(255,255,255,0.06)";

import AuthShell from "../../components/auth/AuthShell.jsx";


const TicketCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 380px;
  background: ${INK};
  border-radius: 22px;
  color: ${ON_DARK};
  box-shadow: 0 30px 60px -20px rgba(10, 13, 18, 0.35);
  overflow: hidden;

  /* Frosted glass over the full-screen map on phones. */
  @media (max-width: 920px) {
    background: rgba(13, 17, 23, 0.52);
    backdrop-filter: blur(18px) saturate(150%);
    -webkit-backdrop-filter: blur(18px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
`;

const TicketTop = styled.div`
  padding: 26px 28px 0;

  @media (max-width: 920px) {
    padding: 18px 20px 0;
  }
`;

const Eyebrow = styled.span`
  font-family: "IBM Plex Mono", monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${ON_DARK_MUTED};
  display: block;
  margin-bottom: 10px;
`;

const TicketH2 = styled.h2`
  font-family: "Space Grotesk", sans-serif;
  font-size: 25px;
  font-weight: 600;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
  color: ${ON_DARK};

  @media (max-width: 920px) {
    font-size: 22px;
    margin: 0 0 2px;
  }
`;

const TicketSub = styled.p`
  margin: 0 0 20px;
  font-size: 13.5px;
  color: ${ON_DARK_MUTED};

  @media (max-width: 920px) {
    margin: 0 0 12px;
  }
`;

const RouteRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;

  @media (max-width: 920px) and (max-height: 760px) {
    display: none;
  }
`;
const Stop = styled.span`
  font-family: "Space Grotesk", sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: ${(p) => (p.$dim ? ON_DARK_MUTED : ON_DARK)};
`;
const RouteLineFlat = styled.span`
  flex: 1;
  position: relative;
  height: 1px;
  background-image: linear-gradient(to right, #4b5563 0 6px, transparent 6px 12px);
  background-size: 12px 1px;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  &::before {
    left: 0;
    background: ${LIME};
  }
  &::after {
    right: 0;
    background: transparent;
    border: 1.5px solid ${ON_DARK_MUTED};
  }
`;
const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: "IBM Plex Mono", monospace;
  font-size: 10.5px;
  color: ${ON_DARK_MUTED};
  margin-bottom: 4px;

  @media (max-width: 920px) and (max-height: 760px) {
    display: none;
  }
`;

const Perforation = styled.div`
  position: relative;
  height: 0;
  border-top: 1.5px dashed rgba(255, 255, 255, 0.18);
  margin: 16px 0 0;

  @media (max-width: 920px) {
    margin: 4px 0 0;
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: -11px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${PAPER};
  }
  &::before {
    left: -30px;
  }
  &::after {
    right: -30px;
  }

  @media (max-width: 920px) {
    &::before,
    &::after {
      display: none;
    }
  }
`;

const TicketBottom = styled.div`
  padding: 22px 28px 30px;

  @media (max-width: 920px) {
    padding: 16px 20px 18px;
  }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  color: ${ON_DARK_MUTED};
  margin-bottom: 6px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-family: "IBM Plex Mono", monospace;
`;

const ticketInputCss = css`
  &.ant-input-affix-wrapper,
  &.ant-input-affix-wrapper-borderless,
  &.ant-input,
  &.ant-input-borderless {
    background: transparent !important;
    border: 0 !important;
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 2px 9px !important;
    transition: border-color 0.15s ease;
  }
  &.ant-input-affix-wrapper-focused,
  &.ant-input-affix-wrapper:focus-within,
  &.ant-input:focus {
    border-color: ${LIME} !important;
  }
  input.ant-input {
    background: transparent !important;
  }
  input,
  input.ant-input {
    color: ${ON_DARK} !important;
    font-size: 14.5px;
    height: 22px;
  }
  input::placeholder {
    color: #565d68;
  }
  .anticon {
    color: ${ON_DARK};
    opacity: 0.55;
  }
`;

const StyledInput = styled(Input)`
  ${ticketInputCss}
`;
const StyledPassword = styled(Input.Password)`
  ${ticketInputCss}
`;

const StyledFormItem = styled(Form.Item)`
  margin-bottom: 15px;

  @media (max-width: 920px) {
    margin-bottom: 10px;
  }

  .ant-form-item-explain-error {
    font-size: 11px;
    margin-top: 5px;
    color: #ff8b8b;
  }
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 20px;
  font-size: 12px;
  color: ${ON_DARK_MUTED};

  @media (max-width: 920px) {
    margin: 8px 0 14px;
  }

  a {
    color: ${ON_DARK_MUTED};
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

const BoardButton = styled(Button)`
  &.ant-btn {
    width: 100%;
    height: 48px;
    border-radius: 12px;
    border: 0;
    background: ${LIME};
    color: #0a0d08;
    font-weight: 600;
    font-size: 14.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: "Inter", sans-serif;
    box-shadow: none;
  }
  &.ant-btn:hover,
  &.ant-btn:focus {
    background: ${LIME} !important;
    filter: brightness(1.06);
    color: #0a0d08 !important;
  }
  &.ant-btn:active {
    transform: scale(0.98);
  }
`;

const Foot = styled.div`
  text-align: center;
  margin-top: 18px;

  @media (max-width: 920px) {
    margin-top: 12px;
  }

  font-size: 12.5px;
  color: ${ON_DARK_MUTED};

  a {
    color: ${ON_DARK};
    font-weight: 600;
    text-decoration: none;
  }
`;

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */
export default function LoginPage() {
  useForceDark(); // these screens are designed dark-only
  const { t, i18n } = useTranslation();
  const { loginWithOtp, register } = useAuth();
  const [detailsForm] = Form.useForm();
  // New number: verified by OTP, now just their details (no mobile, no password).
  const [signup, setSignup] = useState(null); // { phone, phoneVerificationToken }
  const [creating, setCreating] = useState(false);
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  // Passwordless: step 0 = mobile number, step 1 = the code sent to it.
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null); // shown while OTP_DEV_MODE is on (testing)
  const [smsSent, setSmsSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpInput = useRef(null);
  const [otpError, setOtpError] = useState(""); // shown under the code box

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(number) {
    setSending(true);
    try {
      const res = await authService.sendLoginOtp(number);
      setPhone(number);
      setDevOtp(res?.devOtp || null);
      setSmsSent(Boolean(res?.smsSent));
      setResendIn(res?.resendAfterSeconds || 30);
      setOtp("");
      setOtpError("");
      setStep(1);
      setTimeout(() => otpInput.current?.focus(), 50);
    } catch (err) {
      // "No account with this number" shows under the field.
      if (err.errors?.field === "phone" || err.status === 404) form.setFields([{ name: "phone", errors: [err.message] }]);
      else notification.error({ title: t("login.error"), description: err.message });
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    setOtpError("");
    setVerifying(true);
    try {
      const result = await loginWithOtp(phone, otp);
      if (result?.isNewUser) {
        setSignup({ phone: result.phone, phoneVerificationToken: result.phoneVerificationToken });
        setStep(2);
        return;
      }
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      // Wrong / expired code: say so right under the box, and clear it for a fresh try.
      setOtpError(err.message || "Incorrect code. Please try again");
      setOtp("");
      setTimeout(() => otpInput.current?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  }

  async function createAccount(values) {
    setCreating(true);
    try {
      await register({ ...values, phone: signup.phone, phoneVerificationToken: signup.phoneVerificationToken, language: i18n.language });
      navigate("/", { replace: true });
    } catch (err) {
      if (/email/i.test(err.message)) detailsForm.setFields([{ name: "email", errors: [err.message] }]);
      else notification.error({ title: t("login.error"), description: err.message });
    } finally {
      setCreating(false);
    }
  }

  return (
    <AuthShell>

      {/* RIGHT: ticket login */}
        <TicketCard>
          <TicketTop>
            <Eyebrow>{step === 2 ? "Almost there" : t("login.welcomeBack")}</Eyebrow>
            <TicketH2>{t("login.title")}</TicketH2>
            <TicketSub>{t("login.sub")}</TicketSub>

            <RouteRow>
              <Stop>{t("nav.home")}</Stop>
              <RouteLineFlat />
              <Stop $dim>?</Stop>
            </RouteRow>
            <MetaRow>
              <span>DEPART · NOW</span>
              <span>SEATS · —</span>
            </MetaRow>
          </TicketTop>

          <Perforation />

          <TicketBottom>
            {step === 0 ? (
              <Form form={form} layout="vertical" onFinish={(v) => sendCode(v.phone)} requiredMark={false}>
                <div>
                  <FieldLabel htmlFor="login_phone">Mobile number</FieldLabel>
                  <StyledFormItem
                    name="phone"
                    rules={[
                      { required: true, message: "Enter your mobile number" },
                      {
                        // Spaces, dashes, +91 or a leading 0 are fine: "98765 43210", "+91-9876543210".
                        validator: (_, v) =>
                          !v || /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, "").replace(/^(91)?0?(\d{10})$/, "$2"))
                            ? Promise.resolve()
                            : Promise.reject(new Error("Enter a valid 10-digit mobile number")),
                      },
                    ]}
                  >
                    <StyledInput
                      id="login_phone"
                      variant="borderless"
                      prefix={<><MobileOutlined /> <span style={{ opacity: 0.7 }}>+91</span></>}
                      placeholder="98765 43210"
                      inputMode="tel"
                      autoComplete="tel-national"
                      maxLength={14}
                    />
                  </StyledFormItem>
                </div>

                <BoardButton type="primary" htmlType="submit" loading={sending}>
                  {sending ? "Sending code…" : "Send OTP"}
                  {!sending && <ArrowRightOutlined />}
                </BoardButton>
              </Form>
            ) : step === 2 ? (
              <Form form={detailsForm} layout="vertical" onFinish={createAccount} requiredMark={false}>
                <FieldLabel as="div" style={{ marginBottom: 10 }}>Number verified ✓ - just a few details to finish</FieldLabel>
                <div>
                  <FieldLabel htmlFor="su_first">First name</FieldLabel>
                  <StyledFormItem name="firstName" rules={[{ required: true, whitespace: true, message: "Enter your first name" }]}>
                    <StyledInput id="su_first" variant="borderless" prefix={<UserOutlined />} placeholder="First name" autoComplete="given-name" maxLength={50} />
                  </StyledFormItem>
                </div>
                <div>
                  <FieldLabel htmlFor="su_last">Last name</FieldLabel>
                  <StyledFormItem name="lastName" rules={[{ required: true, whitespace: true, message: "Enter your last name" }]}>
                    <StyledInput id="su_last" variant="borderless" prefix={<UserOutlined />} placeholder="Last name" autoComplete="family-name" maxLength={50} />
                  </StyledFormItem>
                </div>
                <div>
                  <FieldLabel htmlFor="su_email">Email</FieldLabel>
                  <StyledFormItem name="email" rules={[{ required: true, message: t("reg.emailRequired") }, { type: "email", message: t("reg.emailInvalid") }]}>
                    <StyledInput id="su_email" variant="borderless" prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" inputMode="email" />
                  </StyledFormItem>
                </div>
                <BoardButton type="primary" htmlType="submit" loading={creating}>
                  {creating ? "Creating account…" : "Continue"}
                  {!creating && <ArrowRightOutlined />}
                </BoardButton>
              </Form>
            ) : (
              <div>
                <FieldLabel htmlFor="login_otp">Enter the code sent to +91 {phone.replace(/\D/g, "").slice(-10).replace(/^(\d{2})\d{5}/, "$1•••••")}</FieldLabel>
                <OtpCodeNotice code={devOtp} smsSent={smsSent} style={{ marginBottom: 12 }} />
                <Input
                  id="login_otp"
                  ref={otpInput}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (otpError) setOtpError("");
                  }}
                  onPressEnter={verify}
                  status={otpError ? "error" : undefined}
                  aria-invalid={Boolean(otpError)}
                  aria-describedby={otpError ? "login_otp_error" : undefined}
                  placeholder="● ● ● ● ● ●"
                  size="large"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-label="6-digit code"
                  style={{ letterSpacing: 10, fontSize: 24, fontWeight: 800, textAlign: "center", height: 56, marginBottom: otpError ? 6 : 14 }}
                />
                {otpError && (
                  <div id="login_otp_error" role="alert" style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
                    {otpError}
                  </div>
                )}
                <BoardButton type="primary" onClick={verify} loading={verifying} disabled={otp.length !== 6}>
                  {verifying ? t("login.signingIn") : "Verify & sign in"}
                  {!verifying && <ArrowRightOutlined />}
                </BoardButton>
                <Row style={{ marginTop: 12 }}>
                  <a onClick={() => { setStep(0); setOtp(""); }} role="button" tabIndex={0}><ArrowLeftOutlined /> Change number</a>
                  {resendIn > 0 ? (
                    <span>Resend in {resendIn}s</span>
                  ) : (
                    <a onClick={() => !sending && sendCode(phone)} role="button" tabIndex={0}>Resend code</a>
                  )}
                </Row>
              </div>
            )}

            <Foot>New here? Enter your number - we'll set up your account after the OTP.</Foot>
          </TicketBottom>
        </TicketCard>
    </AuthShell>
  );
}
