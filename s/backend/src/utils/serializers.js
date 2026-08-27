export function serializeUser(user) {
  if (!user) return null;
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}
