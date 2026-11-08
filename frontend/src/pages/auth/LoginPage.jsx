import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Form, Input, Button, App } from "antd";
import { MailOutlined, LockOutlined, ArrowRightOutlined } from "@ant-design/icons";
import styled, { css, keyframes } from "styled-components";
import { useAuth } from "../../context/AuthContext.jsx";

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
  const { login } = useAuth();
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(values) {
    setSubmitting(true);
    try {
      await login(values);
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Wrong email / wrong password show under their own field.
      const field = err.errors?.field;
      if (field === "email" || field === "password") {
        form.setFields([{ name: field, errors: [err.message] }]);
      } else {
        notification.error({ title: "Error", description: err.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>

      {/* RIGHT: ticket login */}
        <TicketCard>
          <TicketTop>
            <Eyebrow>Welcome back</Eyebrow>
            <TicketH2>Sign in to BikeRide</TicketH2>
            <TicketSub>Enter your details to find or offer a ride.</TicketSub>

            <RouteRow>
              <Stop>Home</Stop>
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
            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
              <div>
                <FieldLabel htmlFor="login_email">Email</FieldLabel>
                <StyledFormItem
                  name="email"
                  rules={[
                    { required: true, message: "Email is required" },
                    { type: "email", message: "Enter a valid email" },
                  ]}
                >
                  <StyledInput
                    id="login_email"
                    variant="borderless"
                    prefix={<MailOutlined />}
                    placeholder="you@example.com"
                  />
                </StyledFormItem>
              </div>

              <div>
                <FieldLabel htmlFor="login_password">Password</FieldLabel>
                <StyledFormItem
                  name="password"
                  rules={[{ required: true, message: "Password is required" }]}
                >
                  <StyledPassword
                    id="login_password"
                    variant="borderless"
                    prefix={<LockOutlined />}
                    placeholder="••••••••"
                  />
                </StyledFormItem>
              </div>

              <Row>
                <span>Keep me signed in</span>
                <Link to="/forgot-password">Forgot password?</Link>
              </Row>

              <BoardButton type="primary" htmlType="submit" loading={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && <ArrowRightOutlined />}
              </BoardButton>
            </Form>

            <Foot>
              New here? <Link to="/register">Create an account</Link>
            </Foot>
          </TicketBottom>
        </TicketCard>
    </AuthShell>
  );
}
