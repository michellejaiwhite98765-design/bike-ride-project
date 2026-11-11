// Tests set each ride's route themselves; never call the external routing server.
process.env.AUTO_ACCEPT_REQUESTS = "false";
process.env.ROUTING_ENABLED = "false";
process.env.RIDE_START_MAX_DISTANCE_M = "0";
