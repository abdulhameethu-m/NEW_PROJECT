require("dotenv").config();

const http = require("http");
const { createApp } = require("./app");
const { connectDb } = require("./config/db");
const { logger } = require("./utils/logger");
const { ensurePredefinedStaffRoles } = require("./modules/staff/services/role.service");
const { initializeSettlementScheduler, shutdown } = require("./jobs/settlement.job");

async function start() {
  await connectDb();
  await ensurePredefinedStaffRoles();

  // Initialize settlement scheduler
  try {
    const schedulerStatus = await initializeSettlementScheduler();
    logger.info("Settlement scheduler initialized", schedulerStatus);
  } catch (error) {
    logger.error("Failed to initialize settlement scheduler", {
      error: error?.message,
    });
    // Non-fatal error - app can continue without scheduler
  }

  const app = createApp();
  const server = http.createServer(app);

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    logger.info(`API listening on port ${port}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(async () => {
      await shutdown();
      process.exit(0);
    });
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully");
    server.close(async () => {
      await shutdown();
      process.exit(0);
    });
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", err);
  process.exit(1);
});

