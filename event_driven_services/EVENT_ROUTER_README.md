# Event Router Service

A centralized event routing system that consolidates multiple event listeners into a single event listener, optimizing application performance and reducing memory overhead.

## Key Features

- **Event Consolidation**: Combines multiple listeners into a single listener for each event type
- **Routing System**: Delivers events to the appropriate handlers based on matching criteria
- **Handler Registration**: Simple API to register event handlers with filtering options
- **Performance Optimization**: Reduces memory usage and improves event handling performance
- **Standardized API**: Consistent interface for event handling across the application

## Development Standards

**IMPORTANT**: When using or extending this Event Router Service, strictly adhere to the Node.js Development Standards outlined in [nodejs-development-standards.md](../nodejs-development-standards.md). These standards ensure consistency across the codebase and proper integration with existing systems.

Key points to remember:
- Use snake_case for all variables, functions, files, and directories
- Follow the established logging patterns (`FILE: file_name.js | function_name | message`)
- Use the core connectivity services from the `_core_app_connectivities` folder:
  - `emitter.js` - For event handling
  - `rabbitmq.js` - For queue operations
  - `memcache.js` - For caching operations
  - `db_mongo_mongoose.js` - For database operations
- Wrap all async operations in try-catch blocks with proper error logging
- Maintain the established directory structure
- Follow the class implementation pattern for services

The Event Router Service is built on top of these standards and extends the existing infrastructure. Any modifications or extensions should maintain this consistency.

## Implementation Standards

When implementing handlers for the Event Router, make sure to follow these standards-compliant examples:

### Handler Implementation

```javascript
// In a service file (e.g., user_management.service.js)
const event_router = require('../event_driven_services/event_router.service');

// Register a handler following the standards
event_router.register_handler('USER_CREATED', async (event_data) => {
  try {
    console.log(`FILE: user_management.service.js | USER_CREATED handler | Processing user: ${event_data.user_id}`);
    
    // Process event logic
    await send_welcome_email(event_data.email);
    
    console.log(`FILE: user_management.service.js | USER_CREATED handler | Successfully processed user: ${event_data.user_id}`);
  } catch (error) {
    console.error(`FILE: user_management.service.js | USER_CREATED handler | Error processing user: ${event_data.user_id}`, error);
    // Handle error appropriately
  }
});
```

### Event Emission

```javascript
// In a controller or service file
const eventEmitter = require('../_core_app_connectivities/emitter');

async function create_user(user_data) {
  try {
    console.log(`FILE: user.controller.js | create_user | Creating user`);
    
    // Create user in database
    const new_user = await user_model.create(user_data);
    
    // Emit event following the standards
    eventEmitter.emit('event_router', 'USER_CREATED', {
      user_id: new_user._id,
      email: new_user.email,
      created_at: new Date()
    });
    
    console.log(`FILE: user.controller.js | create_user | User created: ${new_user._id}`);
    return new_user;
  } catch (error) {
    console.error(`FILE: user.controller.js | create_user | Error creating user:`, error);
    throw error;
  }
}
```

### RabbitMQ Publisher Registration

```javascript
// In your initialization file or service
const event_router = require('../event_driven_services/event_router.service');

// Register a RabbitMQ publisher following the standards
function register_email_queue() {
  try {
    console.log(`FILE: email.service.js | register_email_queue | Registering email queue publisher`);
    
    event_router.register_rabbitmq_publisher('SEND_EMAIL', 'email_notifications_queue', {
      persistent: true,
      contentType: 'application/json'
    });
    
    console.log(`FILE: email.service.js | register_email_queue | Email queue publisher registered successfully`);
  } catch (error) {
    console.error(`FILE: email.service.js | register_email_queue | Error registering email queue publisher:`, error);
  }
}
```

### Middleware Implementation

