import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, Form, Input, Upload, Button, App, Alert, Tag, DatePicker } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { userService } from "../services/userService.js";
import { useAuth } from "../context/AuthContext.jsx";
import BrandLoader from "../components/ui/BrandLoader.jsx";

const STATUS = {
  VERIFIED: { color: "green", label: "Verified" },
  REJECTED: { color: "red", label: "Not verified" },
  EXPIRED: { color: "orange", label: "Expired" },
  NOT_SUBMITTED: { color: "default", label: "Not added" },
};

/**
 * Driving licence verification. The licence number must appear on the
 * uploaded photo/PDF (the server reads it); a match verifies it at once.
 * Needed (with a verified vehicle) before creating a trip.
 * ?next=/rides/create returns there once verified.
 */
export default function LicencePage() {
  const { user } = useAuth();
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [form] = Form.useForm();
  const [licence, setLicence] = useState(null);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    userService
      .getLicence()
      .then((l) => {
        setLicence(l);
        setEditing(l.status !== "VERIFIED");
        form.setFieldsValue({
          licenceNumber: l.licenceNumber,
          holderName: l.holderName || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
          expiryDate: l.expiryDate || undefined,
          dateOfBirth: l.dateOfBirth || undefined,
        });
      })
      .catch(() => setLicence({ status: "NOT_SUBMITTED" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, user?.id]);

  async function onSubmit(values) {
    if (!file) {
      notification.error({ title: "Upload your licence", description: "Add a clear photo or PDF of the front of your driving licence." });
      return;
    }
    setSubmitting(true);
    try {
      const saved = await userService.submitLicence({
        licenceNumber: values.licenceNumber,
        holderName: values.holderName,
        expiryDate: values.expiryDate,
        dateOfBirth: values.dateOfBirth,
        file,
      });
      setLicence(saved);
      setEditing(false);
      setFile(null);
      notification.success({ title: "Driving licence verified", description: "You can now create trips once your vehicle is verified." });
      if (next) navigate(next);
    } catch (err) {
      notification.error({ title: "Licence not verified", description: err.message });
      userService.getLicence().then(setLicence).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  if (!licence) return <BrandLoader label="Loading your licence…" />;
  const tag = STATUS[licence.status] || STATUS.NOT_SUBMITTED;

  return (
    <div className="dl-wrap">
      <Link to={next || "/profile"} className="dl-back">
        <ArrowLeftOutlined /> Back
      </Link>
      <Card
        className="dl-card"
        title={
          <span className="dl-title">
            <IdcardOutlined /> Driving licence
          </span>
        }
        extra={<Tag color={tag.color}>{tag.label}</Tag>}
      >
        <p className="dl-intro">
          To offer trips you need a verified driving licence and a verified vehicle. Passengers don't need this.
        </p>

        {licence.status === "VERIFIED" && !editing && (
          <div className="dl-verified">
            <CheckCircleFilled className="dl-ok" />
            <div>
              <strong>{licence.licenceNumber}</strong>
              <div>
                {licence.holderName ? `${licence.holderName} · ` : ""}valid till {dayjs(licence.expiryDate).format("DD MMM YYYY")}
              </div>
            </div>
            <Button onClick={() => setEditing(true)}>Update</Button>
          </div>
        )}

        {licence.status === "EXPIRED" && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} title="Your licence has expired. Upload your renewed licence to keep creating trips." />
        )}
        {licence.status === "REJECTED" && licence.failureReason && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} title={licence.failureReason} />
        )}

        {/* Always mounted (hidden when not editing) so "Update" opens it prefilled. */}
        <div style={{ display: editing ? "block" : "none" }}>
          <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
            <Form.Item
              name="licenceNumber"
              label="Licence number"
              rules={[
                { required: true, message: "Enter your licence number" },
                {
                  validator: (_, v) =>
                    !v || /^[A-Z]{2}[0-9A-Z]{2}[0-9]{7,12}$/.test(String(v).replace(/[\s-]/g, "").toUpperCase())
                      ? Promise.resolve()
                      : Promise.reject(new Error("Enter it as printed, e.g. TN01 20190012345")),
                },
              ]}
            >
              <Input size="large" placeholder="TN01 20190012345" style={{ textTransform: "uppercase" }} autoComplete="off" />
            </Form.Item>
            <Form.Item name="holderName" label="Name on licence">
              <Input size="large" placeholder="As printed on the licence" />
            </Form.Item>
            <Form.Item
              name="dateOfBirth"
              label="Date of birth"
              getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
              normalize={(v) => (v ? v.format("YYYY-MM-DD") : "")}
              extra="As on your licence - checked against government RTO records."
              rules={[
                { required: true, message: "Enter your date of birth" },
                {
                  validator: (_, v) =>
                    !v || v <= dayjs().subtract(16, "year").format("YYYY-MM-DD")
                      ? Promise.resolve()
                      : Promise.reject(new Error("Enter a valid date of birth")),
                },
              ]}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                placeholder="Select date of birth"
                defaultPickerValue={dayjs().subtract(25, "year")}
                disabledDate={(d) => d && d.isAfter(dayjs().subtract(16, "year"))}
                inputReadOnly
              />
            </Form.Item>
            <Form.Item
              name="expiryDate"
              label="Valid till"
              getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
              normalize={(v) => (v ? v.format("YYYY-MM-DD") : "")}
              rules={[
                { required: true, message: "Enter the expiry date" },
                { validator: (_, v) => (!v || v >= dayjs().format("YYYY-MM-DD") ? Promise.resolve() : Promise.reject(new Error("This licence has expired"))) },
              ]}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                placeholder="Select expiry date"
                disabledDate={(d) => d && d.isBefore(dayjs().startOf("day"))}
                inputReadOnly
              />
            </Form.Item>
            <Form.Item label="Licence photo (front)" required>
              {file ? (
                <div className="dl-file">
                  <FileDoneOutlined />
                  <span>{file.name}</span>
                  <CloseCircleOutlined className="dl-remove" onClick={() => setFile(null)} />
                </div>
              ) : (
                <Upload.Dragger
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(f) => {
                    if (f.size > 5 * 1024 * 1024) {
                      notification.error({ title: "File too large", description: "Use a photo or PDF up to 5 MB." });
                    } else setFile(f);
                    return false;
                  }}
                >
                  <UploadOutlined style={{ fontSize: 26, color: "#2DD4BF" }} />
                  <div style={{ fontWeight: 600, marginTop: 6 }}>Tap to take a photo or choose a file</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>JPG, PNG, WEBP or PDF · up to 5 MB</div>
                </Upload.Dragger>
              )}
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting} style={{ background: "#0f766e" }}>
              {submitting ? "Reading your licence…" : "Verify licence"}
            </Button>
            {submitting && <div className="dl-wait">Checking your licence with government records - this can take up to a minute.</div>}
            {licence.status === "VERIFIED" && (
              <Button type="link" block onClick={() => setEditing(false)} style={{ marginTop: 6 }}>
                Cancel
              </Button>
            )}
          </Form>
        </div>

        {licence.status === "VERIFIED" && !editing && next && (
          <Button type="primary" block size="large" style={{ marginTop: 16, background: "#0f766e" }} onClick={() => navigate(next)}>
            Continue
          </Button>
        )}
      </Card>
      <style>{`
        .dl-wrap{max-width:520px;margin:24px auto;padding:0 12px}
        .dl-back{display:inline-flex;gap:6px;align-items:center;margin-bottom:12px;color:var(--text-secondary)}
        .dl-title{display:inline-flex;gap:8px;align-items:center}
        .dl-intro{margin-top:0;color:var(--text-secondary)}
        .dl-verified{display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.08)}
        .dl-verified>div{flex:1;min-width:0}
        .dl-verified strong{display:block;letter-spacing:.5px;overflow-wrap:anywhere}
        .dl-verified>div>div{font-size:12px;color:var(--text-secondary)}
        .dl-ok{font-size:26px;color:#22C55E}
        .dl-file{display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border)}
        .dl-wrap input[type=date]{color-scheme:dark}
        .dl-file span{flex:1;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dl-remove{cursor:pointer;color:var(--text-secondary)}
        .dl-wait{text-align:center;font-size:12px;color:var(--text-secondary);margin-top:8px}
        @media(max-width:768px){.dl-wrap{margin:8px auto}}
      `}</style>
    </div>
  );
}
