// Test rides are scheduled days ahead, so let them be started at any time.
process.env.RIDE_EARLY_START_MINUTES = String(60 * 24 * 365);
