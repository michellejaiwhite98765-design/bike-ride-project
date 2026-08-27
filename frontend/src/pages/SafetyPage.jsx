import { Card, List, Alert, Button, App } from "antd";
import { SafetyCertificateOutlined, PhoneOutlined, WarningOutlined } from "@ant-design/icons";

const guidelines = [
  "Verify the rider's name, vehicle and registration number match the app before getting on.",
  "Share your trip details (rider name, vehicle, route) with a friend or family member.",
  "Wear a helmet at all times during the ride.",
  "Trust your instincts — if something feels wrong, end the ride and report it.",
  "Only communicate and pay through the app; never share OTPs or passwords.",
];

export default function SafetyPage() {
  const { message } = App.useApp();

  function handleSOS() {
    message.warning(
      "This button does not contact emergency services or anyone at BikeRide. In a real emergency, call 112 (or your local emergency number) directly, right now.",
      8
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2>
        <SafetyCertificateOutlined /> Safety Center
      </h2>

      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="SOS is not connected to emergency services yet"
        description="This MVP does not integrate with police, ambulance, or any emergency dispatch system. In a real emergency, always call your local emergency number directly."
        style={{ marginBottom: 24 }}
      />

      <Card title="Safety Guidelines" style={{ marginBottom: 24 }}>
        <List
          dataSource={guidelines}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>

      <Card title="Emergency Contact" style={{ marginBottom: 24 }}>
        <p>
          <PhoneOutlined /> National Emergency Number (India): <strong>112</strong>
        </p>
        <p style={{ color: "#64748b" }}>Save this number in your phone before starting any ride.</p>
      </Card>

      <Card title="SOS">
        <p style={{ color: "#64748b" }}>
          This button is a reminder only. It does not call emergency services or notify anyone at BikeRide.
        </p>
        <Button danger size="large" onClick={handleSOS}>
          SOS
        </Button>
      </Card>
    </div>
  );
}
