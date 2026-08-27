import { useEffect, useState } from "react";
import { Tabs, Table, Tag, Switch, Select, App, Result } from "antd";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext.jsx";
import { adminService } from "../../services/adminService.js";
import StatusTag from "../../components/StatusTag.jsx";

export default function AdminPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, r, b, p, s] = await Promise.all([
        adminService.listUsers(),
        adminService.listRides(),
        adminService.listBookings(),
        adminService.listPayments(),
        adminService.listReports(),
      ]);
      setUsers(u);
      setRides(r);
      setBookings(b);
      setPayments(p);
      setReports(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (user?.role !== "ADMIN") {
    return <Result status="403" title="Access denied" subTitle="This area is for administrators only." />;
  }

  async function toggleUserStatus(id, isActive) {
    try {
      await adminService.setUserStatus(id, isActive);
      message.success("User status updated");
      loadAll();
    } catch (err) {
      message.error(err.message);
    }
  }

  async function verifyVehicle(vehicleId, verificationStatus) {
    try {
      await adminService.verifyVehicle(vehicleId, verificationStatus);
      message.success("Vehicle verification updated");
      loadAll();
    } catch (err) {
      message.error(err.message);
    }
  }

  async function updateReportStatus(id, status) {
    try {
      await adminService.updateReport(id, { status });
      message.success("Report updated");
      loadAll();
    } catch (err) {
      message.error(err.message);
    }
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <Tabs
        items={[
          {
            key: "users",
            label: `Users (${users.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={users}
                columns={[
                  { title: "Name", render: (_, u) => `${u.firstName} ${u.lastName}` },
                  { title: "Email", dataIndex: "email" },
                  { title: "Phone", dataIndex: "phone" },
                  { title: "Role", dataIndex: "role", render: (r) => <Tag>{r}</Tag> },
                  {
                    title: "Active",
                    render: (_, u) => (
                      <Switch checked={u.isActive} onChange={(checked) => toggleUserStatus(u.id, checked)} />
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: "rides",
            label: `Rides (${rides.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={rides}
                columns={[
                  { title: "Rider", render: (_, r) => `${r.rider?.firstName} ${r.rider?.lastName}` },
                  { title: "Route", render: (_, r) => `${r.sourceName} → ${r.destinationName}` },
                  { title: "Date", render: (_, r) => dayjs(r.departureDate).format("DD MMM YYYY") },
                  { title: "Status", render: (_, r) => <StatusTag status={r.status} /> },
                  {
                    title: "Vehicle verification",
                    render: (_, r) => (
                      <Select
                        size="small"
                        value={r.vehicle?.verificationStatus}
                        style={{ width: 130 }}
                        onChange={(value) => verifyVehicle(r.vehicle.id, value)}
                        options={[
                          { value: "PENDING", label: "Pending" },
                          { value: "VERIFIED", label: "Verified" },
                          { value: "REJECTED", label: "Rejected" },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: "bookings",
            label: `Bookings (${bookings.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={bookings}
                columns={[
                  { title: "Passenger", render: (_, b) => `${b.passenger?.firstName} ${b.passenger?.lastName}` },
                  { title: "Route", render: (_, b) => `${b.ride?.sourceName} → ${b.ride?.destinationName}` },
                  { title: "Status", render: (_, b) => <StatusTag status={b.bookingStatus} /> },
                  { title: "Payment", render: (_, b) => <StatusTag status={b.paymentStatus} /> },
                  { title: "Total", render: (_, b) => `₹${b.totalAmount}` },
                ]}
              />
            ),
          },
          {
            key: "payments",
            label: `Payments (${payments.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={payments}
                columns={[
                  { title: "Order ID", dataIndex: "providerOrderId" },
                  { title: "Amount", render: (_, p) => `₹${p.amount}` },
                  { title: "Status", render: (_, p) => <StatusTag status={p.status} /> },
                  { title: "Created", render: (_, p) => dayjs(p.createdAt).format("DD MMM YYYY HH:mm") },
                ]}
              />
            ),
          },
          {
            key: "reports",
            label: `Safety Reports (${reports.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={reports}
                columns={[
                  { title: "Reporter", render: (_, r) => `${r.reporter?.firstName} ${r.reporter?.lastName}` },
                  { title: "Reported user", render: (_, r) => `${r.reportedUser?.firstName} ${r.reportedUser?.lastName}` },
                  { title: "Reason", dataIndex: "reason" },
                  {
                    title: "Status",
                    render: (_, r) => (
                      <Select
                        size="small"
                        value={r.status}
                        style={{ width: 140 }}
                        onChange={(value) => updateReportStatus(r.id, value)}
                        options={["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].map((s) => ({ value: s, label: s }))}
                      />
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
