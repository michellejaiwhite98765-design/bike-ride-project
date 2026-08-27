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

/* ---------------------------------------------------------------------- */
/* Keyframes                                                              */
/* ---------------------------------------------------------------------- */
const drawMain = keyframes`
  0% { stroke-dashoffset: 900; }
  62% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
`;

const pulseRing = keyframes`
  0% { transform: scale(.4); opacity: .85; }
  100% { transform: scale(3); opacity: 0; }
`;

const ridePath = keyframes`
  0% { offset-distance: 0%; opacity: 0; }
  5% { opacity: 1; }
  62% { offset-distance: 100%; opacity: 1; }
  68% { opacity: 0; }
  100% { offset-distance: 100%; opacity: 0; }
`;

const floaty = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

/* ---------------------------------------------------------------------- */
/* Layout shell                                                           */
/* ---------------------------------------------------------------------- */
const Screen = styled.div`
  display: grid;
  grid-template-columns: 1fr 460px;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    grid-template-rows: 280px auto;
  }
`;

/* ---------------------------------------------------------------------- */
/* LEFT: illustrated live map                                             */
/* ---------------------------------------------------------------------- */
const MapSide = styled.div`
  position: relative;
  background: ${MAP_BG};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 44px;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, ${GRID} 1px, transparent 1px);
    background-size: 26px 26px;
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 25%, rgba(207, 255, 92, 0.12), transparent 45%),
      radial-gradient(circle at 75% 70%, rgba(92, 225, 230, 0.08), transparent 40%);
  }

  @media (max-width: 920px) {
    padding: 24px;
  }
`;

const Brand = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "Space Grotesk", sans-serif;
  font-weight: 600;
  font-size: 19px;
  color: ${ON_DARK};
  text-decoration: none;
`;

const BrandDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${LIME};
  box-shadow: 0 0 0 4px rgba(207, 255, 92, 0.18);
`;

const CityMap = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const Block = styled.rect`
  fill: rgba(255, 255, 255, 0.025);
`;
const Street = styled.path`
  stroke: rgba(255, 255, 255, 0.09);
  stroke-width: 2;
  fill: none;
`;
const StreetMinor = styled(Street)`
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 1;
`;
const RouteGhost = styled.path`
  fill: none;
  stroke: ${ON_DARK_MUTED};
  stroke-width: 1.5;
  stroke-dasharray: 1 8;
  opacity: 0.35;
`;
const RouteMain = styled.path`
  fill: none;
  stroke: ${LIME};
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 900;
  stroke-dashoffset: 900;
  animation: ${drawMain} 4.5s cubic-bezier(0.65, 0, 0.35, 1) infinite;
  filter: drop-shadow(0 0 6px rgba(207, 255, 92, 0.45));
`;
const PinRing = styled.circle`
  fill: ${INK};
  stroke: ${ON_DARK};
  stroke-width: 2;
`;
const PulseRing = styled.circle`
  fill: none;
  stroke: ${LIME};
  stroke-width: 1.6;
  transform-origin: center;
  animation: ${pulseRing} 2.4s ease-out infinite;
`;
const PinCore = styled.circle`
  fill: ${LIME};
`;

const RiderIcon = styled.div`
  position: absolute;
  z-index: 5;
  offset-path: path("M 90 130 C 60 250 340 210 300 340 C 270 430 470 420 500 470");
  animation: ${ridePath} 4.5s cubic-bezier(0.65, 0, 0.35, 1) infinite;
  opacity: 0;
`;
const RiderDot = styled.div`
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: ${LIME};
  box-shadow: 0 0 0 5px rgba(207, 255, 92, 0.22), 0 0 20px rgba(207, 255, 92, 0.6);
`;

const OtherDot = styled.div`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${ON_DARK_MUTED};
  opacity: 0.7;
  top: ${(p) => p.$top};
  left: ${(p) => p.$left};

  @media (max-width: 920px) {
    display: none;
  }
`;

const EtaChip = styled.div`
  position: absolute;
  z-index: 5;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  color: ${INK};
  background: ${LIME};
  padding: 5px 9px;
  border-radius: 6px;
  top: 32%;
  left: 9%;
  animation: ${floaty} 4.5s ease-in-out infinite;
`;

const StatChip = styled.div`
  position: absolute;
  z-index: 5;
  font-family: "IBM Plex Mono", monospace;
  font-size: 10.5px;
  color: ${ON_DARK_MUTED};
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  top: 58%;
  right: 10%;

  @media (max-width: 920px) {
    display: none;
  }
`;

