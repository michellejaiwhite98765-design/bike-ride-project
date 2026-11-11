import { useEffect, useState } from "react";
import { App, Avatar, Button, Drawer, Empty, Input, Modal, Rate, Spin } from "antd";
import { StarFilled, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { userService } from "../../services/userService.js";
import { ratingService } from "../../services/ratingService.js";

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ");

/** Average rating of a user, loaded once: { rating, ratingCount } or null while loading. */
export function useUserRating(userId) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    userService.getPublicProfile(userId)
      .then((p) => alive && setSummary({ rating: p.rating, ratingCount: p.ratingCount || 0 }))
      .catch(() => alive && setSummary({ rating: null, ratingCount: 0 }));
    return () => { alive = false; };
  }, [userId]);
  return summary;
}

/** "★ 4.6 (12)" or "New" for a driver with no reviews yet. */
export function ratingLabel(summary) {
  if (!summary) return "";
  return summary.ratingCount ? `★ ${Number(summary.rating).toFixed(1)} (${summary.ratingCount})` : "New driver";
}

/** Bottom sheet with a driver's average rating and the reviews passengers left. */
export function DriverReviewsSheet({ driver, open, onClose, action }) {
  const [reviews, setReviews] = useState(null);
  useEffect(() => {
    if (!open || !driver?.id) return;
    setReviews(null);
    userService.getRatings(driver.id).then(setReviews).catch(() => setReviews([]));
  }, [open, driver?.id]);

  const average = reviews?.length ? reviews.reduce((s, r) => s + r.score, 0) / reviews.length : null;

  return (
    <Drawer open={open} onClose={onClose} placement="bottom" height="auto" title="Driver reviews" zIndex={2000} className="drv-sheet">
      <div className="drv-head">
        <Avatar size={52} src={driver?.profileImage || undefined} icon={<UserOutlined />} style={{ background: "#0f766e" }}>
          {driver?.firstName?.[0]}
        </Avatar>
        <div>
          <div className="drv-name">{fullName(driver) || "Your driver"}</div>
          {reviews && (average != null ? (
            <div className="drv-avg"><StarFilled /> {average.toFixed(1)} <span>· {reviews.length} review{reviews.length === 1 ? "" : "s"}</span></div>
          ) : <div className="drv-avg"><span>No reviews yet</span></div>)}
        </div>
      </div>
      {action}
      {!reviews ? <div style={{ textAlign: "center", padding: 24 }}><Spin /></div> : reviews.length === 0 ? (
        <Empty description="Be the first to review this driver" />
      ) : (
        <div className="drv-list">
          {reviews.map((r) => (
            <div key={r.id} className="drv-review">
              <div className="drv-review-top">
                <strong>{fullName(r.reviewer) || "Passenger"}</strong>
                <span>{dayjs(r.createdAt).format("DD MMM YYYY")}</span>
              </div>
              <Rate disabled value={r.score} style={{ fontSize: 13 }} />
              {r.comment && <p>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
      <style>{`
        .drv-sheet .ant-drawer-body{max-height:70vh;overflow:auto}
        .drv-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .drv-name{font-weight:800;font-size:16px}
        .drv-avg{color:#eab308;font-weight:800}
        .drv-avg span{color:var(--text-secondary);font-weight:600}
        .drv-list{display:flex;flex-direction:column;gap:10px;margin-top:12px}
        .drv-review{padding:10px 12px;border-radius:12px;border:1px solid var(--border-light)}
        .drv-review-top{display:flex;justify-content:space-between;gap:8px}
        .drv-review-top span{color:var(--text-secondary);font-size:12px}
        .drv-review p{margin:4px 0 0;color:var(--text-secondary)}
      `}</style>
    </Drawer>
  );
}

/** The passenger's review of the driver, once dropped off. */
export function RateDriverModal({ booking, open, onClose, onDone }) {
  const { notification } = App.useApp();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const driver = booking?.ride?.rider;

  async function submit() {
    if (!score) {
      notification.error({ title: "Error", description: "Tap the stars to rate your driver" });
      return;
    }
    setBusy(true);
    try {
      await ratingService.create({ bookingId: booking.id, revieweeId: booking.ride.riderId, score, comment: comment.trim() || undefined });
      notification.success({ title: "Thanks!", description: "Your review has been shared." });
      onDone?.();
      onClose();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Rate ${driver?.firstName || "your driver"}`} open={open} onCancel={onClose} onOk={submit} confirmLoading={busy} okText="Submit review" centered>
      <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <Rate value={score} onChange={setScore} style={{ fontSize: 34 }} />
      </div>
      <Input.TextArea rows={3} maxLength={500} placeholder="How was the ride? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{comment.length} / 500</div>
    </Modal>
  );
}