```javascript
// In a middleware file or service initialization
const event_router = require('../event_driven_services/event_router.service');

// Register a middleware following the standards
function register_event_middleware() {
  try {
    console.log(`FILE: event.middleware.js | register_event_middleware | Registering event middleware`);
    
    event_router.use((event_id, event_data) => {
      // Add timestamp and request ID to all events
      return {
        ...event_data,
        processed_at: new Date().toISOString(),
        request_id: generate_request_id()
      };
    });
    
    console.log(`FILE: event.middleware.js | register_event_middleware | Event middleware registered successfully`);
  } catch (error) {
    console.error(`FILE: event.middleware.js | register_event_middleware | Error registering event middleware:`, error);
  }
}

function generate_request_id() {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}
```

## Architecture

The Event Router follows a simple but powerful architecture:

```
                    ┌─────────────────────┐
                    │                     │
                    │   Event Producer    │
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │                     │
                    │    Event Emitter    │
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────┐
│                                                   │
│                  Event Router                     │
│                                                   │
├───────────────┬─────────────────┬────────────────┤
│               │                 │                │
│   Middleware  │     Handlers    │  RabbitMQ      │
│               │                 │  Publishers    │
│               │                 │                │
└───────┬───────┴────────┬────────┴────────┬───────┘
        │                │                 │
        ▼                ▼                 ▼
┌───────────────┐ ┌─────────────┐  ┌─────────────────┐
│               │ │             │  │                 │
│ Processed     │ │ Handler 1   │  │ RabbitMQ Queue  │
│ Event Data    │ │ Handler 2   │  │                 │
│               │ │ ...         │  │                 │
└───────────────┘ └─────────────┘  └─────────────────┘
```

## Installation

No additional installation required! The Event Router Service is included in your application.

## Getting Started

### 1. Import Required Modules

First, you need to import the EventEmitter and the EventRouter in your file:

```javascript
const eventEmitter = require('../_core_app_connectivities/emitter');
const event_router = require('./event_driven_services/event_router.service');
```

The `eventEmitter` is used to emit events, while the `event_router` is used to register handlers for these events.

### 2. Register Event Handlers

You can register handlers that will be executed when specific events are emitted. Each handler is associated with an event ID (a string identifier).

#### Basic Handler Example

Here's how to register a simple handler for a user creation event:

```javascript
// Basic handler
event_router.register_handler('USER_CREATED', (event_data) => {
  console.log(`FILE: handler.js | USER_CREATED | User created: ${event_data.name}`);
  // Your handler logic here
});
```

In this example:
- `'USER_CREATED'` is the event ID
- The handler function receives `event_data` as its parameter, which contains the data passed when the event is emitted

#### Handler with Options

You can also provide options when registering a handler:

```javascript
// Handler with options
event_router.register_handler('CRITICAL_EVENT', critical_event_handler, { 
  priority: 1,         // Lower number = higher priority
  timeout: 5000,       // Timeout in milliseconds
  name: 'critical_handler'  // Name for debugging
});
```

In this example:
- `priority` determines the execution order when multiple handlers exist for the same event
- `timeout` sets a maximum execution time for the handler
- `name` provides a descriptive name for debugging purposes

### 3. Emit Events

To trigger events and their associated handlers, you emit events through the EventEmitter:

```javascript
// Emit an event with event ID and data
eventEmitter.emit('event_router', 'USER_CREATED', {
  id: '12345',
  name: 'John Doe',
  email: 'john@example.com'
});
```

When emitting events:
1. The first parameter is always `'event_router'` (the central event name that the router listens for)
2. The second parameter is the specific event ID (like `'USER_CREATED'`)
3. The third parameter is the event data (an object containing any information needed by handlers)

## Advanced Usage

### Using Middleware

Middleware functions are executed before the event reaches its handlers. They can transform the event data or perform additional operations for all events.

#### Adding Timestamp Middleware

This middleware adds a timestamp to every event that passes through the router:

```javascript
// Add timestamp to all events
event_router.use((event_id, event_data) => {
  return {
    ...event_data,
    processed_at: new Date().toISOString()
  };
});
```

