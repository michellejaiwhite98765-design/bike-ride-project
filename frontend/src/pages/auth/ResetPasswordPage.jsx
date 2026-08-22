import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Card, App, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { authService } from "../../services/authService.js";

export default function ResetPasswordPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onFinish({ password }) {
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <Card>
          <Result status="warning" title="Missing reset token" subTitle="Use the link sent to your email to reset your password." />
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <Card>
          <Result
            status="success"
            title="Password updated"
            extra={
              <Button type="primary" style={{ background: "#0f766e" }} onClick={() => navigate("/login")}>
                Back to login
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <Card title="Reset password">
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="password"
            label="New password"
            rules={[{ required: true, message: "Password is required" }, { min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ background: "#0f766e" }}>
            Reset password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
