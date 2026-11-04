import { Card, Form, Input, Button, App } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, ArrowLeftOutlined, CheckCircleFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext.jsx";
import { userService } from "../services/userService.js";
import colors from "../theme/colors.js";
import AccountMenu from "../components/layout/AccountMenu.jsx";
import ChangePhoneModal from "../components/ChangePhoneModal.jsx";
import { useState } from "react";
import ProfilePhotoPicker from "../components/profile/ProfilePhotoPicker.jsx";

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

const ProfilePhotoHint = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
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

/**
 * /profile: your name card plus the account menu (Personal information, My
 * Bookings, ...). /profile/edit (`editing`): the personal-information form.
 */
export default function ProfilePage({ editing = false }) {
  const { user, setUser } = useAuth();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [changingPhone, setChangingPhone] = useState(false);

  async function onFinish(values) {
    try {
      // The mobile number is changed through ChangePhoneModal (OTP), not this form.
      const { phone: _phone, ...changes } = values;
      const updated = await userService.updateProfile(changes);
      setUser(updated);
      notification.success({ title: "Success", description: "Profile updated successfully" });
    } catch (err) {
      notification.error({ title: "Error", description: err.message });
    }
  }

  if (!editing) {
    return (
      <PageContainer>
        <ProfileHeader>
          <ProfilePhotoPicker size={96} />
          <ProfilePhotoHint>Tap your photo to change it</ProfilePhotoHint>
          <ProfileName>
            {user.firstName} {user.lastName}
          </ProfileName>
          <ProfileEmail>{user.email}</ProfileEmail>
        </ProfileHeader>
        <AccountMenu />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link to="/profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "4px 0 12px", fontWeight: 600 }}>
        <ArrowLeftOutlined /> Back to profile
      </Link>


      {/* Edit Profile Form */}
      <FormCard>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
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

          <Form.Item label="Mobile number" extra="Verified. Changing it needs an OTP sent to the new number.">
            <div style={{ display: "flex", gap: 8 }}>
              <Form.Item name="phone" noStyle>
                <Input size="large" disabled prefix={<PhoneOutlined />} suffix={<CheckCircleFilled style={{ color: "#16a34a" }} aria-label="Verified" />} />
              </Form.Item>
              <Button size="large" onClick={() => setChangingPhone(true)}>
                Change
              </Button>
            </div>
          </Form.Item>
          <ChangePhoneModal
            open={changingPhone}
            currentPhone={user.phone}
            onClose={() => setChangingPhone(false)}
            onChanged={(updated) => {
              setUser(updated);
              form.setFieldValue("phone", updated.phone);
            }}
          />

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