The middleware function:
- Receives the `event_id` and `event_data` as parameters
- Must return the (possibly modified) event data
- Is executed in the order it was registered

#### Logging Middleware

Here's another middleware example that logs all events:

```javascript
// Log all events
event_router.use((event_id, event_data) => {
  console.log(`FILE: middleware.js | process_event | Processing event: ${event_id}`);
  return event_data;
});
```

### RabbitMQ Integration

The Event Router can automatically publish events to RabbitMQ queues. This is useful for processing events asynchronously or distributing them to other services.

#### Setting Up RabbitMQ Integration

Before using RabbitMQ integration, ensure that:
1. Your application has RabbitMQ configured (check `rabbitmq_ops` in the `_core_app_connectivities` folder)
2. The queues you want to publish to already exist or will be created automatically

#### Registering a RabbitMQ Publisher

Register a RabbitMQ publisher for a specific event ID:

```javascript
// Register a RabbitMQ publisher for an event
event_router.register_rabbitmq_publisher('SEND_EMAIL', 'email_queue', {
  persistent: true,
  contentType: 'application/json'
});
```

In this example:
- `'SEND_EMAIL'` is the event ID that will trigger publishing to RabbitMQ
- `'email_queue'` is the name of the RabbitMQ queue to publish to
- The third parameter contains RabbitMQ options like `persistent` and `contentType`

#### Publishing to RabbitMQ

When you emit an event with the registered event ID, it will automatically be published to the specified queue:

```javascript
// Emitting this event will automatically publish to the queue
eventEmitter.emit('event_router', 'SEND_EMAIL', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thank you for signing up.'
});
```

The Event Router:
1. Processes the event through any middleware
2. Executes any registered handlers
3. Publishes the event data to the RabbitMQ queue

### Setting Log Level

The Event Router has configurable logging levels to control how much information is logged:

```javascript
// Available levels: 'error', 'warn', 'info', 'debug'
event_router.set_log_level('debug');
```

Log levels in order of verbosity (from least to most):
- `'error'`: Only log errors
- `'warn'`: Log errors and warnings
- `'info'`: Log errors, warnings, and information messages
- `'debug'`: Log everything, including detailed debug information

## Migrating from Legacy Event Pattern

### Legacy Pattern

The old approach uses multiple listeners and switch statements:

```javascript
// Old approach with multiple listeners and switch statements
eventEmitter.on('wa_main_event_handler', (event_type, event_data) => {
  switch (event_type) {
    case 'archived_wa_template':
      // Handle archived_wa_template event
      break;
    case 'store_country_wise_states':
      // Handle store_country_wise_states event
      break;
    default:
      console.log(`FILE: handler.js | wa_main_event_handler | No handler for event type: ${event_type}`);
  }
});
```

This pattern:
- Creates a single large function with multiple responsibilities
- Makes it harder to add new event types
- Makes debugging more difficult
- Doesn't support priorities or timeouts

### New Pattern

The new pattern uses the Event Router to register separate handlers for each event type:

```javascript
// Register handler for each event type
event_router.register_handler('ARCHIVED_WA_TEMPLATE', (event_data) => {
  // Handle archived_wa_template event
});

event_router.register_handler('STORE_COUNTRY_WISE_STATES', (event_data) => {
  // Handle store_country_wise_states event
});

// Emit events
eventEmitter.emit('event_router', 'ARCHIVED_WA_TEMPLATE', event_data);
```

Benefits of the new pattern:
- Separate handlers for each event type
- Easier to add, remove, or modify handlers
- Support for priorities, timeouts, and middleware
- Better debugging and logging
- Clean separation of concerns

## Best Practices

1. **Use Consistent Event IDs**: Use UPPER_SNAKE_CASE for event IDs to maintain consistency.
   
   ```javascript
   // Good
   event_router.register_handler('USER_CREATED', user_created_handler);
   
   // Avoid
   event_router.register_handler('userCreated', user_created_handler);
   ```

