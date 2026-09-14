import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import UpcomingRideBanner from "./UpcomingRideBanner.jsx";

const SIDE_OFFSET_PX = 118;
const SIDE_OFFSET_PX_WIDE = 190;
const SIDE_ROTATE_DEG = 30;
const SIDE_SCALE_STEP = 0.18;
const MIN_SCALE = 0.6;
const HOVER_SCALE_BOOST = 1.06;
const MAX_VISIBLE_OFFSET = 3;
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 400;
// 812 covers real phones (incl. 375x812) and anything narrower; above it,
// sizing/behavior is untouched from the original wider-screen design.
const COMPACT_BREAKPOINT = 812;

function useIsCompactViewport() {
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= COMPACT_BREAKPOINT
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT}px)`);
    const handler = (event) => setIsCompact(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isCompact;
}

/**
 * Renders one full-width card when there's a single upcoming ride, or a
 * coverflow-style carousel when the user has several: the focused ride sits
 * front-and-center at full size, the rest fan out into a curved shelf behind
 * it (classic CoverFlow - translateX + rotateY + scale per offset from the
 * active index, computed in JS since CSS abs()/calc() support is spotty).
 * Clicking a side cover brings it to the front; the front card always shows
 * full detail immediately (click navigates, hover reveals the button) - on
 * every viewport, phones included. The whole stage is also swipeable
 * (framer-motion drag) - dragging left/right past a distance/velocity
 * threshold moves to the next/previous ride.
 *
 * The active card stays in normal flow (no absolute positioning), so the
 * stage's height always exactly matches its real content height - no fixed
 * height guess, no dead space below it before the next section starts.
 * Only the side "covers" are pulled out with position:absolute, layered on
 * top of it, and stay as small identify-at-a-glance covers regardless of
 * viewport - that's the coverflow shelf, not something that needs opening.
 */
export default function UpcomingRidesCarousel({ rides }) {
  const isCompactViewport = useIsCompactViewport();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (rides.length === 0) return null;

  function selectIndex(index) {
    setActiveIndex(Math.max(0, Math.min(rides.length - 1, index)));
  }

  function browseToIndex(index) {
    setActiveIndex(Math.max(0, Math.min(rides.length - 1, index)));
  }

  function handleDragEnd(_event, info) {
    if (info.offset.x <= -SWIPE_DISTANCE_THRESHOLD || info.velocity.x <= -SWIPE_VELOCITY_THRESHOLD) {
      browseToIndex(activeIndex + 1);
    } else if (info.offset.x >= SWIPE_DISTANCE_THRESHOLD || info.velocity.x >= SWIPE_VELOCITY_THRESHOLD) {
      browseToIndex(activeIndex - 1);
    }
  }

  if (rides.length === 1) {
    return (
      <div className="urc-single">
        <UpcomingRideBanner ride={rides[0]} />
        <style>{`
          .urc-single{display:flex;justify-content:center}
          .urc-single>*{width:min(460px,92vw)}
        `}</style>
      </div>
    );
  }

  return (
    <motion.div
      className="urc-stage"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
      onDragEnd={handleDragEnd}
    >
      {rides.map((ride, index) => {
        const offset = index - activeIndex;
        const abs = Math.abs(offset);
        const isActive = offset === 0;
        const visible = abs <= MAX_VISIBLE_OFFSET;
        const hoverBoost = !isActive && index === hoveredIndex ? HOVER_SCALE_BOOST : 1;
        const scale = Math.max(MIN_SCALE, 1 - abs * SIDE_SCALE_STEP) * hoverBoost;

        if (isActive) {
          return (
            <div key={ride.linkTo} className="urc-slide is-active">
              <UpcomingRideBanner ride={ride} />
            </div>
          );
        }

        const sideOffsetPx = isCompactViewport ? SIDE_OFFSET_PX : SIDE_OFFSET_PX_WIDE;
        const transform = [
          "translateX(-50%)",
          `translateX(${offset * sideOffsetPx}px)`,
          `translateY(${abs * 10}px)`,
          `rotateY(${offset * -SIDE_ROTATE_DEG}deg)`,
          `scale(${scale})`,
        ].join(" ");

        return (
          <div
            key={ride.linkTo}
            className={`urc-slide urc-slide-side${isCompactViewport ? " is-compact" : ""}`}
            style={{
              transform,
              zIndex: 20 - abs,
              opacity: visible ? Math.max(0, 1 - abs * 0.3) : 0,
              pointerEvents: visible ? "auto" : "none",
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <UpcomingRideBanner ride={ride} compact onActivate={() => selectIndex(index)} />
          </div>
        );
      })}

      <div className="urc-dots">
        {rides.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`urc-dot${index === activeIndex ? " is-active" : ""}`}
            aria-label={`Show ride ${index + 1}`}
            onClick={() => selectIndex(index)}
          />
        ))}
      </div>

      <style>{`
        /* isolation + contain keep this 3D/perspective block in its own
           compositing layer so it can't interact with the sticky header's
           layer above it (that cross-layer interference is what caused the
           header to visibly jitter when this carousel sat close beneath it). */
        .urc-stage{position:relative;padding-bottom:38px;perspective:1200px;isolation:isolate;contain:layout paint;display:flex;justify-content:center;touch-action:pan-y}
        .urc-slide.is-active{position:relative;z-index:25;width:min(460px,92vw)}
        .urc-slide-side{position:absolute;top:0;left:50%;width:min(420px,88vw);cursor:pointer;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform .4s cubic-bezier(.22,1,.36,1),opacity .55s ease}
        .urc-slide-side.is-compact{width:min(270px,82vw)}

        .urc-dots{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px;z-index:30}
        .urc-dot{width:6px;height:6px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.18);cursor:pointer;transition:background .25s ease,transform .25s ease}
        .urc-dot.is-active{background:#D4A24C;transform:scale(1.3)}
      `}</style>
    </motion.div>
  );
}
