import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, App, Row, Col } from "antd";
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  async function onFinish(values) {
    try {
      await register(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto" }}>
      <Card title="Create your BikeRide account">
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="First name" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="Last name" size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: "Phone is required" }, { pattern: /^\+?[0-9]{10,15}$/, message: "Enter a valid phone number" }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="9876543210" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }, { min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" size="large" />
          </Form.Item>
          <Form.Item name="profileImage" hidden>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" style={{ background: "#0f766e", marginTop: 8 }}>
            Sign up
          </Button>
        </Form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </Card>
    </div>
  );
}
