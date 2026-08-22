import React from "react";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  GlobalOutlined,
  SafetyOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltFilled,
  UserOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Input, Select, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const popularRoutes = [
  {
    from: "Madurai",
    to: "Coimbatore",
    time: "Today · 8:30 AM",
    price: "₹350",
    seats: "2 seats left",
    rating: "4.9",
    driver: "Arun Kumar",
    initials: "AK",
  },
  {
    from: "Chennai",
    to: "Pondicherry",
    time: "Tomorrow · 7:00 AM",
    price: "₹280",
    seats: "3 seats left",
    rating: "4.8",
    driver: "Priya S.",
    initials: "PS",
  },
  {
    from: "Bengaluru",
    to: "Mysuru",
    time: "Sat · 9:00 AM",
    price: "₹220",
    seats: "1 seat left",
    rating: "5.0",
    driver: "Vijay R.",
    initials: "VR",
  },
];

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

function HomePage() {
  const navigate = useNavigate();

  const findRide = () => navigate("/search");
  const offerRide = () => navigate("/rides/create");

  return (
    <div className="br-home">
<main>
        <section className="br-hero br-hero-embedded">
          <div className="br-hero-glow br-glow-one" />
          <div className="br-hero-glow br-glow-two" />

          <div className="br-container br-hero-grid br-hero-grid-embedded">
            <div className="br-hero-copy">
              <Tag className="br-eyebrow">
                <ThunderboltFilled /> Smarter journeys, together
              </Tag>

              <h1>
                Your journey.
                <br />
                <span>Your ride.</span>
                <br />
                Your community.
              </h1>

              <p>
                Find affordable rides, share your empty seats, and travel with people
                heading your way.
              </p>

              <div className="br-hero-buttons">
                <Button type="primary" size="large" onClick={findRide}>
                  Find a Ride <ArrowRightOutlined />
                </Button>
                <Button size="large" className="br-outline-button" onClick={offerRide}>
                  Offer a Ride
                </Button>
              </div>

              <div className="br-trust-row">
                <span><CheckCircleFilled /> Verified members</span>
                <span><CheckCircleFilled /> Secure bookings</span>
                <span><CheckCircleFilled /> Live tracking</span>
              </div>
            </div>

            <div className="br-map-card" aria-label="BikeRide route preview">
              <div className="br-map-top">
                <div>
                  <span className="br-map-label">LIVE ROUTE PREVIEW</span>
                  <strong>Explore rides near you</strong>
                </div>
                <span className="br-map-status"><span /> Live</span>
              </div>

              <div className="br-map">
                <div className="br-map-water water-a" />
                <div className="br-map-water water-b" />
                <div className="br-map-road road-1" />
                <div className="br-map-road road-2" />
                <div className="br-map-road road-3" />
                <div className="br-map-road road-4" />
                <div className="br-map-road road-5" />
                <div className="br-map-route" />

                <div className="br-map-pin pin-a"><EnvironmentOutlined /></div>
                <div className="br-map-pin pin-b"><EnvironmentOutlined /></div>
                <div className="br-map-pin pin-c"><EnvironmentOutlined /></div>

                <div className="br-map-mini-card">
                  <div className="br-avatar">AK</div>
                  <div>
                    <strong>Madurai → Coimbatore</strong>
                    <span>₹350 · 2 seats left</span>
                  </div>
                  <ArrowRightOutlined />
                </div>
              </div>

              <div className="br-map-bottom">
                <span><EnvironmentOutlined /> 24 rides nearby</span>
                <button onClick={findRide}>View all <ArrowRightOutlined /></button>
              </div>
            </div>
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
                <Tag className="br-section-tag">POPULAR ROUTES</Tag>
                <h2>Rides people are taking.</h2>
                <p>Browse a few examples of trips from the BikeRide community.</p>
              </div>
              <Button type="link" onClick={findRide}>
                Explore all rides <ArrowRightOutlined />
              </Button>
            </div>

            <div className="br-route-grid">
              {popularRoutes.map((route) => (
                <article className="br-route-card" key={`${route.from}-${route.to}`}>
                  <div className="br-route-card-top">
                    <Tag color="blue">Available</Tag>
                    <span>{route.time}</span>
                  </div>

                  <div className="br-route-path">
                    <div className="br-route-dot start" />
                    <div className="br-route-line" />
                    <div className="br-route-dot end" />
                    <div>
                      <strong>{route.from}</strong>
                      <span>{route.to}</span>
                    </div>
                  </div>

                  <div className="br-route-meta">
                    <span><UserOutlined /> {route.seats}</span>
                    <span><StarFilled /> {route.rating}</span>
                  </div>

                  <div className="br-route-footer">
                    <div className="br-driver">
                      <span className="br-avatar small">{route.initials}</span>
                      <div>
                        <strong>{route.driver}</strong>
                        <span>Verified host</span>
                      </div>
                    </div>
                    <strong className="br-price">{route.price}</strong>
                  </div>

                  <Button block onClick={findRide}>
                    View Ride <ArrowRightOutlined />
                  </Button>
                </article>
              ))}
            </div>
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
                  <p>“{item.quote}”</p>
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
