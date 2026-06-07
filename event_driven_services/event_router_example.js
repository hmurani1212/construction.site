/**
 * Event Router Example
 * -------------------
 * 
 * This file demonstrates how to use the event_router.service.js library.
 * It shows typical patterns and best practices for registering and triggering events.
 */

// Import dependencies
const eventEmitter = require('../_core_app_connectivities/emitter');
const eventRouter = require('./event_router.service');
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');

// Set log level (optional)
eventRouter.setLogLevel('debug'); // Use 'error', 'warn', 'info', 'debug'

/**
 * Example 1: Basic Event Handler
 * ------------------------------
 * Register a simple handler for a user creation event
 */
eventRouter.registerHandler('USER_CREATED', (eventData) => {
  console.log(`User created: ${eventData.name} (ID: ${eventData.id})`);
  // Perform actions like sending welcome email, etc.
});

/**
 * Example 2: Multiple Handlers for a Single Event
 * ----------------------------------------------
 * You can register multiple handlers for the same event.
 * They will execute in order based on priority.
 */
// This handler has priority 1, so it runs first
eventRouter.registerHandler('ACCOUNT_ACTIVATED', (eventData) => {
  console.log(`Account ${eventData.accountId} activated - Updating database status`);
  // Update account status in database
}, { priority: 1, name: 'database_update' });

// This handler has priority 5 (default is 10), so it runs second
eventRouter.registerHandler('ACCOUNT_ACTIVATED', (eventData) => {
  console.log(`Account ${eventData.accountId} activated - Sending notification`);
  // Send notification to user
}, { priority: 5, name: 'notification_sender' });

/**
 * Example 3: RabbitMQ Integration
 * ------------------------------
 * Register a RabbitMQ publisher for an event
 */
eventRouter.registerRabbitMQPublisher('SEND_EMAIL', 'email_notifications_queue', {
  persistent: true,
  contentType: 'application/json'
});

/**
 * Example 4: Using Middleware
 * --------------------------
 * Middleware functions process event data before it reaches handlers
 */
eventRouter.use((eventId, eventData) => {
  // Add timestamp to all events
  return {
    ...eventData,
    processedAt: new Date().toISOString()
  };
});

eventRouter.use((eventId, eventData) => {
  // Log all events (could also handle this with log level)
  console.log(`Processing event: ${eventId}`);
  return eventData;
});

/**
 * Example 5: Handler with Timeout
 * ------------------------------
 * Register a handler with a timeout to prevent long-running operations
 */
eventRouter.registerHandler('API_REQUEST', async (eventData) => {
  // Simulate a potentially slow operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`API request processed: ${eventData.endpoint}`);
}, { timeout: 3000 }); // Will fail if takes longer than 3000ms

/**
 * Example 6: Demonstrating How to Emit Events
 * ------------------------------------------
 * This is how you would emit events in your application code
 */

// Emit a simple event
function createUser(userData) {
  // Business logic to create user...
  const userId = '12345';
  
  // Emit event with the event ID and event data
  eventEmitter.emit('event_router', 'USER_CREATED', {
    id: userId,
    name: userData.name,
    email: userData.email,
    createdAt: new Date()
  });
  
  return userId;
}

// Emit an event that triggers RabbitMQ publishing
function sendEmail(recipient, subject, body) {
  eventEmitter.emit('event_router', 'SEND_EMAIL', {
    to: recipient,
    subject: subject,
    body: body,
    sentAt: new Date()
  });
}

/**
 * Example 7: Migrating from Existing Event Pattern
 * ----------------------------------------------
 * This shows how to migrate from the old pattern to the new pattern
 */

// Old pattern:
// eventEmitter.on('wa_main_event_handler', (eventType, eventData) => {
//   if (eventType === 'archived_wa_template') {
//     // Handle archived_wa_template event
//   }
// });

// New pattern:
eventRouter.registerHandler('ARCHIVED_WA_TEMPLATE', async (eventData) => {
  const template_id = eventData.template_id;
  const template_name = eventData.template_name;
  const ref_meta_template_id = eventData.ref_meta_template_id;
  const account_id = eventData.account_id;

  try {
    // Logic to archive template (previously in events_manager.service.js)
    const wa_template_services = require("../services/template.service");
    let response = await wa_template_services.archived_template(
      template_id, 
      template_name, 
      ref_meta_template_id, 
      account_id
    );
    console.log(`Template archived: ${template_name}`, response);
  } catch (error) {
    console.error(`Error archiving template: ${template_name}`, error);
  }
});

// Demonstration of how to emit this event
function archiveTemplate(templateData) {
  eventEmitter.emit('event_router', 'ARCHIVED_WA_TEMPLATE', {
    template_id: templateData.id,
    template_name: templateData.name,
    ref_meta_template_id: templateData.metaId,
    account_id: templateData.accountId
  });
}

/**
 * Example 8: Unregistering Handlers
 * -------------------------------
 * You can unregister handlers when they're no longer needed
 */
const tempHandler = (eventData) => {
  console.log('This is a temporary handler');
};

// Register a handler
eventRouter.registerHandler('TEMP_EVENT', tempHandler);

// Later, unregister it
// eventRouter.unregisterHandler('TEMP_EVENT', tempHandler);

// Or unregister all handlers for an event
// eventRouter.unregisterHandler('TEMP_EVENT');

// Export functions for demonstration purposes
module.exports = {
  createUser,
  sendEmail,
  archiveTemplate
}; 