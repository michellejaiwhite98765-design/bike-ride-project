import { useState } from "react";
import { Link } from "react-router-dom";
import { Form, Input, Button, Card, App, Result } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { authService } from "../../services/authService.js";

export default function ForgotPasswordPage() {
  const { message } = App.useApp();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onFinish({ email }) {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <Card>
          <Result
            status="success"
            title="Check your email"
            subTitle="If an account with that email exists, a reset link has been sent."
            extra={
              <Link to="/login">
                <Button type="primary" style={{ background: "#0f766e" }}>
                  Back to login
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <Card title="Forgot password">
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ background: "#0f766e" }}>
            Send reset link
          </Button>
        </Form>
      </Card>
    </div>
  );
}
