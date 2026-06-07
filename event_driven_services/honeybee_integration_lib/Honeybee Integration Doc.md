# Honeybee Integration - Technical Guide

## Overview

Honeybee is a robust, event-driven job scheduling microservice built by Veevo Tech on modern archeticture. This document provides technical details on integrating your Node.js applications with the Honeybee service using our lightweight client library.

## Core Architecture & Message Flow

Honeybee solves a key limitation in distributed systems by providing scheduling capabilities that RabbitMQ doesn't natively support:

1. **Job Scheduling**: Your application publishes jobs to Honeybee with a specific queue name and execution parameters (immediate, delayed, or recurring)
2. **Job Management**: Honeybee stores and manages these jobs scheduling and persistence
3. **Message Publishing**: When a job is ready to execute, Honeybee:
   - Creates a queue with the same name in RabbitMQ (if it doesn't exist)
   - Publishes the job's data object as a message to the RabbitMQ queue
4. **Message Processing**: Your application needs to implement consumers that:
   - Listen to the RabbitMQ queues with the same names used in job scheduling
   - Process the incoming messages when Honeybee publishes them

This architecture separates scheduling concerns (handled by Honeybee+Redis) from message delivery (handled by RabbitMQ), allowing each system to focus on its strengths.

```
┌───────────────┐       ┌───────────────────┐       ┌───────────────┐
│               │ Job   │                   │ Timed │               │
│ Your App      │──────▶│ Honeybee + Redis  │──────▶│ RabbitMQ      │
│ (Publisher)   │       │ (Scheduler)       │       │ (Broker)      │
└───────────────┘       └───────────────────┘       └───────┬───────┘
        ▲                                                   │
        │                                                   │
        └───────────────────────────────────────────────────┘
                              Message
                          
┌───────────────┐                                   
│ Your App      │ Listens to RabbitMQ queues        
│ (Consumer)    │ with same names as those used     
└───────────────┘ when publishing to Honeybee       
```

## Integration Steps

### 1. Add the Library to Your Project

Copy the `honeybee_integration_lib` directory into your project or install it locally:

```bash
# Option 1: Copy the directory
cp -r /path/to/honeybee_integration_lib /path/to/your-project/

# Option 2: Install locally
npm install --save /path/to/honeybee_integration_lib
```

### 2. Install Dependencies

The library requires axios:

```bash
npm install axios
```

### 3. Import and Initialize

```javascript
// Import the client
const HoneybeeClient = require('honeybee-client');
// Or if using a direct path:
// const HoneybeeClient = require('./path/to/honeybee_integration_lib/src/honeybee');

// Create an instance
const honeybee = new HoneybeeClient({
  // Optional: Override the default Honeybee service URL if needed
  baseUrl: 'http://your-honeybee-server:3005/honeybee/api',
  
  // Optional: Add custom headers for tracking or authorization
  headers: {
    'X-Request-ID': 'request-id',
    'Authorization': 'Bearer your-token'
  }
});
```

### 4. Schedule Jobs

The library provides several methods for different scheduling needs:

#### Immediate Execution

```javascript
await honeybee.enqueue({
  queueName: 'emailQueue',
  jobName: 'sendEmail',
  data: {
    // Job payload
  }
});
```

#### Delayed Execution

```javascript
// Delay by time
await honeybee.scheduleIn(
  {
    queueName: 'emailQueue',
    jobName: 'sendEmail',
    data: { /* payload */ }
  },
  3600000 // 1 hour in milliseconds
);

// Execute at specific time (converted to delay internally)
await honeybee.scheduleAt(
  {
    queueName: 'emailQueue',
    jobName: 'sendEmail',
    data: { /* payload */ }
  },
  '2024-12-24T10:00:00Z' // ISO timestamp
);
```

#### Recurring Jobs

```javascript
await honeybee.recurring(
  {
    queueName: 'reportQueue',
    jobName: 'dailyReport',
    data: { /* payload */ }
  },
  '0 8 * * *', // Cron expression
  {
    limit: 30 // Optional: stop after 30 executions
  }
);
```

### 5. Job Management

#### Delete a Job

```javascript
await honeybee.deleteJob('queueName', 'jobId');
```

#### Update a Job

```javascript
await honeybee.updateJob({
  queueName: 'emailQueue',
  jobId: 'job-id',
  data: { /* updated data */ },
  options: { /* updated options */ }
});
```

### 6. Implement RabbitMQ Consumers

To actually process the jobs when they're ready to execute, implement RabbitMQ consumers in your application:

```javascript
// Example using amqplib
const amqp = require('amqplib');

async function setupConsumers() {
  // Connect to RabbitMQ
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  // Define queues to listen to (must match queue names used with Honeybee)
  const queueNames = ['emailQueue', 'reportQueue', 'notificationQueue'];
  
  for (const queueName of queueNames) {
    // Ensure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Set up consumer
    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          // Parse the message payload
          const jobData = JSON.parse(msg.content.toString());
          
          console.log(`Processing job from queue ${queueName}:`, jobData);
          
          // Process job based on job type
          if (queueName === 'emailQueue') {
            await processEmailJob(jobData);
          } else if (queueName === 'reportQueue') {
            await processReportJob(jobData);
          } // ... other job types
          
          // Acknowledge successful processing
          channel.ack(msg);
        } catch (error) {
          console.error(`Error processing job from ${queueName}:`, error);
          // Reject and potentially requeue
          channel.nack(msg, false, false);
        }
      }
    });
    
    console.log(`Consumer set up for queue: ${queueName}`);
  }
}

// Example job processors
async function processEmailJob(jobData) {
  // Handle email sending logic
  console.log('Sending email to:', jobData.to);
}

async function processReportJob(jobData) {
  // Handle report generation logic
  console.log('Generating report:', jobData.reportType);
}

// Start consumers
setupConsumers().catch(console.error);
```

## Response Format

All successful API responses will have this structure:

```javascript
{
  STATUS: 'SUCCESSFUL',
  JOB_ID: '123',
  ERROR_FILTER: '',
  ERROR_CODE: '',
  ERROR_DESCRIPTION: ''
}
```

Error responses will have:

```javascript
{
  STATUS: 'ERROR',
  JOB_ID: '',
  ERROR_FILTER: 'VALIDATION_ERROR',
  ERROR_CODE: 'BULLMQ-VALIDATION-ERROR',
  ERROR_DESCRIPTION: 'Error details message'
}
```

## API Limitations

Note the following limitations of the Honeybee API:

1. **Scheduling by timestamp**: The API doesn't directly support scheduling by timestamp. The client converts timestamps to delay values.
2. **Timezone support**: The API doesn't support timezone configuration for recurring jobs.
3. **End date for recurring jobs**: End date specification is not supported. Use the `limit` parameter instead.

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```javascript
try {
  await honeybee.enqueue({ /* job config */ });
} catch (error) {
  // Log the error
  console.error('Failed to schedule job:', error.message);
  
  // Implement fallback if appropriate
  if (error.message.includes('Connection Error')) {
    // Handle connection issues
  }
}
```

### 2. Job Idempotency

For critical operations, use custom job IDs to ensure idempotency:

```javascript
await honeybee.enqueue({
  queueName: 'paymentQueue',
  jobName: 'processPayment',
  data: { /* payment data */ },
  jobId: `payment-${transactionId}` // Custom ID prevents duplicate processing
});
```

### 3. Prioritization

Use priority levels appropriately:

- **1-3**: Critical operations (password resets, OTPs)
- **4-7**: Standard operations (regular emails, reports)
- **8-10**: Background tasks (cleanup, archiving)

```javascript
// High priority job
await honeybee.enqueue({
  queueName: 'emailQueue',
  jobName: 'sendPasswordReset',
  data: { /* data */ },
  options: {
    priority: 1 // Highest priority
  }
});
```

### 4. Retry Configuration

Configure retry attempts and backoff for failure-prone operations:

```javascript
await honeybee.enqueue({
  queueName: 'integrationQueue',
  jobName: 'syncWithExternalApi',
  data: { /* data */ },
  options: {
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: 'exponential', // exponential, fixed
      delay: 5000 // Starting delay in ms
    }
  }
});
```

### 5. Queue Naming Consistency

Use consistent queue names across both Honeybee job scheduling and RabbitMQ consumer setup:

```javascript
// When scheduling a job with Honeybee
await honeybee.enqueue({
  queueName: 'critical-notifications',  // This exact name must be used in RabbitMQ consumer
  jobName: 'sendAlert',
  data: { /* data */ }
});

// When setting up RabbitMQ consumer
await channel.assertQueue('critical-notifications', { durable: true });
```

## Common Integration Patterns

### 1. User Onboarding Sequence

Schedule a series of timed welcome emails:

```javascript
// Welcome email immediately
await honeybee.enqueue({
  queueName: 'emailQueue',
  jobName: 'sendWelcomeEmail',
  data: { userId }
});

// Follow-up after 2 days
await honeybee.scheduleIn(
  {
    queueName: 'emailQueue',
    jobName: 'sendFollowupEmail',
    data: { userId, template: 'day-2-followup' }
  },
  2 * 24 * 60 * 60 * 1000 // 2 days
);

// Feature highlight after 5 days
await honeybee.scheduleIn(
  {
    queueName: 'emailQueue',
    jobName: 'sendFeatureHighlightEmail',
    data: { userId, template: 'feature-highlight' }
  },
  5 * 24 * 60 * 60 * 1000 // 5 days
);
```

### 2. Report Generation System

Schedule recurring reports:

```javascript
// Daily summary at 6 AM
await honeybee.recurring(
  {
    queueName: 'reportQueue',
    jobName: 'generateDailySummary',
    data: { format: 'pdf', recipients: ['team@example.com'] }
  },
  '0 6 * * *' // 6 AM daily
);

// Weekly detailed report on Mondays at 7 AM
await honeybee.recurring(
  {
    queueName: 'reportQueue',
    jobName: 'generateWeeklyReport',
    data: { format: 'excel', recipients: ['management@example.com'] }
  },
  '0 7 * * 1' // 7 AM on Mondays
);
```

### 3. Notification System

Handle different types of notifications with appropriate priorities:

```javascript
// Critical alert - highest priority
await honeybee.enqueue({
  queueName: 'notificationQueue',
  jobName: 'sendAlert',
  data: { userId, message: 'Security alert: New login detected' },
  options: { priority: 1 }
});

// Standard notification - medium priority
await honeybee.enqueue({
  queueName: 'notificationQueue',
  jobName: 'sendNotification',
  data: { userId, message: 'Your order has shipped' },
  options: { priority: 5 }
});

// Marketing notification - low priority
await honeybee.enqueue({
  queueName: 'notificationQueue',
  jobName: 'sendNotification',
  data: { userId, message: 'Check out our latest products' },
  options: { priority: 9 }
});
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify Honeybee service is running
   - Check network connectivity and firewall settings
   - Ensure correct baseUrl is configured

2. **Job Not Running**
   - Verify queue exists in Honeybee service
   - Check for typos in queue or job names
   - Ensure proper job configuration

3. **Recurring Jobs Not Executing**
   - Validate cron expression syntax
   - Verify worker processes are running

4. **Validation Errors**
   - Check API parameter format requirements
   - Ensure all required fields are provided
   - Verify job options match the API specifications

5. **RabbitMQ Queue Missing**
   - Ensure consumers are set up before jobs execute
   - Verify RabbitMQ connection settings
   - Check that queue names match exactly between Honeybee and consumers

### Debugging

For debugging integration issues:

```javascript
// Add request ID for tracing
const honeybee = new HoneybeeClient({
  headers: {
    'X-Request-ID': 'debug-session-123',
    'X-Debug': 'true'
  }
});

// Log complete request/response cycle
try {
  console.log('Enqueueing job with data:', jobData);
  const result = await honeybee.enqueue(jobData);
  console.log('Job enqueued successfully:', result);
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    response: error.response?.data
  });
}
```

## Contact

For further assistance or to report issues, contact the Honeybee team. 