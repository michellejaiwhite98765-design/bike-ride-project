import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  SafetyOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltFilled,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Empty, Input, Select, Skeleton, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useAuth } from "../context/AuthContext.jsx";
import { rideService } from "../services/rideService.js";
import { bookingService } from "../services/bookingService.js";
import RideCard from "../components/ride/RideCard.jsx";
import UpcomingRidesCarousel from "../components/home/UpcomingRidesCarousel.jsx";
import HeroLiveMap from "../components/home/HeroLiveMap.jsx";
import "./HomePage.css";

const testimonials = [
  {
    quote:
      "BikeRide made my weekly commute much easier. I found a reliable rider within minutes.",
    name: "Karthik M.",
    role: "Regular rider",
    initials: "KM",
  },
  {
    quote:
      "I share my empty seats on trips I already take and recover part of my travel cost.",
    name: "Divya P.",
    role: "Ride host",
    initials: "DP",
  },
  {
    quote:
      "The live tracking and rider ratings make the whole experience feel safe and transparent.",
    name: "Rahul S.",
    role: "BikeRide member",
    initials: "RS",
  },
];

const stats = [
  { value: "10K+", label: "rides completed" },
  { value: "5K+", label: "happy riders" },
  { value: "1K+", label: "active hosts" },
  { value: "4.8/5", label: "average rating" },
];

