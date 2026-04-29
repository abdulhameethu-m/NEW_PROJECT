const dotenv = require("dotenv");

if (!global.__grmEnvLoaded) {
  dotenv.config({ override: true });
  global.__grmEnvLoaded = true;
}
