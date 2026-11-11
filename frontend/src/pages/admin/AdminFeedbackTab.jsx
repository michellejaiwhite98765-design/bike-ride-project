import { useEffect, useState } from "react";
import { App, Button, Empty, Input, Modal, Rate, Select, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { feedbackService, FEEDBACK_CATEGORIES, FEEDBACK_STATUS } from "../../services/feedbackService.js";

const categoryLabel = (v) => FEEDBACK_CATEGORIES.find((c) => c.value === v)?.label || v;

/** Admin: customer feedback, newest unresolved first; set status or reply (the customer is notified). */
export default function AdminFeedbackTab({ onCount }) {
  const { notification } = App.useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await feedbackService.listAll();
      setItems(list);
      onCount?.(list.filter((f) => f.status !== "RESOLVED").length);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(id, payload) {
    setBusy(true);
    try {
      await feedbackService.update(id, payload);
      notification.success({ title: "Success", description: payload.adminReply ? "Reply sent to the customer" : "Feedback updated" });
      setReplying(null);
      load();
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {loading && items.length === 0 ? <Spin style={{ display: "block", margin: 24 }} /> : items.length === 0 ? <Empty description="No feedback yet" /> : (
        <div className="afb-list">
          {items.map((f) => (
            <div key={f.id} className={`afb-card${f.status === "RESOLVED" ? " is-done" : ""}`}>
              <div className="afb-top">
                <strong>{f.user?.firstName} {f.user?.lastName}</strong>
                <span className="afb-meta">{f.user?.email} · {dayjs(f.createdAt).format("DD MMM YYYY, h:mm A")}</span>
              </div>
              <div className="afb-tags">
                <Tag>{categoryLabel(f.category)}</Tag>
                {f.rating ? <Rate disabled value={f.rating} style={{ fontSize: 12 }} /> : null}
              </div>
              <p className="afb-msg">{f.message}</p>
              {f.adminReply && <div className="afb-reply"><b>Your reply:</b> {f.adminReply}</div>}
              <div className="afb-actions">
                <Select size="small" value={f.status} style={{ width: 130 }} onChange={(status) => save(f.id, { status })}
                  options={Object.entries(FEEDBACK_STATUS).map(([value, st]) => ({ value, label: st.label }))} />
                <Button size="small" type={f.adminReply ? "default" : "primary"} onClick={() => { setReplying(f); setReply(f.adminReply || ""); }}>
                  {f.adminReply ? "Edit reply" : "Reply"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .afb-list{display:flex;flex-direction:column;gap:10px;max-width:760px}
        .afb-card{padding:12px 14px;border-radius:14px;border:1px solid var(--chrome-border);background:var(--bg-secondary)}
        .afb-card.is-done{opacity:.6}
        .afb-top{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
        .afb-meta{color:var(--text-secondary);font-size:12px;overflow-wrap:anywhere}
        .afb-tags{display:flex;align-items:center;gap:6px;margin-top:6px}
        .afb-msg{margin:8px 0 0;white-space:pre-wrap}
        .afb-reply{margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(45,212,191,.1);border-left:3px solid #2DD4BF;white-space:pre-wrap;font-size:13px}
        .afb-actions{display:flex;gap:8px;margin-top:10px}
      `}</style>
      <Modal
        title={`Reply to ${replying?.user?.firstName || "customer"}`}
        open={Boolean(replying)}
        onCancel={() => setReplying(null)}
        okText="Send reply"
        confirmLoading={busy}
        okButtonProps={{ disabled: !reply.trim() }}
        onOk={() => save(replying.id, { adminReply: reply.trim() })}
      >
        <p style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{replying?.message}</p>
        <Input.TextArea rows={4} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Your reply - the customer gets a notification" />
      </Modal>
    </>
  );
}
