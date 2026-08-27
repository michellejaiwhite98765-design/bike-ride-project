// Holds the latest known positions per active ride and user, kept in process memory.
// Fine for a single backend instance; if you ever run more than one instance
// behind a load balancer, swap this for Redis (set/get) and add the
// socket.io-redis-adapter so broadcasts reach every instance.
const latestByRide = new Map();

export const locationStore = {
  set(rideId, userId, position) {
    const rideKey = `${rideId}:${userId}`;
    latestByRide.set(rideKey, position);
  },
  get(rideId, userId) {
    const rideKey = `${rideId}:${userId}`;
    return latestByRide.get(rideKey) || null;
  },
  getAllForRide(rideId) {
    const result = {};
    for (const [key, position] of latestByRide.entries()) {
      if (key.startsWith(`${rideId}:`)) {
        const userId = key.split(":")[1];
        result[userId] = position;
      }
    }
    return result;
  },
  clear(rideId) {
    const keysToDelete = [];
    for (const key of latestByRide.keys()) {
      if (key.startsWith(`${rideId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => latestByRide.delete(key));
  },
};
