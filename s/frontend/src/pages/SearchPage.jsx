// import { useState } from "react";
// import { Card, Form, DatePicker, TimePicker, InputNumber, Select, Button, List, Empty, App } from "antd";
// import { SearchOutlined } from "@ant-design/icons";
// import dayjs from "dayjs";
// import { rideService } from "../services/rideService.js";
// import LocationFields from "../components/LocationFields.jsx";
// import RideCard from "../components/ride/RideCard.jsx";

// export default function SearchPage() {
//   const { message } = App.useApp();
//   const [form] = Form.useForm();
//   const [results, setResults] = useState(null);
//   const [loading, setLoading] = useState(false);

//   async function onFinish(values) {
//     setLoading(true);
//     try {
//       const params = {
//         sourceLatitude: values.sourceLatitude,
//         sourceLongitude: values.sourceLongitude,
//         destinationLatitude: values.destinationLatitude,
//         destinationLongitude: values.destinationLongitude,
//         date: values.date.format("YYYY-MM-DD"),
//         seats: values.seats,
//       };
//       if (values.time) params.time = values.time.format("HH:mm");
//       if (values.rideType) params.rideType = values.rideType;

//       const data = await rideService.search(params);
//       setResults(data);
//     } catch (err) {
//       message.error(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div>
//       <h2>Find a Ride</h2>
//       <Card>
//         <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ seats: 1 }} requiredMark={false}>
//           <LocationFields prefix="source" label="From" placeholder="Where are you starting from?" />
//           <LocationFields prefix="destination" label="To" placeholder="Where are you going?" />

//           <Form.Item name="date" label="Date" rules={[{ required: true }]}>
//             <DatePicker size="large" style={{ width: "100%" }} disabledDate={(d) => d && d < dayjs().startOf("day")} />
//           </Form.Item>
//           <Form.Item name="time" label="Preferred time (optional)">
//             <TimePicker size="large" style={{ width: "100%" }} format="HH:mm" minuteStep={5} />
//           </Form.Item>
//           <Form.Item name="seats" label="Passengers" rules={[{ required: true }]}>
//             <InputNumber size="large" min={1} max={6} style={{ width: "100%" }} />
//           </Form.Item>
//           <Form.Item name="rideType" label="Ride type (optional)">
//             <Select
//               size="large"
//               allowClear
//               placeholder="Any"
//               options={[
//                 { value: "WITHOUT_TIP", label: "Without tip" },
//                 { value: "WITH_TIP", label: "With tip" },
//               ]}
//             />
//           </Form.Item>

//           <Button type="primary" htmlType="submit" size="large" icon={<SearchOutlined />} loading={loading} style={{ background: "#0f766e" }}>
//             Find Rides
//           </Button>
//         </Form>
//       </Card>

