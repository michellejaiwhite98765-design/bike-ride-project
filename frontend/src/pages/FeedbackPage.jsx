import { useEffect, useState } from "react";
import { App, Button, Empty, Input, Rate, Tag } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { feedbackService, FEEDBACK_CATEGORIES, FEEDBACK_STATUS } from "../services/feedbackService.js";
import BrandLoader from "../components/ui/BrandLoader.jsx";

/** Customer feedback about the app or service: send one, and follow the replies. */
export default function FeedbackPage() {
  const { notification } = App.useApp();
  const [items, setItems] = useState(null);
  const [category, setCategory] = useState(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => feedbackService.listMine().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!category) {
      notification.error({ title: "Error", description: "Pick what your feedback is about" });
      return;
    }
    if (message.trim().length < 5) {
      notification.error({ title: "Error", description: "Please write at least a few words" });
      return;
    }
    setBusy(true);
    try {
      await feedbackService.create({ category, rating: rating || undefined, message: message.trim() });
      notification.success({ title: "Thanks!", description: "We've received your feedback and will get back to you." });
      setCategory(null);
      setRating(0);
      setMessage("");
      load();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fb-page">
      <h2><MessageOutlined /> Feedback</h2>
      <div className="fb-card">
        <div className="fb-label">What is it about?</div>
        <div className="fb-chips">
          {FEEDBACK_CATEGORIES.map((c) => (
            <button type="button" key={c.value} className={`fb-chip${category === c.value ? " is-on" : ""}`} onClick={() => setCategory(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="fb-label">How would you rate your experience? <span>(optional)</span></div>
        <Rate value={rating} onChange={setRating} style={{ fontSize: 26 }} />
        <div className="fb-label">Your message</div>
        <Input.TextArea rows={4} maxLength={2000} showCount value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what went well or what we can improve" />
        <Button type="primary" block size="large" loading={busy} onClick={submit} style={{ marginTop: 14 }}>Send feedback</Button>
      </div>

      <h3>Your feedback</h3>
      {!items ? <BrandLoader label="Loading feedback…" /> : items.length === 0 ? (
        <Empty description="You haven't sent any feedback yet" />
      ) : items.map((f) => {
        const status = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.OPEN;
        return (
          <div key={f.id} className="fb-item">
            <div className="fb-item-top">
              <Tag>{FEEDBACK_CATEGORIES.find((c) => c.value === f.category)?.label || f.category}</Tag>
              <Tag color={status.color}>{status.label}</Tag>
              <span className="fb-date">{dayjs(f.createdAt).format("DD MMM YYYY")}</span>
            </div>
            {f.rating ? <Rate disabled value={f.rating} style={{ fontSize: 13 }} /> : null}
            <p className="fb-msg">{f.message}</p>
            {f.adminReply && (
              <div className="fb-reply">
                <strong>Reply from Liftshare</strong>
                {f.repliedAt && <span className="fb-date"> · {dayjs(f.repliedAt).format("DD MMM, h:mm A")}</span>}
                <p>{f.adminReply}</p>
              </div>
            )}
          </div>
        );
      })}
      <style>{`
        .fb-page{max-width:640px;margin:0 auto;padding-bottom:32px}
        .fb-page h2{display:flex;gap:8px;align-items:center}
        .fb-card{padding:16px;border-radius:16px;border:1px solid var(--chrome-border);background:var(--bg-secondary);margin-bottom:22px}
        .fb-label{font-weight:700;margin:12px 0 8px}.fb-label:first-child{margin-top:0}
        .fb-label span{color:var(--text-secondary);font-weight:500}
        .fb-chips{display:flex;flex-wrap:wrap;gap:8px}
        .fb-chip{padding:7px 14px;border-radius:999px;border:1px solid var(--chrome-border);background:transparent;color:var(--text-primary);font-weight:600;cursor:pointer}
        .fb-chip.is-on{background:#2DD4BF;border-color:#2DD4BF;color:#06201d}
        .fb-item{padding:12px 14px;border-radius:14px;border:1px solid var(--border-light);margin-bottom:10px}
        .fb-item-top{display:flex;align-items:center;gap:4px;margin-bottom:4px}
        .fb-date{color:var(--text-secondary);font-size:12px;margin-left:auto}
        .fb-reply .fb-date{margin-left:0}
        .fb-msg{margin:6px 0 0;white-space:pre-wrap}
        .fb-reply{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(45,212,191,.1);border-left:3px solid #2DD4BF}
        .fb-reply p{margin:4px 0 0;white-space:pre-wrap}
      `}</style>
    </div>
  );
}
