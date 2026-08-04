const Queue = require('bull');
const logger = require('../utils/logger'); // assuming logger exists

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

function createQueue(name) {
  const queue = new Queue(name, redisUrl, { defaultJobOptions });

  queue.on('error', (err) => {
    if (logger && logger.error) {
      logger.error(`Queue error [${name}]:`, err.message);
    } else {
      console.error(`Queue error [${name}]:`, err.message);
    }
  });

  queue.on('failed', (job, err) => {
    if (logger && logger.error) {
      logger.error(`Job failed [${name}] ID ${job.id}:`, err.message);
    } else {
      console.error(`Job failed [${name}] ID ${job.id}:`, err.message);
    }
  });

  return queue;
}

const queues = {
  facetQueue: createQueue('facet-precalculation'),
};

module.exports = queues;
