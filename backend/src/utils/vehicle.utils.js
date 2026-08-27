export const normalizeRegistrationNumber = (registrationNumber) => {
  if (!registrationNumber) {
    return null;
  }

  return String(registrationNumber)
    .replace(/[\s-]/g, "")
    .toUpperCase();
};