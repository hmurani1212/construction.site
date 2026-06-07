/**
 * Basic usage examples for the Honeybee client
 */

// Import the Honeybee client
const HoneybeeClient = require('../src/honeybee');

// Create a new client instance
const honeybee = new HoneybeeClient({
  // Optional: Override the default base URL
  // baseUrl: 'http://your-honeybee-server:3005/honeybee/api',
  
  // Optional: Add custom headers
  headers: {
    'X-Request-ID': '123e4567-e89b-12d3-a456-426614174000'
  }
});

// Example 1: Schedule an immediate job
async function scheduleImmediateJob() {
  try {
    const result = await honeybee.enqueue({
      queueName: 'emailQueue',
      jobName: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Welcome!',
        body: 'Thank you for signing up!'
      },
      options: {
        priority: 2  // Higher priority (lower number)
      }
    });
    
    console.log('Immediate job scheduled:', result);
    return result.JOB_ID;
  } catch (error) {
    console.error('Failed to schedule immediate job:', error.message);
  }
}

// Example 2: Schedule a delayed job (runs after 1 hour)
async function scheduleDelayedJob() {
  try {
    const result = await honeybee.scheduleIn(
      {
        queueName: 'reportQueue',
        jobName: 'generateReport',
        data: {
          reportType: 'monthly',
          month: '2024-12'
        }
      },
      3600000  // 1 hour in milliseconds
    );
    
    console.log('Delayed job scheduled:', result);
    return result.JOB_ID;
  } catch (error) {
    console.error('Failed to schedule delayed job:', error.message);
  }
}

// Example 3: Schedule a job at a specific time (converted to delay internally)
async function scheduleJobAtSpecificTime() {
  try {
    // Schedule for tomorrow at 2 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const result = await honeybee.scheduleAt(
      {
        queueName: 'cleanupQueue',
        jobName: 'purgeTemporaryFiles',
        data: {
          olderThan: '30d'
        }
      },
      tomorrow.toISOString()
    );
    
    console.log('Job scheduled at specific time (converted to delay):', result);
    return result.JOB_ID;
  } catch (error) {
    console.error('Failed to schedule job at specific time:', error.message);
  }
}

// Example 4: Set up a recurring job (daily at 8 AM)
async function setupRecurringJob() {
  try {
    const result = await honeybee.recurring(
      {
        queueName: 'reportQueue',
        jobName: 'dailySalesReport',
        data: {}
      },
      '0 8 * * *',  // Cron expression: At 8:00 AM every day
      {
        limit: 30  // Stop after 30 executions
      }
    );
    
    console.log('Recurring job set up:', result);
    return result.JOB_ID;
  } catch (error) {
    console.error('Failed to set up recurring job:', error.message);
  }
}

// Example 5: Delete a job
async function deleteJob(jobId) {
  try {
    const result = await honeybee.deleteJob('reportQueue', jobId);
    console.log('Job deleted:', result);
  } catch (error) {
    console.error('Failed to delete job:', error.message);
  }
}

// Example 6: Update a job
async function updateJob(jobId) {
  try {
    const result = await honeybee.updateJob({
      queueName: 'reportQueue',
      jobId: jobId,
      data: {
        subject: 'UPDATED: Welcome to our service!'
      },
      options: {
        priority: 1  // Increase priority
      }
    });
    
    console.log('Job updated:', result);
  } catch (error) {
    console.error('Failed to update job:', error.message);
  }
}

// Run examples
(async () => {
  // Run the immediate job example
  const jobId =   await scheduleDelayedJob();
  
  if (jobId) {
    // If job was created successfully, update it
    await updateJob(jobId);
    
    // Then delete it
    await deleteJob(jobId);
  }
  
  // Schedule other example jobs
  await scheduleImmediateJob();
  await scheduleJobAtSpecificTime();
  await setupRecurringJob();
})(); 