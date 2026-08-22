import { Card, Form, Input, Button, Avatar, App } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, FileTextOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext.jsx";
import { userService } from "../services/userService.js";
import colors from "../theme/colors.js";

const PageContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, ${colors.bgSecondary} 0%, ${colors.bgTertiary} 100%);
  border-radius: 12px;
  border: 1px solid ${colors.border};
`;

const ProfileAvatar = styled(Avatar)`
  width: 80px !important;
  height: 80px !important;
  font-size: 32px !important;
  background: ${colors.primary} !important;
  margin: 0 auto 16px;
`;

const ProfileName = styled.h1`
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textPrimary};
`;

const ProfileEmail = styled.p`
  margin: 0;
  color: ${colors.textSecondary};
  font-size: 13px;
`;

const FormCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 24px 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;

  .icon {
    color: ${colors.primary};
    font-size: 18px;
  }

  &:first-child {
    margin-top: 0;
  }
`;

const FormGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  async function onFinish(values) {
    try {
      const updated = await userService.updateProfile(values);
      setUser(updated);
      message.success("Profile updated successfully");
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <PageContainer>
      {/* Profile Header */}
      <ProfileHeader>
        <ProfileAvatar icon={<UserOutlined />}>
          {user.firstName?.[0]}
        </ProfileAvatar>
        <ProfileName>
          {user.firstName} {user.lastName}
        </ProfileName>
        <ProfileEmail>{user.email}</ProfileEmail>
      </ProfileHeader>

      {/* Edit Profile Form */}
      <FormCard>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            bio: user.bio,
          }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <SectionTitle>
            <UserOutlined className="icon" />
            Personal Information
          </SectionTitle>

          <FormGroup>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input size="large" placeholder="Your first name" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input size="large" placeholder="Your last name" />
            </Form.Item>
          </FormGroup>

          <SectionTitle style={{ marginTop: 24 }}>
            <MailOutlined className="icon" />
            Contact Information
          </SectionTitle>

          <Form.Item name="phone" label="Phone Number" rules={[{ pattern: /^\+?[0-9]{10,15}$/, message: "Enter a valid phone number" }]}>
            <Input size="large" placeholder="+91 XXXXX XXXXX" />
          </Form.Item>

          <SectionTitle style={{ marginTop: 24 }}>
            <FileTextOutlined className="icon" />
            About You
          </SectionTitle>

          <Form.Item name="bio" label="Bio">
            <Input.TextArea
              rows={4}
              maxLength={500}
              placeholder="Tell other riders about yourself..."
              showCount
            />
          </Form.Item>

          <div style={{ marginTop: 32 }}>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              style={{ background: colors.primary }}
              block
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </FormCard>
    </PageContainer>
  );
}
