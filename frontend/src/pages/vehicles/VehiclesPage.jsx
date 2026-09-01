import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, List, Empty, Skeleton, App, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { vehicleService } from "../../services/vehicleService.js";
import colors from "../../theme/colors.js";

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }
`;

const VehicleCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: ${colors.shadowMd};
  }

  .ant-card-head {
    border-bottom: 1px solid ${colors.border};
    padding: 16px;
  }

  .ant-card-body {
    padding: 16px;
  }
`;

const VehicleTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }
`;

const VerificationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;

  &.verified {
    background: ${colors.successLight};
    color: ${colors.success};
  }

  &.pending {
    background: ${colors.warningLight};
    color: ${colors.warning};
  }

  &.rejected {
    background: ${colors.errorLight};
    color: ${colors.error};
  }

  svg {
    font-size: 12px;
  }
`;

const VehicleDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;

  .detail {
    padding: 10px;
    background: ${colors.bgSecondary};
    border-radius: 8px;

    .label {
      font-size: 11px;
      color: ${colors.textTertiary};
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .value {
      font-size: 13px;
      font-weight: 600;
      color: ${colors.textPrimary};
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid ${colors.border};

  button {
    flex: 1;
    font-size: 12px;
  }
`;

const verificationConfig = {
  PENDING: { badge: "pending", icon: <ClockCircleOutlined />, label: "Pending" },
  VERIFIED: { badge: "verified", icon: <CheckCircleOutlined />, label: "Verified" },
  REJECTED: { badge: "rejected", icon: <CloseCircleOutlined />, label: "Rejected" },
};

export default function VehiclesPage() {
  const { message } = App.useApp();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setVehicles(await vehicleService.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    try {
      await vehicleService.remove(id);
      message.success("Vehicle removed");
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader>
        <h1>My Vehicles</h1>
        <Link to="/vehicles/add">
          <Button type="primary" icon={<PlusOutlined />}>
            Add Vehicle
          </Button>
        </Link>
      </PageHeader>

      {loading ? (
        <Skeleton active />
      ) : vehicles.length === 0 ? (
        <Empty description="No vehicles yet. Add one to start creating rides." style={{ marginTop: 40 }} />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
          dataSource={vehicles}
          renderItem={(v) => {
            const verif = verificationConfig[v.verificationStatus];
            return (
              <List.Item>
                <VehicleCard
                  title={
                    <VehicleTitle>
                      <h3>{v.brand} {v.model}</h3>
                      <VerificationBadge className={verif.badge}>
                        {verif.icon}
                        {verif.label}
                      </VerificationBadge>
                    </VehicleTitle>
                  }
                >
                  <VehicleDetails>
                    <div className="detail">
                      <div className="label">Type</div>
                      <div className="value">{v.vehicleType}</div>
                    </div>
                    <div className="detail">
                      <div className="label">Year</div>
                      <div className="value">{v.manufacturingYear}</div>
                    </div>
                    <div className="detail">
                      <div className="label">Registration</div>
                      <div className="value">{v.registrationNumber}</div>
                    </div>
                    <div className="detail">
                      <div className="label">Color</div>
                      <div className="value">{v.color}</div>
                    </div>
                  </VehicleDetails>

                  <ActionButtons>
                    <Link to={`/vehicles/${v.id}/edit`} style={{ flex: 1 }}>
                      <Button icon={<EditOutlined />} block>
                        Edit
                      </Button>
                    </Link>
                    <Popconfirm title="Remove this vehicle?" onConfirm={() => handleDelete(v.id)}>
                      <Button icon={<DeleteOutlined />} block danger>
                        Remove
                      </Button>
                    </Popconfirm>
                  </ActionButtons>
                </VehicleCard>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