const MapCaption = styled.div`
  position: relative;
  z-index: 5;
  max-width: 380px;

  @media (max-width: 920px) {
    display: none;
  }
`;
const MapH1 = styled.h1`
  font-family: "Space Grotesk", sans-serif;
  font-size: 27px;
  font-weight: 600;
  line-height: 1.25;
  color: ${ON_DARK};
  margin: 0 0 8px;
  letter-spacing: -0.01em;
`;
const MapP = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${ON_DARK_MUTED};
`;

/* ---------------------------------------------------------------------- */
/* RIGHT: ticket login                                                    */
/* ---------------------------------------------------------------------- */
const FormSide = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  /* padding: 40px 28px; */
  overflow-y: auto;

  @media (max-width: 920px) {
    padding: 32px 20px 48px;
  }
`;

const TicketCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 380px;
  background: ${INK};
  border-radius: 22px;
  color: ${ON_DARK};
  box-shadow: 0 30px 60px -20px rgba(10, 13, 18, 0.35);
  overflow: hidden;
`;

const TicketTop = styled.div`
  padding: 26px 28px 0;
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
`;

const TicketSub = styled.p`
  margin: 0 0 20px;
  font-size: 13.5px;
  color: ${ON_DARK_MUTED};
`;

const RouteRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
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
`;

const Perforation = styled.div`
  position: relative;
  height: 0;
  border-top: 1.5px dashed rgba(255, 255, 255, 0.18);
  margin: 16px 0 0;

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
`;

const TicketBottom = styled.div`
  padding: 22px 28px 30px;
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
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  async function onFinish(values) {
    try {
      await login(values);
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <Screen>
      {/* LEFT: illustrated live map */}
      <MapSide>
        <Brand as={Link} to="/">
          <BrandDot />
          BikeRide
        </Brand>

        <CityMap viewBox="0 0 620 620" preserveAspectRatio="xMidYMid slice">
          <Block x="30" y="30" width="120" height="90" />
          <Block x="180" y="30" width="160" height="60" />
          <Block x="380" y="40" width="150" height="100" />
          <Block x="60" y="160" width="90" height="120" />
          <Block x="200" y="150" width="120" height="80" />
          <Block x="360" y="180" width="170" height="90" />
          <Block x="40" y="320" width="140" height="100" />
          <Block x="220" y="300" width="100" height="140" />
          <Block x="360" y="330" width="150" height="110" />
          <Block x="60" y="470" width="150" height="100" />
          <Block x="260" y="470" width="130" height="100" />
          <Block x="420" y="460" width="140" height="110" />

          <Street d="M0,140 H620" />
          <Street d="M0,300 H620" />
          <Street d="M0,450 H620" />
          <Street d="M170,0 V620" />
          <Street d="M350,0 V620" />
          <StreetMinor d="M0,80 H620" />
          <StreetMinor d="M0,220 H620" />
          <StreetMinor d="M0,380 H620" />
          <StreetMinor d="M0,540 H620" />
          <StreetMinor d="M90,0 V620" />
          <StreetMinor d="M260,0 V620" />
          <StreetMinor d="M440,0 V620" />
          <StreetMinor d="M540,0 V620" />

          <RouteGhost d="M90,130 C 40,220 200,260 160,340 C 130,410 340,400 300,470" />
          <RouteMain d="M 90 130 C 60 250 340 210 300 340 C 270 430 470 420 500 470" />

          <g transform="translate(90,130)">
            <PinRing r="7" />
          </g>
          <g transform="translate(500,470)">
            <PulseRing r="7" />
            <PinCore r="7" />
          </g>
        </CityMap>

        <RiderIcon>
          <RiderDot />
        </RiderIcon>
        <OtherDot $top="38%" $left="62%" />
        <OtherDot $top="60%" $left="22%" />
        <OtherDot $top="22%" $left="70%" />

        <EtaChip>ETA 14 MIN</EtaChip>
        <StatChip>6.1 KM · 3 STOPS</StatChip>

        <MapCaption>
          <MapH1>
            Every ride is somebody&apos;s
            <br />
            shorter commute.
          </MapH1>
          <MapP>
            Live matching between riders and drivers heading the same way, with real-time
            tracking from pickup to drop-off.
          </MapP>
        </MapCaption>
      </MapSide>

      {/* RIGHT: ticket login */}
      <FormSide>
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

              <BoardButton type="primary" htmlType="submit">
                Sign in
                <ArrowRightOutlined />
              </BoardButton>
            </Form>

            <Foot>
              New here? <Link to="/register">Create an account</Link>
            </Foot>
          </TicketBottom>
        </TicketCard>
      </FormSide>
    </Screen>
  );
}
