/***
 * BULL BOARD ADMIN DASHBOARD
 *
 * This file sets up the Bull Board dashboard for monitoring BullMQ queues.
 * Access the dashboard at: http://localhost:PORT/admin/queues
 *
 * CONFIGURATION
 * ------------
 * The dashboard displays:
 * - All active queues
 * - Job status (waiting, active, completed, failed, delayed, paused)
 * - Job details (data, options, logs, errors)
 * - Queue statistics
 *
 **********/

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const bullmq_manager = require('./_core_app_connectivities/bullmq');
const { Queue } = require('bullmq');
const redis_client = require('./_core_app_connectivities/redis');

/**
 * Initialize Bull Board Dashboard
 * 
 * This function sets up the Bull Board UI for monitoring BullMQ queues.
 * It automatically discovers all queues from the bullmq_manager and displays them.
 * 
 * @param {Object} app - Express application instance
 * @param {string} basePath - Base path for the dashboard (default: '/admin/queues')
 */
function initializeBullBoard(app, basePath = '/admin/queues') {
  try {
    console.log('FILE: admin_board.js | initializeBullBoard | Initializing Bull Board dashboard');

    // Create Express adapter for Bull Board
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(basePath);

    // Known queues that should be displayed in the dashboard
    const knownQueues = [
      'weekly-notifications',
      'account-summary',
      'order-updates'
    ];
    
    // Get all queue names from bullmq_manager (may be empty if queues haven't been created yet)
    const queueNames = bullmq_manager.getQueueNames();
    
    // Create BullMQ adapters for queues
    const queues = [];
    const queueInstances = new Map();
    
    // Add queues that exist in bullmq_manager
    queueNames.forEach((queueName) => {
      try {
        const queue = bullmq_manager.getQueue(queueName);
        queueInstances.set(queueName, queue);
        queues.push(new BullMQAdapter(queue));
        console.log(`FILE: admin_board.js | initializeBullBoard | Added queue from manager: ${queueName}`);
      } catch (error) {
        console.error(`FILE: admin_board.js | initializeBullBoard | Error getting queue '${queueName}':`, error);
      }
    });
    
    // Add known queues that might not exist yet (they will be created when accessed)
    knownQueues.forEach((queueName) => {
      if (!queueNames.includes(queueName) && !queueInstances.has(queueName)) {
        try {
          // Create a new queue instance for the dashboard
          // This queue will connect to Redis and show existing jobs even if the worker hasn't started
          const queue = new Queue(queueName, {
            connection: redis_client,
          });
          queueInstances.set(queueName, queue);
          queues.push(new BullMQAdapter(queue));
          console.log(`FILE: admin_board.js | initializeBullBoard | Added known queue: ${queueName}`);
        } catch (error) {
          console.error(`FILE: admin_board.js | initializeBullBoard | Error creating queue '${queueName}':`, error);
        }
      }
    });

    // Create Bull Board with all queues
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
      queues,
      serverAdapter: serverAdapter,
    });

    // Route to add a new queue dynamically
    app.post(`${basePath}/add/:queueName`, async (req, res) => {
      const queueName = req.params.queueName;
      console.log(`FILE: admin_board.js | POST ${basePath}/add/:queueName | Attempting to add new queue: ${queueName}`);

      try {
        // Check if queue already exists
        if (queueInstances.has(queueName)) {
          res.status(400).json({ message: `Queue '${queueName}' already exists.` });
          return;
        }

        // Create new queue instance
        const newQueue = new Queue(queueName, {
          connection: redis_client,
        });
        const newQueueAdapter = new BullMQAdapter(newQueue);

        queueInstances.set(queueName, newQueue);
        queues.push(newQueueAdapter);
        setQueues([...queues]); // Update the Bull Board dashboard

        res.status(200).json({ message: `Queue '${queueName}' added successfully.` });
        console.log(`FILE: admin_board.js | POST ${basePath}/add/:queueName | Queue '${queueName}' added dynamically.`);
      } catch (error) {
        console.error(`FILE: admin_board.js | POST ${basePath}/add/:queueName | Error adding queue:`, error);
        res.status(500).json({ message: `Error adding queue '${queueName}': ${error.message}` });
      }
    });

    // Route to remove a queue dynamically
    app.post(`${basePath}/remove/:queueName`, async (req, res) => {
      const queueName = req.params.queueName;
      console.log(`FILE: admin_board.js | POST ${basePath}/remove/:queueName | Attempting to remove queue: ${queueName}`);

      try {
        // Check if queue exists
        if (!queueInstances.has(queueName)) {
          res.status(400).json({ message: `Queue '${queueName}' does not exist.` });
          return;
        }

        const queueInstance = queueInstances.get(queueName);

        // Find and remove the adapter from queues array
        const adapterIndex = queues.findIndex((adapter) => {
          try {
            // Try to match by getting queue from bullmq_manager or checking queue instances
            const managerQueue = bullmq_manager.getQueue(queueName);
            return managerQueue === queueInstance;
          } catch {
            // If not in manager, check if it's in our instances map
            return queueInstances.get(queueName) === queueInstance;
          }
        });

        if (adapterIndex !== -1) {
          queues.splice(adapterIndex, 1);
        }

        // Close the queue and remove it from instances
        await queueInstance.close(); // This stops the queue from processing further jobs
        queueInstances.delete(queueName);
        setQueues([...queues]); // Update the Bull Board dashboard

        res.status(200).json({ message: `Queue '${queueName}' removed successfully.` });
        console.log(`FILE: admin_board.js | POST ${basePath}/remove/:queueName | Queue '${queueName}' removed dynamically.`);
      } catch (error) {
        console.error(`FILE: admin_board.js | POST ${basePath}/remove/:queueName | Error removing queue:`, error);
        res.status(500).json({ message: `Error removing queue '${queueName}': ${error.message}` });
      }
    });

    // Serve Bull Board UI
    app.use(basePath, serverAdapter.getRouter());

    console.log(`FILE: admin_board.js | initializeBullBoard | Bull Board dashboard initialized at ${basePath}`);
    console.log(`FILE: admin_board.js | initializeBullBoard | Access the dashboard at: http://localhost:${process.env.PORT || 6160}${basePath}`);
  } catch (error) {
    console.error('FILE: admin_board.js | initializeBullBoard | Error initializing Bull Board:', error);
  }
}

module.exports = { initializeBullBoard };

