import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Modal, Input, Button, Spin, Space, message, App } from "antd";
import { SearchOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { reverseGeocode, serviceAreaError, NOMINATIM_COUNTRY_FILTER } from "../utils/geo.js";

const NOMINATIM_API = "https://nominatim.openstreetmap.org";

function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapController({ position, onMapClick }) {
  const map = useMap();

  // Leaflet measures its container on mount, which happens while the modal is
  // still animating open - re-measure once it has its real size so tiles load.
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], 13, { animate: true });
    }
  }, [position, map]);

  useEffect(() => {
    const handleClick = (e) => {
      onMapClick({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, onMapClick]);

  return null;
}

export default function LocationPickerModal({
  open,
  onCancel,
  onConfirm,
  initialPosition,
  // Where to center the map when nothing is selected yet (e.g. the ride's start).
  defaultCenter,
  title = "Select Location",
}) {
  const [position, setPosition] = useState(initialPosition || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const searchTimeoutRef = useRef(null);

  async function performSearch(query) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `${NOMINATIM_API}/search?q=${encodeURIComponent(query)}&format=json&limit=10${NOMINATIM_COUNTRY_FILTER}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      message.error("Failed to search locations");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchChange(e) {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }

  function selectSearchResult(result) {
    const newPosition = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      name: result.display_name,
    };
    setPosition(newPosition);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleMapClick(coords) {
    const outside = serviceAreaError(coords);
    if (outside) {
      message.error(outside);
      return;
    }
    setPosition(coords);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleConfirm() {
    if (!position) {
      message.warning("Please select a location on the map");
      return;
    }

    setConfirming(true);
    try {
      let name = position.name;

      // Points clicked on the map have no name yet; looking it up also gives
      // the country, so a spot just across the border is caught precisely.
      if (!name) {
        try {
          const place = await reverseGeocode(position.latitude, position.longitude);
          const outside = serviceAreaError({ ...position, countryCode: place.countryCode });
          if (outside) {
            message.error(outside);
            return;
          }
          name = place.name;
        } catch (err) {
          name = `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
        }
      }

      onConfirm({
        latitude: position.latitude,
        longitude: position.longitude,
        name,
      });
    } finally {
      setConfirming(false);
    }
  }

  const center = position
    ? [position.latitude, position.longitude]
    : defaultCenter
      ? [Number(defaultCenter.latitude), Number(defaultCenter.longitude)]
      : [28.6139, 77.209]; // Default to Delhi

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={900}
      styles={{ body: { padding: 16, maxHeight: "70vh", overflowY: "auto" } }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          style={{ background: "#0f766e" }}
          onClick={handleConfirm}
          loading={confirming}
          disabled={!position}
        >
          Confirm Location
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div style={{ position: "relative" }}>
          <Input
            placeholder="Search for a location..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={handleSearchChange}
            allowClear
            size="large"
          />
          {searching && (
            <div style={{ position: "absolute", right: 40, top: 8 }}>
              <Spin size="small" />
            </div>
          )}
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #d9d9d9",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 1100, // above Leaflet's zoom controls (z-index 1000)
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 13,
                    color: "#262626",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.target.style.background = "white")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <EnvironmentOutlined style={{ marginTop: 2, color: "#0f766e" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{result.display_name.split(",")[0]}</div>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                        {result.display_name.split(",").slice(1, 3).join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: "min(400px, 45vh)", borderRadius: 8, overflow: "hidden" }}>
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController position={position} onMapClick={handleMapClick} />
            {position && <Marker position={[position.latitude, position.longitude]} icon={pinIcon("#0f766e")} />}
          </MapContainer>
        </div>

        {position && (
          <div
            style={{
              padding: 12,
              background: "var(--chrome-tint)",
              border: "1px solid var(--chrome-border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
              <EnvironmentOutlined style={{ color: "#2DD4BF", marginTop: 3, flexShrink: 0 }} />
              <strong style={{ overflowWrap: "anywhere", lineHeight: 1.4 }}>{position.name || "Selected Location"}</strong>
            </div>
            <div style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </div>
            <div style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 12 }}>
              Click on the map to adjust the marker or search above to find a different location.
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
}
