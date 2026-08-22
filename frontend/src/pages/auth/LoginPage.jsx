import { Link, useLocation, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, App } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  async function onFinish(values) {
    try {
      await login(values);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <Card title="Login to BikeRide">
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password is required" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Button type="primary" htmlType="submit" block size="large" style={{ background: "#0f766e" }}>
            Login
          </Button>
        </Form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </div>
      </Card>
    </div>
  );
}
