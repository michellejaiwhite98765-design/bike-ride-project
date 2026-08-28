import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Form, Input, InputNumber, Select, Upload, App, Skeleton, Row, Col, Button as AntButton } from "antd";
import { UploadOutlined, ArrowLeftOutlined, FileDoneOutlined, CloseCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { vehicleService } from "../../services/vehicleService.js";
import colors from "../../theme/colors.js";

const { Dragger } = Upload;

const ACCENT = "#2563EB";
const ACCENT_DARK = "#1D4ED8";

const VEHICLE_TYPES = [
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "SCOOTER", label: "Scooter" },
  { value: "BICYCLE", label: "Bicycle" },
];

const STEPS = [
  { key: "details", label: "Details" },
  { key: "upload", label: "Upload RC" },
  { key: "verify", label: "Verify" },
];

/* ---------------------------------- layout --------------------------------- */

const PageWrap = styled.div`
  max-width: 1020px;
  margin: 0 auto;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textSecondary};
  margin-bottom: 18px;

  &:hover {
    color: ${ACCENT};
  }
`;

const HeaderBlock = styled.div`
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    color: ${colors.textPrimary};
    letter-spacing: -0.3px;
  }

  p {
    margin: 6px 0 0;
    font-size: 13.5px;
    color: ${colors.textSecondary};
  }
`;

const Panel = styled.div`
  background: ${colors.bgPrimary};
  border: 1px solid ${colors.border};
  border-radius: 14px;
  padding: 24px;
  box-shadow: ${colors.shadowSm};

  @media (max-width: 480px) {
    padding: 18px;
  }
`;

/* -------------------------------- step track -------------------------------- */

const StepTrack = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 22px;

  .step {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }

  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background 0.25s ease, color 0.25s ease;
  }

  .dot.done {
    background: ${ACCENT};
    color: #fff;
  }

  .dot.current {
    background: ${ACCENT};
    color: #fff;
  }

  .dot.upcoming {
    background: ${colors.bgTertiary};
    color: ${colors.textTertiary};
  }

  .label {
    font-size: 12px;
    font-weight: 600;
  }

  .label.done,
  .label.current {
    color: ${colors.textPrimary};
  }

  .label.upcoming {
    color: ${colors.textTertiary};
  }

  .connector {
    flex: 1;
    height: 1px;
    margin: 0 8px;
    background: ${colors.border};
    position: relative;
    overflow: hidden;
  }

  .connector .fill {
    position: absolute;
    inset: 0;
    background: ${ACCENT};
    transform-origin: left;
    transition: transform 0.35s ease;
  }
`;

/* --------------------------------- dropzone -------------------------------- */

const DropzoneWrap = styled.div`
  .ant-upload-drag {
    border: 1.5px dashed ${colors.border};
    border-radius: 12px;
    background: ${colors.bgSecondary};
    padding: 26px 16px;
    transition: all 0.2s ease;
  }

  .ant-upload-drag:hover,
  .ant-upload-drag-hover {
    border-color: ${ACCENT};
    background: #eff6ff;
  }

  .drop-icon {
    font-size: 24px;
    color: ${ACCENT};
    margin-bottom: 6px;
  }

  .drop-title {
    font-size: 13px;
    font-weight: 600;
    color: ${colors.textPrimary};
  }

  .drop-hint {
    font-size: 12px;
    color: ${colors.textTertiary};
    margin-top: 2px;
  }
`;

const FileChip = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${colors.successLight};
  background: ${colors.successLight};

  .icon {
    font-size: 17px;
    color: ${colors.success};
  }

  .name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: ${colors.textPrimary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove {
    cursor: pointer;
    color: ${colors.textTertiary};
    font-size: 15px;

    &:hover {
      color: ${colors.error};
    }
  }
`;

/* -------------------------------- verify result ------------------------------ */

const ResultBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 14px;

  &.verified {
    background: ${colors.successLight};
  }
  &.rejected {
    background: ${colors.errorLight};
  }

  .badge {
    position: relative;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid ${colors.success};
    animation: ring-pulse 2.2s ease-out infinite;
  }

  &.rejected .ring {
    border-color: ${colors.error};
    animation: none;
  }

  @keyframes ring-pulse {
    0% {
      transform: scale(0.7);
      opacity: 0;
    }
    45% {
      opacity: 0.5;
    }
    100% {
      transform: scale(1.7);
      opacity: 0;
    }
  }

  .check-path {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    animation: check-draw 0.5s ease-out 0.15s forwards;
  }

  @keyframes check-draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  .title {
    font-size: 13px;
    font-weight: 700;
  }
  &.verified .title {
    color: ${colors.success};
  }
  &.rejected .title {
    color: ${colors.error};
  }

  .subtitle {
    font-size: 11.5px;
    color: ${colors.textSecondary};
  }
