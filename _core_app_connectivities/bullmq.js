/***
 * BULLMQ CONNECTION HANDLING
 *
 * Configure BullMQ for background job processing.
 * Uses Redis connection for job queue management.
 *
 * CONFIGURATION
 * ------------
 * This module provides:
 * - Queue management (get or create queues)
 * - Worker management (process jobs from queues)
 * - Job enqueueing with support for recurring jobs
 * - Job processing with retry logic
 *
 **********/

const { Queue, Worker } = require('bullmq');
const redis_client = require('./redis');

/**
 * BullMQ Queue and Worker Manager
 * 
 * This class manages BullMQ queues and workers for background job processing.
 * It provides methods to create queues, enqueue jobs, and process jobs.
 */
class BullMQManager {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.connection = redis_client;
  }

  /**
   * Get or create a queue
   * 
   * @param {string} queueName - The name of the queue
   * @returns {Queue} The BullMQ Queue instance
   */
  getQueue(queueName) {
    if (!this.queues.has(queueName)) {
      console.log(`FILE: bullmq.js | getQueue | Creating new queue '${queueName}'`);
      
      const queue = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      });

      this.queues.set(queueName, queue);
      console.log(`FILE: bullmq.js | getQueue | Queue '${queueName}' created successfully`);
    }

    return this.queues.get(queueName);
  }

  /**
   * Create a worker for a queue
   * 
   * @param {string} queueName - The name of the queue
   * @param {Function} processor - The job processor function
   * @param {Object} options - Worker options (concurrency, etc.)
   */
  createWorker(queueName, processor, options = {}) {
    if (this.workers.has(queueName)) {
      console.log(`FILE: bullmq.js | createWorker | Worker for queue '${queueName}' already exists`);
      return this.workers.get(queueName);
    }

    console.log(`FILE: bullmq.js | createWorker | Creating worker for queue '${queueName}'`);

    const worker = new Worker(
      queueName,
      async (job) => {
        console.log(`FILE: bullmq.js | Worker | Processing job '${job.id}' from queue '${queueName}'`);
        try {
          if (!job) {
            throw new Error('Job is undefined');
          }
          const result = await processor(job);
          console.log(`FILE: bullmq.js | Worker | Completed job '${job.id}' from queue '${queueName}'`);
          return result;
        } catch (error) {
          console.error(`FILE: bullmq.js | Worker | Error processing job '${job.id}' from queue '${queueName}':`, error);
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: options.concurrency || 1,
        limiter: options.limiter,
      }
    );

    // Worker event listeners
    worker.on('active', (job) => {
      console.log(`FILE: bullmq.js | Worker | Job '${job.id}' (${job.name}) started processing in queue '${queueName}'`);
    });

    worker.on('completed', (job, result) => {
      console.log(`FILE: bullmq.js | Worker | Job '${job.id}' (${job.name}) completed successfully in queue '${queueName}'`);
    });

    worker.on('failed', (job, err) => {
      const jobId = job?.id || 'unknown';
      const jobName = job?.name || 'unknown';
      console.error(`FILE: bullmq.js | Worker | Job '${jobId}' (${jobName}) failed in queue '${queueName}':`, err);
    });

    worker.on('error', (err) => {
      console.error(`FILE: bullmq.js | Worker | Worker error in queue '${queueName}':`, err);
    });

    worker.on('stalled', (jobId) => {
      console.warn(`FILE: bullmq.js | Worker | Job '${jobId}' stalled in queue '${queueName}'`);
    });

    this.workers.set(queueName, worker);
    console.log(`FILE: bullmq.js | createWorker | Worker for queue '${queueName}' created successfully`);

    return worker;
  }

  /**
   * Enqueue a job to a queue
   * 
   * @param {string} queueName - The name of the queue
   * @param {string} jobName - The name of the job
   * @param {Object} data - Job data
   * @param {Object} options - Job options (delay, repeat, priority, etc.)
   * @returns {Promise<Job>} The enqueued job
   */
  async enqueueJob(queueName, jobName, data = {}, options = {}) {
    const queue = this.getQueue(queueName);

    const jobOptions = {
      jobId: options.jobId,
      delay: options.delay,
      priority: options.priority,
      attempts: options.attempts,
    };

    // Handle repeat options
    if (options.repeat) {
      if (options.repeat.pattern) {
        // Cron pattern
        jobOptions.repeat = {
          pattern: options.repeat.pattern,
          tz: 'UTC',
        };
        if (options.repeat.limit) {
          jobOptions.repeat.limit = options.repeat.limit;
        }
      } else if (options.repeat.every) {
        // Repeat every X milliseconds
        jobOptions.repeat = {
          every: options.repeat.every,
        };
        if (options.repeat.limit) {
          jobOptions.repeat.limit = options.repeat.limit;
        }
      }
    }

    console.log(`FILE: bullmq.js | enqueueJob | Enqueuing job '${jobName}' to queue '${queueName}'`);
    const job = await queue.add(jobName, data, jobOptions);
    console.log(`FILE: bullmq.js | enqueueJob | Job '${job.id}' (${jobName}) enqueued successfully`);

    return job;
  }

  /**
   * Get job by ID
   * 
   * @param {string} queueName - The name of the queue
   * @param {string} jobId - The job ID
   * @returns {Promise<Job>} The job or null if not found
   */
  async getJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  /**
   * Remove a job from a queue
   * 
   * @param {string} queueName - The name of the queue
   * @param {string} jobId - The job ID
   */
  async removeJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`FILE: bullmq.js | removeJob | Job '${jobId}' removed from queue '${queueName}'`);
    }
  }

  /**
   * Get all queue names
   * 
   * @returns {Array<string>} Array of queue names
   */
  getQueueNames() {
    return Array.from(this.queues.keys());
  }

  /**
   * Close all queues and workers
   * Used for graceful shutdown
   */
  async close() {
    console.log('FILE: bullmq.js | close | Closing all queues and workers');

    // Close all workers
    for (const [queueName, worker] of this.workers.entries()) {
      console.log(`FILE: bullmq.js | close | Closing worker for queue '${queueName}'`);
      await worker.close();
    }
    this.workers.clear();

    // Close all queues
    for (const [queueName, queue] of this.queues.entries()) {
      console.log(`FILE: bullmq.js | close | Closing queue '${queueName}'`);
      await queue.close();
    }
    this.queues.clear();

    console.log('FILE: bullmq.js | close | All queues and workers closed');
  }
}

// Export singleton instance
const bullmq_manager = new BullMQManager();

module.exports = bullmq_manager;