//       {results !== null && (
//         <div style={{ marginTop: 24 }}>
//           <h3>{results.length} ride(s) found</h3>
//           {results.length === 0 ? (
//             <Empty description="No matching rides. Try a wider radius or different time." />
//           ) : (
//             <List
//               grid={{ gutter: 16, xs: 1, sm: 2 }}
//               dataSource={results}
//               renderItem={(ride) => (
//                 <List.Item>
//                   <RideCard ride={ride} showMatch />
//                 </List.Item>
//               )}
//             />
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import { Card, Form, DatePicker, TimePicker, InputNumber, Select, Button, List, Empty, App } from "antd";
import { SearchOutlined, EnvironmentOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../services/rideService.js";
import LocationFields from "../components/LocationFields.jsx";
import RideCard from "../components/ride/RideCard.jsx";
import FindRideMap from "../components/FindRideMap.jsx";
import "../styles/find-ride.css";

export default function SearchPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const sourceName = Form.useWatch("sourceName", form);
  const sourceLatitude = Form.useWatch("sourceLatitude", form);
  const sourceLongitude = Form.useWatch("sourceLongitude", form);
  const destinationName = Form.useWatch("destinationName", form);
  const destinationLatitude = Form.useWatch("destinationLatitude", form);
  const destinationLongitude = Form.useWatch("destinationLongitude", form);
  const sourceLocation = { name: sourceName, lat: Number(sourceLatitude), lng: Number(sourceLongitude) };
  const destinationLocation = { name: destinationName, lat: Number(destinationLatitude), lng: Number(destinationLongitude) };

  async function onFinish(values) {
    setLoading(true);
    try {
      const params = {
        sourceLatitude: Number(values.sourceLatitude),
        sourceLongitude: Number(values.sourceLongitude),
        destinationLatitude: Number(values.destinationLatitude),
        destinationLongitude: Number(values.destinationLongitude),
        date: values.date.format("YYYY-MM-DD"),
        seats: values.seats,
      };
      if (values.time) params.time = values.time.format("HH:mm");
      if (values.rideType) params.rideType = values.rideType;

      const data = await rideService.search(params);
      setResults(data);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const setMapLocation = (prefix, location) => {
    form.setFieldsValue({
      [`${prefix}Name`]: location.name,
      [`${prefix}Latitude`]: location.lat,
      [`${prefix}Longitude`]: location.lng,
    });
  };

  const swapLocations = () => {
    const values = form.getFieldsValue([
      "sourceName", "sourceLatitude", "sourceLongitude",
      "destinationName", "destinationLatitude", "destinationLongitude",
    ]);
    form.setFieldsValue({
      sourceName: values.destinationName,
      sourceLatitude: values.destinationLatitude,
      sourceLongitude: values.destinationLongitude,
      destinationName: values.sourceName,
      destinationLatitude: values.sourceLatitude,
      destinationLongitude: values.sourceLongitude,
    });
  };

  return (
    <main className="br-findride-page">
      <section className="br-findride-hero">
        {/* <div>
          <span className="br-findride-kicker">SMART RIDE SEARCH</span>
          <h1>Find a Ride</h1>
          <p>Choose your pickup and destination. Explore nearby rides before you book.</p>
        </div> */}
        <div className="br-findride-hero-badge"><span /> Live network</div>
      </section>

      <section className="br-findride-layout">
        <Card className="br-findride-form-card" bordered={false}>
          <div className="br-findride-form-title">
            <div className="br-findride-icon"><EnvironmentOutlined /></div>
            <div><span>Your journey</span><h2>Where are you going?</h2></div>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ seats: 1 }} requiredMark={false}>
            <LocationFields prefix="source" label="Pickup location" placeholder="Choose your starting point" />
            <div className="br-findride-swap"><button type="button" onClick={swapLocations} aria-label="Swap locations"><SwapOutlined /></button></div>
            <LocationFields prefix="destination" label="Destination" placeholder="Choose where you are going" />

            <div className="br-findride-form-grid">
              <Form.Item name="date" label="Travel date" rules={[{ required: true, message: "Select a date" }]}>
                <DatePicker size="large" style={{ width: "100%" }} disabledDate={(d) => d && d < dayjs().startOf("day")} />
              </Form.Item>
              <Form.Item name="time" label="Preferred time">
                <TimePicker size="large" style={{ width: "100%" }} format="HH:mm" minuteStep={5} />
              </Form.Item>
              <Form.Item name="seats" label="Passengers" rules={[{ required: true, message: "Select passengers" }]}>
                <InputNumber size="large" min={1} max={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="rideType" label="Ride preference">
                <Select size="large" allowClear placeholder="Any ride" options={[
                  { value: "WITHOUT_TIP", label: "No tip" },
                  { value: "WITH_TIP", label: "Tip included" },
                ]} />
              </Form.Item>
            </div>

            <Button className="br-findride-search-btn" type="primary" htmlType="submit" size="large" icon={<SearchOutlined />} loading={loading}>
              Search nearby rides
            </Button>
          </Form>

          <div className="br-findride-form-note"><span>✦</span> We'll show rides that fit your route and travel time.</div>
        </Card>

        <FindRideMap source={sourceLocation} destination={destinationLocation} results={results || []} onMapLocationSelect={setMapLocation} />
      </section>

      {results !== null && (
        <section className="br-findride-results">
          <div className="br-findride-results-head">
            <div><span className="br-findride-kicker">MATCHED FOR YOU</span><h2>{results.length} ride{results.length === 1 ? "" : "s"} found</h2></div>
            <span className="br-findride-results-pill">Nearby & route matched</span>
          </div>
          {results.length === 0 ? (
            <Empty description="No matching rides. Try a wider radius or another time." />
          ) : (
            <List grid={{ gutter: [18, 18], xs: 1, sm: 2, lg: 3 }} dataSource={results} renderItem={(ride) => <List.Item><RideCard ride={ride} showMatch /></List.Item>} />
          )}
        </section>
      )}
    </main>
  );
}