require("dotenv").config();

const http = require("http");
const { createApp } = require("./app");
const { connectDb } = require("./config/db");
const { logger } = require("./utils/logger");

async function start() {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    logger.info(`API listening on port ${port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", err);
  process.exit(1);
});

