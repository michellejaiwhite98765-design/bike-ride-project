import { bearingDeg, bearingAlignment } from "../utils/geo.js";

const WEIGHTS = { source: 30, destination: 30, time: 20, route: 10, rating: 10 };
const NEUTRAL_RATING_SCORE = WEIGHTS.rating * 0.7; // riders with no ratings yet aren't unfairly ranked last

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * matchScore = sourceScore + destinationScore + timeScore + routeScore + riderRatingScore
 * Each component is scaled to its WEIGHTS share so the total is a 0-100 match percentage.
 */
export function scoreRide({ ride, distances, search, matchingConfig, riderRating }) {
  const { sourceDistanceKm, destinationDistanceKm } = distances;

  const sourceScore = Math.max(0, WEIGHTS.source * (1 - sourceDistanceKm / matchingConfig.pickupRadiusKm));
  const destinationScore = Math.max(
    0,
    WEIGHTS.destination * (1 - destinationDistanceKm / matchingConfig.destinationRadiusKm)
  );

  let timeScore = WEIGHTS.time;
  if (search.time) {
    const diffMinutes = Math.abs(timeToMinutes(ride.departureTime) - timeToMinutes(search.time));
    timeScore = Math.max(0, WEIGHTS.time * (1 - diffMinutes / matchingConfig.timeWindowMinutes));
  }

  const passengerBearing = bearingDeg(
    search.sourceLatitude,
    search.sourceLongitude,
    search.destinationLatitude,
    search.destinationLongitude
  );
  const rideBearing = bearingDeg(
    Number(ride.sourceLatitude),
    Number(ride.sourceLongitude),
    Number(ride.destinationLatitude),
    Number(ride.destinationLongitude)
  );
  const routeScore = WEIGHTS.route * Math.max(0, bearingAlignment(passengerBearing, rideBearing));

  const riderRatingScore = riderRating != null ? WEIGHTS.rating * (riderRating / 5) : NEUTRAL_RATING_SCORE;

  const matchScore = sourceScore + destinationScore + timeScore + routeScore + riderRatingScore;

  return {
    matchScore: Math.round(matchScore),
    matchPercentage: Math.round(matchScore),
    breakdown: {
      sourceScore: Math.round(sourceScore),
      destinationScore: Math.round(destinationScore),
      timeScore: Math.round(timeScore),
      routeScore: Math.round(routeScore),
      riderRatingScore: Math.round(riderRatingScore),
    },
  };
}
