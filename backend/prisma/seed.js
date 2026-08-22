import bcrypt from "bcrypt";
import crypto from "node:crypto";
import pg from "pg";
import "dotenv/config";
import { insertRow } from "../src/utils/sqlRows.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const PASSWORD = "password123";

async function clearData() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of [
      "notifications",
      "ratings",
      "payments",
      "bookings",
      "ride_requests",
      "ride_stops",
      "rides",
      "vehicles",
      "safety_reports",
      "audit_logs",
      "users",
    ]) {
      await client.query(`DELETE FROM "${table}"`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function insert(table, data) {
  const { text, values } = insertRow(table, data);
  const { rows } = await pool.query(text, values);
  return rows[0];
}

function inDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Clearing existing data...");
  await clearData();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log("Creating users...");
  const admin = await insert("users", {
    id: crypto.randomUUID(),
    firstName: "Admin",
    lastName: "User",
    email: "admin@bikeride.dev",
    phone: "9000000000",
    passwordHash,
    role: "ADMIN",
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [ravi, priya, arjun, meena, karthik] = await Promise.all([
    insert("users", { id: crypto.randomUUID(), firstName: "Ravi", lastName: "Kumar", email: "ravi@bikeride.dev", phone: "9000000001", passwordHash, isVerified: true, createdAt: new Date(), updatedAt: new Date() }),
    insert("users", { id: crypto.randomUUID(), firstName: "Priya", lastName: "Sundaram", email: "priya@bikeride.dev", phone: "9000000002", passwordHash, isVerified: true, createdAt: new Date(), updatedAt: new Date() }),
    insert("users", { id: crypto.randomUUID(), firstName: "Arjun", lastName: "Raj", email: "arjun@bikeride.dev", phone: "9000000003", passwordHash, isVerified: true, createdAt: new Date(), updatedAt: new Date() }),
    insert("users", { id: crypto.randomUUID(), firstName: "Meena", lastName: "Iyer", email: "meena@bikeride.dev", phone: "9000000004", passwordHash, createdAt: new Date(), updatedAt: new Date() }),
    insert("users", { id: crypto.randomUUID(), firstName: "Karthik", lastName: "Babu", email: "karthik@bikeride.dev", phone: "9000000005", passwordHash, createdAt: new Date(), updatedAt: new Date() }),
  ]);

  console.log("Creating vehicles...");
  const [raviVehicle, arjunVehicle, karthikVehicle] = await Promise.all([
    insert("vehicles", { id: crypto.randomUUID(), ownerId: ravi.id, vehicleType: "MOTORCYCLE", brand: "Honda", model: "Activa", registrationNumber: "TN01AB1234", color: "Black", manufacturingYear: 2022, verificationStatus: "VERIFIED", createdAt: new Date(), updatedAt: new Date() }),
    insert("vehicles", { id: crypto.randomUUID(), ownerId: arjun.id, vehicleType: "SCOOTER", brand: "TVS", model: "Jupiter", registrationNumber: "TN02CD5678", color: "Blue", manufacturingYear: 2021, verificationStatus: "VERIFIED", createdAt: new Date(), updatedAt: new Date() }),
    insert("vehicles", { id: crypto.randomUUID(), ownerId: karthik.id, vehicleType: "MOTORCYCLE", brand: "Royal Enfield", model: "Classic 350", registrationNumber: "TN03EF9012", color: "Green", manufacturingYear: 2023, verificationStatus: "PENDING", createdAt: new Date(), updatedAt: new Date() }),
  ]);

  console.log("Creating rides...");
  const rideRoutes = [
    { sourceName: "Avadi", sourceLatitude: 13.1147, sourceLongitude: 80.1, destinationName: "Chennai Central", destinationLatitude: 13.0827, destinationLongitude: 80.2707, rider: ravi, vehicle: raviVehicle, rideType: "WITHOUT_TIP", tipAmount: 0, seats: 2 },
    { sourceName: "Ambattur", sourceLatitude: 13.1143, sourceLongitude: 80.1548, destinationName: "Anna Nagar", destinationLatitude: 13.085, destinationLongitude: 80.2101, rider: arjun, vehicle: arjunVehicle, rideType: "WITH_TIP", tipAmount: 40, seats: 1 },
    { sourceName: "Tambaram", sourceLatitude: 12.9249, sourceLongitude: 80.1, destinationName: "Guindy", destinationLatitude: 13.0067, destinationLongitude: 80.2206, rider: karthik, vehicle: karthikVehicle, rideType: "WITH_TIP", tipAmount: 60, seats: 2 },
    { sourceName: "Porur", sourceLatitude: 13.0381, sourceLongitude: 80.1565, destinationName: "T Nagar", destinationLatitude: 13.0418, destinationLongitude: 80.2341, rider: ravi, vehicle: raviVehicle, rideType: "WITHOUT_TIP", tipAmount: 0, seats: 1 },
  ];

  const rides = [];
  for (let i = 0; i < rideRoutes.length; i++) {
    const r = rideRoutes[i];
    const ride = await insert("rides", {
      id: crypto.randomUUID(),
      riderId: r.rider.id,
      vehicleId: r.vehicle.id,
      sourceName: r.sourceName,
      sourceLatitude: r.sourceLatitude,
      sourceLongitude: r.sourceLongitude,
      destinationName: r.destinationName,
      destinationLatitude: r.destinationLatitude,
      destinationLongitude: r.destinationLongitude,
      departureDate: inDays(2 + i),
      departureTime: "08:30",
      availableSeats: r.seats,
      totalSeats: r.seats,
      rideType: r.rideType,
      tipAmount: r.tipAmount,
      status: "PUBLISHED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    rides.push(ride);
  }

  console.log("Creating a completed ride with booking, payment and rating...");
  const completedRide = await insert("rides", {
    id: crypto.randomUUID(),
    riderId: ravi.id,
    vehicleId: raviVehicle.id,
    sourceName: "Avadi",
    sourceLatitude: 13.1147,
    sourceLongitude: 80.1,
    destinationName: "Chennai Central",
    destinationLatitude: 13.0827,
    destinationLongitude: 80.2707,
    departureDate: inDays(-2),
    departureTime: "08:00",
    availableSeats: 0,
    totalSeats: 1,
    rideType: "WITH_TIP",
    tipAmount: 50,
    status: "COMPLETED",
    startedAt: inDays(-2),
    completedAt: inDays(-2),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const completedRequest = await insert("ride_requests", {
    id: crypto.randomUUID(),
    rideId: completedRide.id,
    passengerId: priya.id,
    pickupName: "Avadi Bus Stand",
    pickupLatitude: 13.1147,
    pickupLongitude: 80.1,
    dropName: "Chennai Central",
    dropLatitude: 13.0827,
    dropLongitude: 80.2707,
    seatsRequested: 1,
    status: "ACCEPTED",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const completedBooking = await insert("bookings", {
    id: crypto.randomUUID(),
    rideId: completedRide.id,
    passengerId: priya.id,
    rideRequestId: completedRequest.id,
    seats: 1,
    tipAmount: 50,
    platformFee: 5,
    totalAmount: 55,
    bookingStatus: "CONFIRMED",
    paymentStatus: "SUCCESS",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await insert("payments", {
    id: crypto.randomUUID(),
    bookingId: completedBooking.id,
    idempotencyKey: `booking:${completedBooking.id}`,
    providerOrderId: "order_seed_demo",
    providerPaymentId: "pay_seed_demo",
    amount: 55,
    status: "SUCCESS",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await insert("ratings", { id: crypto.randomUUID(), bookingId: completedBooking.id, reviewerId: priya.id, revieweeId: ravi.id, score: 5, comment: "Smooth and friendly ride!", createdAt: new Date() });
  await insert("ratings", { id: crypto.randomUUID(), bookingId: completedBooking.id, reviewerId: ravi.id, revieweeId: priya.id, score: 5, comment: "Great passenger, on time.", createdAt: new Date() });

  console.log("Creating an open ride request (pending) for demo purposes...");
  await insert("ride_requests", {
    id: crypto.randomUUID(),
    rideId: rides[0].id,
    passengerId: meena.id,
    pickupName: "Avadi Bus Stand",
    pickupLatitude: 13.1147,
    pickupLongitude: 80.1,
    dropName: "Chennai Central",
    dropLatitude: 13.0827,
    dropLongitude: 80.2707,
    seatsRequested: 1,
    status: "REQUESTED",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Creating notifications...");
  await insert("notifications", { id: crypto.randomUUID(), userId: ravi.id, type: "RIDE_REQUEST_CREATED", title: "New ride request", message: "Meena requested to join your ride to Chennai Central", data: { rideId: rides[0].id }, createdAt: new Date() });
  await insert("notifications", { id: crypto.randomUUID(), userId: priya.id, type: "NEW_RATING", title: "New rating received", message: "You received a 5-star rating", data: { bookingId: completedBooking.id }, createdAt: new Date() });
  await insert("notifications", { id: crypto.randomUUID(), userId: ravi.id, type: "NEW_RATING", title: "New rating received", message: "You received a 5-star rating", data: { bookingId: completedBooking.id }, createdAt: new Date() });

  console.log("Seed complete.");
  console.log("Login with any seeded user using password:", PASSWORD);
  console.log("Admin: admin@bikeride.dev | Rider: ravi@bikeride.dev | Passenger: priya@bikeride.dev");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