2. **Set Proper Priorities**: Use priorities to control execution order when multiple handlers exist for one event.
   
   ```javascript
   // Database updates should happen before notifications
   event_router.register_handler('ORDER_PLACED', update_database, { priority: 1 });
   event_router.register_handler('ORDER_PLACED', send_notification, { priority: 2 });
   ```

3. **Add Timeouts**: Set timeouts for handlers that might take longer than expected.
   
   ```javascript
   // Set a 3-second timeout for API calls
   event_router.register_handler('EXTERNAL_API_CALL', api_handler, { timeout: 3000 });
   ```

4. **Validate Event Data**: Use middleware to validate event data before processing.
   
   ```javascript
   event_router.use((event_id, event_data) => {
     // Validate event data
     if (event_id === 'USER_CREATED' && !event_data.email) {
       console.warn(`FILE: validator.js | validate_event | Missing email in USER_CREATED event`);
     }
     return event_data;
   });
   ```

5. **Use Meaningful Names**: Give handlers meaningful names for better debugging.
   
   ```javascript
   event_router.register_handler('PAYMENT_PROCESSED', handle_payment, { 
     name: 'payment_receipt_generator' 
   });
   ```

6. **Handle Errors**: Always handle errors in your event handlers to prevent crashes.
   
   ```javascript
   event_router.register_handler('CRITICAL_OPERATION', async (event_data) => {
     try {
       await perform_critical_operation(event_data);
     } catch (error) {
       console.error(`FILE: operations.js | CRITICAL_OPERATION | Error in critical operation:`, error);
       // Take appropriate error-handling action
     }
   });
   ```

7. **Document Events**: Document all events your service emits or listens to.
   
   Create and maintain a list of all event IDs, their purposes, and the data they expect:
   ```javascript
   /**
    * Event: USER_CREATED
    * Description: Emitted when a new user is created
    * Expected Data:
    *   - id: string (user ID)
    *   - name: string (user's full name)
    *   - email: string (user's email address)
    *   - created_at: Date (creation timestamp)
    */
   ```

## API Reference

### `register_handler(event_id, handler_fn, options)`

Register a handler function for a specific event ID.

#### Parameters:
- `event_id` (string): The event identifier 
- `handler_fn` (function): The handler function that processes the event
- `options` (object, optional):
  - `priority` (number, default: 10): Lower number = higher priority
  - `timeout` (number, optional): Timeout in milliseconds
  - `name` (string, optional): Handler name for debugging

#### Example:
```javascript
event_router.register_handler('EVENT_ID', handler_function, {
  priority: 10, // (Default: 10) Lower number = higher priority
  timeout: null, // (Optional) Timeout in milliseconds
  name: 'custom_name' // (Optional) Name for debugging
});
```

### `unregister_handler(event_id, handler_fn)`

Unregister a handler function for a specific event ID.

#### Parameters:
- `event_id` (string): The event identifier
- `handler_fn` (function, optional): The handler function to remove (if not specified, removes all handlers)

#### Examples:
```javascript
// Unregister specific handler
event_router.unregister_handler('EVENT_ID', handler_function);

// Unregister all handlers for an event
event_router.unregister_handler('EVENT_ID');
```

### `register_rabbitmq_publisher(event_id, queue_name, options)`

Register a RabbitMQ publisher for a specific event ID.

#### Parameters:
- `event_id` (string): The event identifier
- `queue_name` (string): The RabbitMQ queue name
- `options` (object, optional): RabbitMQ publishing options

#### Example:
```javascript
event_router.register_rabbitmq_publisher('EVENT_ID', 'queue_name', {
  persistent: true,
  contentType: 'application/json'
  // Other RabbitMQ options
});
```

### `unregister_rabbitmq_publisher(event_id)`

Unregister a RabbitMQ publisher for a specific event ID.

