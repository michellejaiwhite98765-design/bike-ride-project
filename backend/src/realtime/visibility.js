// Who may see whose live location on a ride:
//  - the rider sees everyone (their passengers' positions, to find them);
//  - a passenger sees only the rider and themselves, never other passengers.
export function visibleLocations(allLocations, { userId, isOwner }) {
  if (isOwner) return allLocations;
  const visible = {};
  for (const [id, point] of Object.entries(allLocations || {})) {
    if (point.userType === "rider" || id === userId) visible[id] = point;
  }
  return visible;
}
