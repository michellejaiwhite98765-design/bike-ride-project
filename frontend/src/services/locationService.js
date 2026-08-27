export const locationService = {
  async requestPermission() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported on this device");
    }

    try {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              reject(new Error("Location permission denied. Please enable location access in your browser settings."));
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              reject(new Error("Location information is unavailable."));
            } else {
              reject(new Error("Failed to get location: " + err.message));
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (err) {
      throw err;
    }
  },

  startWatching(onSuccess, onError, options = {}) {
    if (!navigator.geolocation) {
      onError("Geolocation not supported");
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onSuccess({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          timestamp: pos.timestamp,
        });
      },
      onError,
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        maximumAge: options.maximumAge ?? 2000,
        timeout: options.timeout ?? 10000,
      }
    );

    return watchId;
  },

  stopWatching(watchId) {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180) / Math.PI;
  },
};
