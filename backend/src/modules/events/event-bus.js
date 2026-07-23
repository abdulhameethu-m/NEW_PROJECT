const EventEmitter = require("events");
const Queue = require("bull");
const { logger } = require("../../utils/logger");
const emitter = new EventEmitter();
const handlers = new Map();
let queue = null;
let queueUnavailable = false;

function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
function registerHandler(eventName, handler) {
  const existing = handlers.get(eventName) || [];
  existing.push(handler);
  handlers.set(eventName, existing);
}
async function dispatch(eventName, payload) {
  const registered = handlers.get(eventName) || [];
  for (const handler of registered) {
    await handler(payload);
  }
}
function initializeEventBus() {
  if (queue || queueUnavailable) return queue;
  if (process.env.REDIS_DISABLED === "true") {
    logger.info("Influencer event queue disabled; using in-process emitter", { source: "event-bus" });
    return null;
  }

  try {
    queue = new Queue("influencer-events", getRedisConfig());
    // Bull creates its client lazily.  A missing local Redis instance used to
    // make tracking requests fail after their database write, producing a 500
    // and leaving the browser to retry the click path.  Events are optional
    // for request completion, so fail over to the in-process dispatcher.
    queue.on("error", (error) => {
      logger.warn("Influencer event queue unavailable; using in-process dispatcher", {
        source: "event-bus",
        error: error?.message,
      });
      queueUnavailable = true;
      queue = null;
    });
    queue.process(async (job) => {
      await dispatch(job.data.eventName, job.data.payload);
    });
    queue.on("failed", (job, error) => {
      logger.error("Influencer event job failed", {
        source: "event-bus",
        eventName: job?.data?.eventName,
        jobId: job?.id,
        error: error?.message,
      });
    });
    logger.info("Influencer event queue initialized", { source: "event-bus" });
  } catch (error) {
    logger.warn("Influencer event queue unavailable, using in-process emitter", {
      source: "event-bus",
      error: error?.message,
    });
  }
  return queue;
}
async function emitDomainEvent(eventName, payload = {}, options = {}) {
  const eventPayload = {
    ...payload,
    emittedAt: new Date(),
  };
  emitter.emit(eventName, eventPayload);
  if (!queue || queueUnavailable) {
    await dispatch(eventName, eventPayload);
    return { queued: false };
  }

  try {
    const job = await Promise.race([
      queue.add(
        { eventName, payload: eventPayload },
        {
          attempts: Number(options.attempts || 3),
          backoff: { type: "exponential", delay: 1500 },
          removeOnComplete: true,
          removeOnFail: false,
          jobId: options.jobId,
        }
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Event queue enqueue timed out")), 750)),
    ]);

    return { queued: true, jobId: job.id };
  } catch (error) {
    logger.warn("Influencer event enqueue failed; using in-process dispatcher", {
      source: "event-bus",
      eventName,
      error: error?.message,
    });
    queueUnavailable = true;
    queue = null;
    await dispatch(eventName, eventPayload);
    return { queued: false };
  }
}

async function shutdownEventBus() {
  if (queue) {
    await queue.close();
    queue = null;
  }
  queueUnavailable = false;
}

module.exports = {
  initializeEventBus,
  registerHandler,
  emitDomainEvent,
  shutdownEventBus,
};