`;

const RecordCard = styled.div`
  border: 1px solid ${colors.border};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 18px;

  .heading {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${colors.textTertiary};
    margin-bottom: 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field .label {
    font-size: 10px;
    color: ${colors.textTertiary};
    margin-bottom: 2px;
  }

  .field .value {
    font-size: 13px;
    font-weight: 600;
    color: ${colors.textPrimary};
  }
`;

const NavRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

const PrimaryBtn = styled(AntButton)`
  height: 42px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13.5px;
  background: ${ACCENT};
  border: none;

  &:hover {
    background: ${ACCENT_DARK} !important;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const SecondaryBtn = styled(AntButton)`
  height: 42px;
  border-radius: 9px;
  font-weight: 600;
  font-size: 13.5px;
`;

/* --------------------------------- component ------------------------------- */

export default function VehicleFormPage() {
  const { id: routeId } = useParams();
  const isEdit = Boolean(routeId);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [vehicleId, setVehicleId] = useState(routeId || null);
  const [vehicle, setVehicle] = useState(null);
  const [rcDocumentFile, setRcDocumentFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    vehicleService
      .getById(routeId)
      .then((v) => {
        form.setFieldsValue(v);
        setVehicle(v);
        setVehicleId(v.id);
        // Land wherever this vehicle's flow actually left off.
        if (v.verificationStatus === "VERIFIED") setStepIndex(2);
        else if (v.rcDocumentUrl) setStepIndex(2);
        else setStepIndex(1);
      })
      .finally(() => setLoading(false));
  }, [routeId, isEdit, form]);

  async function handleDetailsSubmit(values) {
    setSubmitting(true);
    try {
      if (vehicleId) {
        const updated = await vehicleService.update(vehicleId, values);
        setVehicle(updated);
      } else {
        const created = await vehicleService.create(values);
        setVehicle(created);
        setVehicleId(created.id);
      }
      setStepIndex(1);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadContinue() {
    if (!rcDocumentFile) {
      message.error("Select your RC document to continue");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await vehicleService.uploadRcDocument(vehicleId, rcDocumentFile);
      setVehicle(updated);
      setStepIndex(2);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setSubmitting(true);
    try {
      const result = await vehicleService.verify(vehicleId);
      setVerifyResult(result);
      setVehicle(result.vehicle);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Skeleton active />;

  const record = verifyResult?.providerResult;

  return (
    <PageWrap>
      <BackLink to="/vehicles">
        <ArrowLeftOutlined /> Back to vehicles
      </BackLink>

      <HeaderBlock>
        <h1>{isEdit ? "Edit vehicle" : "Add a vehicle"}</h1>
        <p>Add your vehicle, upload its RC, then verify it against VAHAN.</p>
      </HeaderBlock>

      <Panel>
        <StepTrack>
          {STEPS.map((step, i) => (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
              <div className="step">
                <span className={`dot ${i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming"}`}>{i + 1}</span>
                <span className={`label ${i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming"}`}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="connector">
                  <div className="fill" style={{ transform: `scaleX(${i < stepIndex ? 1 : 0})` }} />
                </div>
              )}
            </div>
          ))}
        </StepTrack>

        {stepIndex === 0 && (
          <Form form={form} layout="vertical" onFinish={handleDetailsSubmit} requiredMark={false}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="vehicleType" label="Vehicle type" rules={[{ required: true }]}>
                  <Select size="large" placeholder="Select type" options={VEHICLE_TYPES} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="color" label="Color" rules={[{ required: true }]}>
                  <Input size="large" placeholder="Black" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
                  <Input size="large" placeholder="Honda" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="model" label="Model" rules={[{ required: true }]}>
                  <Input size="large" placeholder="Unicorn" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="registrationNumber" label="Registration number" rules={[{ required: true }]}>
                  <Input size="large" placeholder="TN75BC1812" style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "1px", textTransform: "uppercase" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="manufacturingYear" label="Manufacturing year" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: "100%" }} min={1980} max={new Date().getFullYear() + 1} />
                </Form.Item>
              </Col>
            </Row>
            <NavRow>
              <PrimaryBtn type="primary" htmlType="submit" block loading={submitting}>
                Continue
              </PrimaryBtn>
            </NavRow>
          </Form>
        )}

        {stepIndex === 1 && (
          <div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 14 }}>
              Upload a clear photo or scan of your Registration Certificate.
            </div>
            <DropzoneWrap>
              {rcDocumentFile ? (
                <FileChip>
                  <FileDoneOutlined className="icon" />
                  <span className="name">{rcDocumentFile.name}</span>
                  <CloseCircleOutlined className="remove" onClick={() => setRcDocumentFile(null)} />
                </FileChip>
              ) : (
                <Dragger
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    setRcDocumentFile(file);
                    return false;
                  }}
                >
                  <UploadOutlined className="drop-icon" />
                  <div className="drop-title">Drop your RC here, or click to browse</div>
                  <div className="drop-hint">JPG, PNG, WEBP or PDF · up to 5MB</div>
                </Dragger>
              )}
            </DropzoneWrap>
            <NavRow>
              <SecondaryBtn block onClick={() => setStepIndex(0)}>
                Back
              </SecondaryBtn>
              <PrimaryBtn type="primary" block loading={submitting} onClick={handleUploadContinue}>
                Continue
              </PrimaryBtn>
            </NavRow>
          </div>
        )}

        {stepIndex === 2 && (
          <div>
            {!verifyResult && (
              <>
                <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
                  We'll check <strong>{vehicle?.registrationNumber}</strong> against VAHAN government records to confirm
                  this registration number is real and active.
                </div>
                <NavRow>
                  <SecondaryBtn block onClick={() => setStepIndex(1)}>
                    Back
                  </SecondaryBtn>
                  <PrimaryBtn type="primary" block loading={submitting} onClick={handleVerify}>
                    Verify vehicle
                  </PrimaryBtn>
                </NavRow>
              </>
            )}

            {verifyResult && !verifyResult.rejected && (
              <>
                <ResultBanner className="verified">
                  <div className="badge">
                    <div className="ring" />
                    <svg width="28" height="28" viewBox="0 0 26 26">
                      <circle cx="13" cy="13" r="12" fill={colors.success} />
                      <path className="check-path" d="M7 13l4 4 8-8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="title">Verified against VAHAN</div>
                    <div className="subtitle">Registration number matched</div>
                  </div>
                </ResultBanner>

                {record && (
                  <RecordCard>
                    <div className="heading">Government record</div>
                    <div className="grid">
                      <div className="field">
                        <div className="label">Maker</div>
                        <div className="value">{record.maker_description || "\u2014"}</div>
                      </div>
                      <div className="field">
                        <div className="label">Model</div>
                        <div className="value">{record.maker_model || "\u2014"}</div>
                      </div>
                      <div className="field">
                        <div className="label">Fuel type</div>
                        <div className="value">{record.fuel_type || "\u2014"}</div>
                      </div>
                      <div className="field">
                        <div className="label">Body type</div>
                        <div className="value">{record.body_type || "\u2014"}</div>
                      </div>
                    </div>
                  </RecordCard>
                )}

                <PrimaryBtn type="primary" block onClick={() => navigate("/vehicles")}>
                  Done
                </PrimaryBtn>
              </>
            )}

            {verifyResult?.rejected && (
              <>
                <ResultBanner className="rejected">
                  <div className="badge">
                    <svg width="28" height="28" viewBox="0 0 26 26">
                      <circle cx="13" cy="13" r="12" fill={colors.error} />
                      <path d="M9 9l8 8M17 9l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="title">Verification failed</div>
                    <div className="subtitle">{vehicle?.verificationFailureReason || "Could not confirm this vehicle"}</div>
                  </div>
                </ResultBanner>
                <NavRow>
                  <SecondaryBtn block onClick={() => setStepIndex(1)}>
                    Re-upload RC
                  </SecondaryBtn>
                  <PrimaryBtn type="primary" block loading={submitting} onClick={handleVerify}>
                    Try again
                  </PrimaryBtn>
                </NavRow>
              </>
            )}
          </div>
        )}
      </Panel>
    </PageWrap>
  );
}
