# Honeybee Client

A lightweight Node.js client library for interacting with the Honeybee job scheduling service.

## Installation

Since this is an internal library, simply copy the `honeybee_integration_lib` directory into your project, then install dependencies:

```bash
cd your-project
npm install axios
```

Or if you prefer, you can install it locally:

```bash
cd your-project
npm install --save ./path/to/honeybee_integration_lib
```

## Quick Start

```javascript
const HoneybeeClient = require('honeybee-client');

// Create a client with default connection to Honeybee service
const honeybee = new HoneybeeClient();

// Schedule a job to run immediately
async function sendWelcomeEmail() {
  try {
    const result = await honeybee.enqueue({
      queueName: 'emailQueue',
      jobName: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Welcome!',
        body: 'Thank you for signing up!'
      }
    });
    console.log(`Job scheduled with ID: ${result.JOB_ID}`);
  } catch (error) {
    console.error('Failed to schedule job:', error.message);
  }
}
```

## API Reference

### Creating a Client

```javascript
const honeybee = new HoneybeeClient({
  baseUrl: 'http://your-honeybee-server:3005/honeybee/api', // Optional
  headers: {                                                // Optional
    'X-Request-ID': '123e4567-e89b-12d3-a456-426614174000'
  }
});
```

### Scheduling Jobs

#### Immediate Jobs

```javascript
const result = await honeybee.enqueue({
  queueName: 'emailQueue',    // Required: Target queue name
  jobName: 'sendEmail',       // Required: Job type identifier
  data: { /* payload */ },    // Required: Data for the worker
  options: {                  // Optional: Job configuration
    priority: 2,              // Priority (1 = highest)
    attempts: 5,              // Retry attempts
    backoff: {                // Backoff strategy
      type: 'exponential',
      delay: 2000
    }
  },
  jobId: 'custom-id-123',     // Optional: Custom ID for idempotency
  metadata: { /* metadata */ } // Optional: For tracking/logging
});
```

#### Delayed Jobs

```javascript
// Run after delay (milliseconds)
const result = await honeybee.scheduleIn(
  {
    queueName: 'reportQueue',
    jobName: 'generateReport',
    data: { /* payload */ }
  },
  3600000 // 1 hour
);

// Run at specific time (converted to delay internally)
const result = await honeybee.scheduleAt(
  {
    queueName: 'reportQueue',
    jobName: 'generateReport',
    data: { /* payload */ }
  },
  '2024-12-24T08:00:00Z' // ISO timestamp
);
```

#### Recurring Jobs (Cron)

```javascript
const result = await honeybee.recurring(
  {
    queueName: 'reportQueue',
    jobName: 'dailySalesReport',
    data: { /* payload */ }
  },
  '0 8 * * *',  // Cron expression: At 8:00 AM every day
  {
    limit: 30   // Stop after 30 executions
  }
);
```

### Managing Jobs

#### Delete a Job

```javascript
const result = await honeybee.deleteJob('queueName', 'jobId');
```

#### Update a Job

```javascript
const result = await honeybee.updateJob({
  queueName: 'emailQueue',
  jobId: 'job-id-to-update',
  data: { /* updated payload */ },  // Will be merged with existing
  options: { /* updated options */ } // Will be merged with existing
});
```

## Response Format

All successful responses will have this structure:

```javascript
{
  STATUS: 'SUCCESSFUL',
  JOB_ID: '123',
  ERROR_FILTER: '',
  ERROR_CODE: '',
  ERROR_DESCRIPTION: ''
}
```

## Error Handling

All methods return promises that may reject with errors. Always wrap calls in try/catch blocks:

```javascript
try {
  const result = await honeybee.enqueue({ /* job config */ });
  // Handle success
} catch (error) {
  // Handle error
  console.error('Failed to schedule job:', error.message);
}
```

## Examples

See the `examples` directory for complete usage examples.

Run the basic example:

```bash
cd honeybee_integration_lib
npm run example
```

## Common Use Cases

### Send Welcome Email After 24 Hours

```javascript
await honeybee.scheduleIn(
  {
    queueName: 'emailQueue',
    jobName: 'sendWelcomeEmail',
    data: {
      userId: 'user123',
      template: 'welcome-followup'
    }
  },
  86400000 // 24 hours
);
```

### Generate Daily Report at 2 AM

```javascript
await honeybee.recurring(
  {
    queueName: 'reportQueue',
    jobName: 'dailySalesReport',
    data: {
      format: 'pdf',
      recipients: ['admin@example.com']
    }
  },
  '0 2 * * *' // 2 AM daily
);
```

### High-Priority Password Reset Email

```javascript
await honeybee.enqueue({
  queueName: 'emailQueue',
  jobName: 'sendPasswordReset',
  data: {
    userId: 'user123',
    resetToken: 'abc123'
  },
  options: {
    priority: 1 // Highest priority
  }
});
```

## License

Internal use only. 