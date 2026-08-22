import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, InputNumber, Select, Button, App, Skeleton } from "antd";
import { vehicleService } from "../../services/vehicleService.js";

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    vehicleService
      .getById(id)
      .then((v) => form.setFieldsValue(v))
      .finally(() => setLoading(false));
  }, [id, isEdit, form]);

  async function onFinish(values) {
    setSubmitting(true);
    try {
      if (isEdit) {
        await vehicleService.update(id, values);
        message.success("Vehicle updated");
      } else {
        await vehicleService.create(values);
        message.success("Vehicle added");
      }
      navigate("/vehicles");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Skeleton active />;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <Card title={isEdit ? "Edit Vehicle" : "Add Vehicle"}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="vehicleType" label="Vehicle type" rules={[{ required: true }]}>
            <Select
              size="large"
              options={[
                { value: "MOTORCYCLE", label: "Motorcycle" },
                { value: "SCOOTER", label: "Scooter" },
                { value: "BICYCLE", label: "Bicycle" },
              ]}
            />
          </Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
            <Input size="large" placeholder="Honda" />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input size="large" placeholder="Activa" />
          </Form.Item>
          <Form.Item name="registrationNumber" label="Registration number" rules={[{ required: true }]}>
            <Input size="large" placeholder="TN01AB1234" />
          </Form.Item>
          <Form.Item name="color" label="Color" rules={[{ required: true }]}>
            <Input size="large" placeholder="Black" />
          </Form.Item>
          <Form.Item name="manufacturingYear" label="Manufacturing year" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: "100%" }} min={1980} max={new Date().getFullYear() + 1} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting} style={{ background: "#0f766e" }}>
            {isEdit ? "Save changes" : "Add vehicle"}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