// Staggered entrance for the hero copy - each direct child fades/slides up
// in sequence rather than the whole block popping in at once.
const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const findRide = () => navigate("/search");
  const offerRide = () => navigate("/rides/create");

  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  const [nearbyRides, setNearbyRides] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch the logged-in user's own rides (as driver or rider).
  useEffect(() => {
    if (!user) {
      setMyRides([]);
      return;
    }
    let cancelled = false;
    rideService
      .listMine()
      .then((data) => {
        if (!cancelled) setMyRides(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMyRides([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch the logged-in user's own bookings (as a passenger), used together
  // with myRides below to surface a single "next up" ride on the homepage.
  useEffect(() => {
    if (!user) {
      setMyBookings([]);
      return;
    }
    let cancelled = false;
    bookingService
      .listMine()
      .then((data) => {
        if (!cancelled) setMyBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMyBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // The single most relevant ride to surface at the top of the homepage:
  // whichever of the user's rides (as driver) or confirmed bookings (as
  // passenger) is either in progress right now or departing soonest.
  const upcomingRides = useMemo(() => {
    const now = dayjs();
    const candidates = [];

    for (const ride of myRides) {
      if (ride.riderId !== user?.id || !["PUBLISHED", "STARTED"].includes(ride.status)) continue;
      const departure = dayjs(`${dayjs(ride.departureDate).format("YYYY-MM-DD")}T${ride.departureTime}`);
      if (ride.status === "PUBLISHED" && departure.isBefore(now)) continue;
      candidates.push({
        role: "rider",
        rideId: ride.id,
        sourceName: ride.sourceName,
        destinationName: ride.destinationName,
        sourceLatitude: ride.sourceLatitude,
        sourceLongitude: ride.sourceLongitude,
        destinationLatitude: ride.destinationLatitude,
        destinationLongitude: ride.destinationLongitude,
        status: ride.status,
        departure,
        linkTo: `/rides/${ride.id}`,
        vehicle: ride.vehicle,
        seats: (ride.totalSeats ?? 0) - (ride.availableSeats ?? 0),
      });
    }

    for (const booking of myBookings) {
      const ride = booking.ride;
      if (booking.bookingStatus !== "CONFIRMED" || !ride || !["PUBLISHED", "STARTED"].includes(ride.status)) continue;
      const departure = dayjs(`${dayjs(ride.departureDate).format("YYYY-MM-DD")}T${ride.departureTime}`);
      if (ride.status === "PUBLISHED" && departure.isBefore(now)) continue;
      candidates.push({
        role: "passenger",
        rideId: ride.id,
        sourceName: ride.sourceName,
        destinationName: ride.destinationName,
        sourceLatitude: ride.sourceLatitude,
        sourceLongitude: ride.sourceLongitude,
        destinationLatitude: ride.destinationLatitude,
        destinationLongitude: ride.destinationLongitude,
        status: ride.status,
        departure,
        linkTo: `/bookings/${booking.id}`,
        rider: ride.rider,
        vehicle: ride.vehicle,
        seats: booking.seats,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
      });
    }

    candidates.sort((a, b) => {
      if (a.status === "STARTED" && b.status !== "STARTED") return -1;
      if (b.status === "STARTED" && a.status !== "STARTED") return 1;
      return a.departure.valueOf() - b.departure.valueOf();
    });
    return candidates.slice(0, 5);
  }, [myRides, myBookings, user]);

  // Fetch nearby available rides using the browser's geolocation as the
  // starting point, defaulting to today and 1 seat.
  useEffect(() => {
    let cancelled = false;

    function runSearch(lat, lng) {
      setUserLocation({ latitude: lat, longitude: lng });
      setLoadingNearby(true);
      rideService
        .search({
          sourceLatitude: lat,
          sourceLongitude: lng,
          destinationLatitude: lat,
          destinationLongitude: lng,
          date: dayjs().format("YYYY-MM-DD"),
          seats: 1, radius: 50,
        })
        .then((data) => {
          if (!cancelled) setNearbyRides(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setNearbyRides([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingNearby(false);
        });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => runSearch(pos.coords.latitude, pos.coords.longitude),
        // Fall back to Madurai if location access is denied/unavailable.
        () => runSearch(9.9252, 78.1198),
        { timeout: 5000 }
      );
    } else {
      runSearch(9.9252, 78.1198);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="br-home">
<main>
        {upcomingRides.length > 0 && (
          <div className="br-container" style={{ paddingTop: 10 }}>
            <UpcomingRidesCarousel rides={upcomingRides} />
          </div>
        )}

        <section className="br-hero br-hero-embedded" style={upcomingRides.length > 0 ? { paddingTop: 24 } : undefined}>
          <div className="br-hero-glow br-glow-one" />
          <div className="br-hero-glow br-glow-two" />

          <div className="br-container">
            <motion.div variants={heroItem} initial="hidden" animate="visible">
              <Tag className="br-eyebrow">
                <ThunderboltFilled /> Smarter journeys, together
              </Tag>
            </motion.div>

            <motion.div className="br-hero-split" variants={heroStagger} initial="hidden" animate="visible">
              <motion.div className="br-hero-panel" variants={heroItem}>
                <div className="br-hero-panel-head">
                  <div className="br-hero-panel-icon br-hero-panel-icon-find"><SearchOutlined /></div>
                  <div>
                    <h2>Find a Ride</h2>
                    <p>Search nearby rides that match your route, date, and time.</p>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="primary" size="large" block onClick={findRide}>
                    Find a Ride <ArrowRightOutlined />
                  </Button>
                </motion.div>

                <div className="br-map-card" aria-label="BikeRide route preview">
                  <div className="br-map-top">
                    <div>
                      <span className="br-map-label">LIVE ROUTE PREVIEW</span>
                      <strong>Explore rides near you</strong>
                    </div>
                    <span className="br-map-status"><span /> Live</span>
                  </div>

                  <div className="br-map">
                    <HeroLiveMap userLocation={userLocation} nearbyRides={nearbyRides} />
                  </div>

                  <div className="br-map-bottom">
                    <span><EnvironmentOutlined /> {nearbyRides.length} ride{nearbyRides.length === 1 ? "" : "s"} nearby</span>
                    <button onClick={findRide}>View all <ArrowRightOutlined /></button>
                  </div>
                </div>
              </motion.div>

              <motion.div className="br-hero-panel" variants={heroItem}>
                <div className="br-hero-panel-head">
                  <div className="br-hero-panel-icon br-hero-panel-icon-offer"><CarOutlined /></div>
                  <div>
                    <h2>Offer a Ride</h2>
                    <p>Share your empty seats and recover part of your travel cost.</p>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="large" block className="br-outline-button" onClick={offerRide}>
                    Offer a Ride
                  </Button>
                </motion.div>

                <div className="br-map-card" aria-label="Create a ride preview">
                  <div className="br-map-top">
                    <div>
                      <span className="br-map-label">CREATE A RIDE</span>
                      <strong>Share your route in seconds</strong>
                    </div>
                  </div>

                  <div className="br-create-visual">
                    <div className="br-create-row">
                      <span className="br-create-icon"><EnvironmentOutlined /></span>
                      Pickup &amp; destination
                    </div>
                    <div className="br-create-row">
                      <span className="br-create-icon"><CalendarOutlined /></span>
                      Date &amp; time
                    </div>
                    <div className="br-create-row">
                      <span className="br-create-icon"><TeamOutlined /></span>
                      Seats available
                    </div>
                    <div className="br-create-row">
                      <span className="br-create-icon"><WalletOutlined /></span>
                      Set your price
                    </div>
                  </div>

                  <div className="br-map-bottom">
                    <span><CarOutlined /> Publish in under a minute</span>
                    <button onClick={offerRide}>Create ride <ArrowRightOutlined /></button>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div className="br-trust-row br-trust-row-standalone" variants={heroItem} initial="hidden" animate="visible">
              <span><CheckCircleFilled /> Verified members</span>
              <span><CheckCircleFilled /> Secure bookings</span>
              <span><CheckCircleFilled /> Live tracking</span>
            </motion.div>
          </div>

          <div className="br-container br-search-wrap" id="rides">
            <div className="br-search-card">
              <div className="br-search-heading">
                <span className="br-search-icon"><SearchOutlined /></span>
                <div>
                  <strong>Where are you going?</strong>
                  <span>Search available rides in seconds</span>
                </div>
              </div>

              <div className="br-search-fields">
                <div className="br-field">
                  <label>From</label>
                  <Input prefix={<EnvironmentOutlined />} placeholder="Starting point" />
                </div>
                <div className="br-field">
                  <label>To</label>
                  <Input prefix={<EnvironmentOutlined />} placeholder="Where to?" />
                </div>
                <div className="br-field br-date-field">
                  <label>Date</label>
                  <DatePicker
                    suffixIcon={<CalendarOutlined />}
                    placeholder="Choose date"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="br-field br-passenger-field">
                  <label>Passengers</label>
                  <Select
                    defaultValue="1 passenger"
                    style={{ width: "100%" }}
                    options={[
                      { value: "1 passenger", label: "1 passenger" },
                      { value: "2 passengers", label: "2 passengers" },
                      { value: "3 passengers", label: "3 passengers" },
                      { value: "4 passengers", label: "4 passengers" },
                    ]}
                  />
                </div>
                <Button type="primary" size="large" className="br-search-button" onClick={findRide}>
                  Search Rides
                </Button>
              </div>

              <div className="br-recent-searches">
                <span>Popular:</span>
                <button onClick={findRide}>Madurai → Chennai</button>
                <button onClick={findRide}>Chennai → Pondicherry</button>
                <button onClick={findRide}>Bengaluru → Mysuru</button>
              </div>
            </div>
          </div>
        </section>

        <section className="br-stats-section">
          <div className="br-container br-stats">
            {stats.map((stat) => (
              <div className="br-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="br-section" id="how-it-works">
          <div className="br-container">
            <div className="br-section-heading centered">
              <Tag className="br-section-tag">HOW IT WORKS</Tag>
              <h2>Simple from search to arrival.</h2>
              <p>Everything you need for a smoother shared journey, in one place.</p>
            </div>

            <div className="br-steps">
              {[
                {
                  number: "01",
                  icon: <SearchOutlined />,
                  title: "Find a ride",
                  text: "Enter your route and date to discover rides that match your journey.",
                },
                {
                  number: "02",
                  icon: <TeamOutlined />,
                  title: "Choose your ride",
                  text: "Compare hosts, ratings, timing and seats before making your choice.",
                },
                {
                  number: "03",
                  icon: <CheckCircleFilled />,
                  title: "Book securely",
                  text: "Send a request, confirm your seat and keep your booking details in one place.",
                },
                {
                  number: "04",
                  icon: <GlobalOutlined />,
                  title: "Travel together",
                  text: "Stay connected with live ride updates and reach your destination with confidence.",
                },
              ].map((step) => (
                <div className="br-step" key={step.number}>
                  <div className="br-step-number">{step.number}</div>
                  <div className="br-step-icon">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="br-section br-light-section" id="community">
          <div className="br-container">
            <div className="br-section-heading split">
              <div>
                <Tag className="br-section-tag">NEARBY RIDES</Tag>
                <h2>Rides people are taking.</h2>
                <p>Live rides available near your current location.</p>
              </div>
              <Button type="link" onClick={findRide}>
                Explore all rides <ArrowRightOutlined />
              </Button>
            </div>

            {loadingNearby ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : nearbyRides.length === 0 ? (
              <Empty description="No nearby rides found right now.">
                <Button type="primary" onClick={findRide}>
                  Search all rides
                </Button>
              </Empty>
            ) : (
              <div className="br-route-grid">
                {nearbyRides.slice(0, 6).map((ride) => (
                  <RideCard key={ride.id} ride={ride} showMatch />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="br-section">
          <div className="br-container br-two-col">
            <div className="br-feature-panel br-rider-panel">
              <div className="br-feature-icon"><SearchOutlined /></div>
              <Tag className="br-feature-tag">FOR RIDERS</Tag>
              <h2>Get there for less.</h2>
              <p>
                Find people heading in the same direction, compare options and book
                a comfortable seat without the hassle.
              </p>
              <ul>
                <li><CheckCircleFilled /> Discover affordable routes</li>
                <li><CheckCircleFilled /> Check host ratings before booking</li>
                <li><CheckCircleFilled /> Keep all your bookings organized</li>
              </ul>
              <Button type="primary" onClick={findRide}>Find a Ride <ArrowRightOutlined /></Button>
            </div>

            <div className="br-feature-panel br-host-panel">
              <div className="br-feature-icon"><ShareAltOutlined /></div>
              <Tag className="br-feature-tag">FOR HOSTS</Tag>
              <h2>Share your journey.</h2>
              <p>
                Already travelling somewhere? Offer your spare seats, meet fellow
                riders and recover part of your travel cost.
              </p>
              <ul>
                <li><CheckCircleFilled /> Publish your route in minutes</li>
                <li><CheckCircleFilled /> Manage requests and passengers</li>
                <li><CheckCircleFilled /> Build your community rating</li>
              </ul>
              <Button onClick={offerRide}>Offer a Ride <ArrowRightOutlined /></Button>
            </div>
          </div>
        </section>

        <section className="br-safety-section" id="safety">
          <div className="br-container br-safety-grid">
            <div>
              <Tag className="br-section-tag light">SAFETY FIRST</Tag>
              <h2>Designed around trust.</h2>
              <p>
                Every part of BikeRide is built to help riders make informed choices
                and stay connected throughout the journey.
              </p>
              <Button className="br-safety-button" onClick={() => navigate("/safety")}>
                Learn about safety <ArrowRightOutlined />
              </Button>
            </div>

            <div className="br-safety-features">
              <div>
                <span><UserOutlined /></span>
                <div><strong>Verified profiles</strong><p>Know who you are travelling with.</p></div>
              </div>
              <div>
                <span><StarFilled /></span>
                <div><strong>Ratings & reviews</strong><p>Choose hosts and riders with confidence.</p></div>
              </div>
              <div>
                <span><GlobalOutlined /></span>
                <div><strong>Live ride tracking</strong><p>Stay informed while your trip is underway.</p></div>
              </div>
              <div>
                <span><SafetyOutlined /></span>
                <div><strong>Safety reporting</strong><p>Access support when something does not feel right.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="br-section">
          <div className="br-container">
            <div className="br-section-heading centered">
              <Tag className="br-section-tag">COMMUNITY STORIES</Tag>
              <h2>Loved by people on the move.</h2>
              <p>Real journeys start with a simple connection.</p>
            </div>

            <div className="br-testimonial-grid">
              {testimonials.map((item) => (
                <article className="br-testimonial" key={item.name}>
                  <div className="br-stars">
                    <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                  </div>
                  <p>"{item.quote}"</p>
                  <div className="br-testimonial-user">
                    <span className="br-avatar">{item.initials}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="br-cta-section">
          <div className="br-container br-cta">
            <div>
              <Tag className="br-section-tag light">READY TO RIDE?</Tag>
              <h2>Your next journey starts here.</h2>
              <p>Find a seat, share a seat, and make every trip count.</p>
            </div>
            <div className="br-cta-actions">
              <Button size="large" type="primary" onClick={findRide}>
                Find a Ride <ArrowRightOutlined />
              </Button>
              <Button size="large" className="br-cta-outline" onClick={offerRide}>
                Offer a Ride
              </Button>
            </div>
          </div>
        </section>
      </main>
</div>
  );
}

export default HomePage;
