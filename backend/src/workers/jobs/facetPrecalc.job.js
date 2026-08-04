const { facetQueue } = require('../queue');
const { Product } = require('../../models/Product');
const { redisClient } = require('../../utils/cache');
const logger = require('../../utils/logger'); // Assuming this exists

const FACET_CACHE_KEY = 'global:facets:precalculated';

// Job Processor
facetQueue.process(async (job) => {
  try {
    if (logger && logger.info) {
      logger.info('Starting facet pre-calculation job...');
    }

    // In a real application, you'd calculate facets per category.
    // Here we'll calculate global facets as an example of background processing.
    const facets = await calculateGlobalFacets();

    if (redisClient && redisClient.status === 'ready') {
      await redisClient.set(FACET_CACHE_KEY, JSON.stringify(facets));
    }

    if (logger && logger.info) {
      logger.info('Facet pre-calculation completed successfully.');
    }
    
    return { success: true, facetsCalculated: facets.length };
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Failed to pre-calculate facets:', error.message);
    } else {
      console.error('Failed to pre-calculate facets:', error.message);
    }
    throw error;
  }
});

async function calculateGlobalFacets() {
  // Simple example: group by category and count
  const results = await Product.aggregate([
    { $match: { status: 'APPROVED', isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  return results.map(r => ({
    name: r._id,
    count: r.count
  }));
}

// Add a repeatable job (e.g., every hour)
const scheduleFacetJob = async () => {
  // Clear any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await facetQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await facetQueue.removeRepeatableByKey(job.key);
  }

  // Add the job
  await facetQueue.add({}, {
    repeat: { cron: '0 * * * *' } // Every hour
  });
};

module.exports = {
  scheduleFacetJob
};
