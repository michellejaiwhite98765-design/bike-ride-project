import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";

const INK = "#0A0D12";
const MAP_BG = "#0D1117";
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

  /* Phones: one screen, no scrolling - the animated map fills the screen
     and the sign-in card floats over it as frosted glass. */
  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    background: ${MAP_BG};
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
    grid-area: 1 / 1;
    padding: 18px 20px;
    justify-content: flex-start;
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

  @media (max-width: 920px) {
    top: 11%;
    left: auto;
    right: 8%;
  }
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
    grid-area: 1 / 1;
    position: relative;
    z-index: 10;
    padding: 64px 16px 16px;
    overflow: hidden;
  }
`;

/** Login/Register shell: animated city-map on the left, the page's form on the right. */
export default function AuthShell({ children }) {
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

      <FormSide>{children}</FormSide>
    </Screen>
  );
}