#### Parameters:
- `event_id` (string): The event identifier

#### Example:
```javascript
event_router.unregister_rabbitmq_publisher('EVENT_ID');
```

### `use(middleware_fn)`

Register a middleware function that processes event data before handlers.

#### Parameters:
- `middleware_fn` (function): The middleware function
  - Should accept `(event_id, event_data)` parameters
  - Should return processed event data

#### Example:
```javascript
event_router.use((event_id, event_data) => {
  // Process event data
  return processed_event_data;
});
```

### `set_log_level(level)`

Set the log level for the router.

#### Parameters:
- `level` (string): Log level ('error', 'warn', 'info', 'debug')

#### Example:
```javascript
// Available levels: 'error', 'warn', 'info', 'debug'
event_router.set_log_level('debug');
```

## Examples

See the `event_router_example.js` file for complete examples of how to use the Event Router Service.

To examine this file:
```bash
# View the example file
cat node_clone/event_driven_services/event_router_example.js
```

The example file contains practical demonstrations of:
- Basic event handling
- Multiple handlers for a single event
- RabbitMQ integration
- Middleware usage
- Event emission patterns
- Migration examples
- Handler unregistration

## Troubleshooting and Implementation Checks

When implementing the Event Router or debugging issues, make sure to follow these guidelines:

### Naming Convention Checks

Ensure all variables, functions, and file names follow the snake_case convention as specified in the [nodejs-development-standards.md](../nodejs-development-standards.md):

```javascript
// Correct naming conventions
const event_router = require('../event_driven_services/event_router.service');
const user_service = require('../services/user.service');
const cache_key = `user_profile_${user_id}`;

// Incorrect naming conventions
const eventRouter = require('../event_driven_services/event_router.service'); // ❌
const userService = require('../services/user.service'); // ❌
const cacheKey = `user_profile_${user_id}`; // ❌
```

### Logging Standard Checks

Ensure all logs follow the standard format with file name, function/event name, and descriptive message:

```javascript
// Correct logging format
console.log(`FILE: event_router.service.js | register_handler | Registered handler for event: ${event_id}`);
console.error(`FILE: event_router.service.js | process_event | Error processing event: ${event_id}`, error);

// Incorrect logging format
console.log(`Registered handler for event: ${event_id}`); // ❌
console.error('Error processing event', error); // ❌
```

### Error Handling Checks

Ensure all async operations are wrapped in try-catch blocks with proper error logging:

```javascript
// Correct error handling
event_router.register_handler('IMPORTANT_EVENT', async (event_data) => {
  try {
    await process_event(event_data);
  } catch (error) {
    console.error(`FILE: my_service.js | IMPORTANT_EVENT handler | Error:`, error);
    // Additional error handling logic
  }
});

// Incorrect error handling
event_router.register_handler('IMPORTANT_EVENT', async (event_data) => {
  await process_event(event_data); // ❌ Missing try-catch
});
```

### Common Issues

1. **Event handlers not executing**:
   - Check that you're emitting to the correct 'event_router' channel
   - Verify the event ID matches exactly what was registered
   - Check for errors in the console logs

2. **RabbitMQ messages not being published**:
   - Check that RabbitMQ connection is established before registering publishers
   - Verify the queue name exists
   - Look for RabbitMQ connection errors in logs

3. **Middleware not processing events**:
   - Ensure middleware is registered before any handlers are executed
   - Check that middleware is returning the processed event data

### Debugging Tips

When troubleshooting, enable debug-level logging to see all event processing details:

```javascript
// Set log level to debug for detailed logging
event_router.set_log_level('debug');
```

Use appropriate console logs in your handlers for debugging, following the standard format:

```javascript
event_router.register_handler('DEBUG_EVENT', (event_data) => {
  console.log(`FILE: debug.service.js | DEBUG_EVENT | Received event data:`, event_data);
  // Handler logic
});
``` 