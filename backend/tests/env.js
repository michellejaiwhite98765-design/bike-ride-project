// Test rides are scheduled days ahead, so let them be started at any time.
process.env.RIDE_EARLY_START_MINUTES = String(60 * 24 * 365);
// Tests control each ride's route themselves (routePath, or the straight-line
// fallback); don't call the external routing server from the test suite.
process.env.ROUTING_ENABLED = "false";
