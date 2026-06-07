# Data Pulse Service

A centralized analytics reporting system for Node.js applications that simplifies tracking events, metrics, and user activity for analytics purposes.

## Key Features

- **Central Analytics Reporting**: Single service for all analytics reporting needs
- **Event-Driven Integration**: Report analytics via events from anywhere in the application
- **Direct Function Calls**: Alternatively use direct function calls for reporting analytics
- **RabbitMQ Integration**: Reliable message delivery through RabbitMQ queue
- **Configurable Aggregation**: Support for various aggregation levels (minutes, hourly, daily, etc.)
- **Automatic Retry**: Built-in retry mechanism for failed reporting attempts
- **Standardized Format**: Consistent data structure for all analytics reporting

## Development Standards

**IMPORTANT**: When using or extending this Data Pulse Service, strictly adhere to the Node.js Development Standards outlined in [nodejs-development-standards.md](../nodejs-development-standards.md). These standards ensure consistency across the codebase and proper integration with existing systems.

Key points to remember:
- Use snake_case for all variables, functions, files, and directories
- Follow the established logging patterns (`FILE: file_name.js | function_name | message`)
- Use the core connectivity services from the `_core_app_connectivities` folder:
  - `emitter.js` - For event handling
  - `rabbitmq.js` - For queue operations
- Wrap all async operations in try-catch blocks with proper error logging
- Maintain the established directory structure

The Data Pulse Service is built on top of these standards and extends the existing infrastructure. Any modifications or extensions should maintain this consistency.

## Architecture

The Data Pulse Service follows a simple but powerful architecture:

```
┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │
│  Application Code │     │  Direct Function  │
│  (Event Emitter)  │     │       Call        │
│                   │     │                   │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────┐
│                                             │
│            Data Pulse Service               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │      Event Data Standardization     │    │
│  │                                     │    │
│  └───────────────────┬─────────────────┘    │
│                      │                      │
│  ┌───────────────────▼─────────────────┐    │
│  │                                     │    │
│  │         RabbitMQ Publisher          │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │                       │
          │   RabbitMQ Queue      │
          │   (data_pulse_queue)  │
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │                       │
          │   Data Pulse Service  │
          │   (External System)   │
          │                       │
          └───────────────────────┘
```

## Getting Started

### 1. Import Required Modules

To report analytics from your application code, you only need to import the Event Emitter:

```javascript
const eventEmitter = require('../_core_app_connectivities/emitter');
```

Alternatively, if you prefer direct function calls, you can import the Data Pulse Service:

```javascript
const data_pulse_service = require('../event_driven_services/data_pulse.service');
```

### 2. Report Analytics via Events

The most common way to report analytics is by emitting an event:

```javascript
// Report analytics for user registration
eventEmitter.emit('report_to_datapulse', {
  datapulse_app_id: 8586,           // OneID Application ID (optional, defaults to configured ID)
  datapulse_user_id: user.id,       // User ID or 0 for global analytics
  datapulse_activity_id: "USER_REGISTRATION", // Activity type
  datapulse_activity_ref_id: "web", // Reference ID (e.g., platform, category)
  datapulse_event_label: "New User",// Human-readable label
  datapulse_adjustment: "add",      // "add" or "sub" (optional, defaults to "add")
  datapulse_event_count: 1,         // Count to report (optional, defaults to 1)
  datapulse_event_timestamp: Math.floor(Date.now() / 1000) // Unix timestamp (optional, defaults to current time)
});
```

### 3. Parameter Explanation

When reporting analytics, you can include these parameters:

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `datapulse_app_id` | OneID Application ID for Data Pulse | No | Configured app ID (8586) |
| `datapulse_user_id` | User ID or 0 for global analytics | Yes | - |
| `datapulse_activity_id` | Activity identifier (e.g., USER_REGISTRATION) | Yes | - |
| `datapulse_activity_ref_id` | Reference ID for the activity | Yes | - |
| `datapulse_event_label` | Human-readable label | Yes | - |
| `datapulse_adjustment` | "add" or "sub" | No | "add" |
| `datapulse_event_count` | Count to report | No | 1 |
| `datapulse_event_timestamp` | Unix timestamp of the event | No | Current timestamp |

## Use Cases & Examples

### Use Case 1: Track User Registrations by Platform

Track the number of users registering on different platforms:

```javascript
async function register_user(user_data, platform) {
  try {
    console.log(`FILE: user.service.js | register_user | Registering user on platform: ${platform}`);
    
    // Register user in database
    const new_user = await user_model.create(user_data);
    
    // Report analytics
    eventEmitter.emit('report_to_datapulse', {
      datapulse_user_id: 0, // Global analytics
      datapulse_activity_id: "USER_REGISTRATION_BY_PLATFORM",
      datapulse_activity_ref_id: platform, // e.g., "web", "ios", "android"
      datapulse_event_label: "User Registration"
    });
    
    return new_user;
  } catch (error) {
    console.error(`FILE: user.service.js | register_user | Error:`, error);
    throw error;
  }
}
```

### Use Case 2: Track Message Delivery Status by Network

Track SMS delivery rates by cellular network:

```javascript
function report_message_delivery(message_id, network, status) {
  try {
    console.log(`FILE: message.service.js | report_message_delivery | Message ${message_id} ${status} on ${network}`);
    
    // Report sent message
    if (status === 'sent') {
      eventEmitter.emit('report_to_datapulse', {
        datapulse_user_id: 0,
        datapulse_activity_id: "SMS_SENT_NETWORK_WISE",
        datapulse_activity_ref_id: network, // e.g., "Telenor", "Verizon", etc.
        datapulse_event_label: "SMS Sent"
      });
    }
    
    // Report delivered message
    if (status === 'delivered') {
      eventEmitter.emit('report_to_datapulse', {
        datapulse_user_id: 0,
        datapulse_activity_id: "SMS_DELIVERED_NETWORK_WISE",
        datapulse_activity_ref_id: network,
        datapulse_event_label: "SMS Delivered"
      });
    }
  } catch (error) {
    console.error(`FILE: message.service.js | report_message_delivery | Error:`, error);
  }
}
```

### Use Case 3: Track API Usage per User

Track API usage for billing or rate limiting:

```javascript
async function track_api_usage(user_id, endpoint, count = 1) {
  try {
    console.log(`FILE: api.service.js | track_api_usage | User ${user_id} accessed ${endpoint}`);
    
    eventEmitter.emit('report_to_datapulse', {
      datapulse_user_id: user_id, // User-specific analytics
      datapulse_activity_id: "API_USAGE",
      datapulse_activity_ref_id: endpoint, // e.g., "/api/v1/users", "/api/v1/orders"
      datapulse_event_label: "API Call",
      datapulse_event_count: count // Can track multiple calls at once
    });
  } catch (error) {
    console.error(`FILE: api.service.js | track_api_usage | Error:`, error);
  }
}
```

### Use Case 4: Track Feature Usage

Track which features are being used:

```javascript
function track_feature_usage(user_id, feature_name) {
  try {
    console.log(`FILE: feature.service.js | track_feature_usage | User ${user_id} used feature: ${feature_name}`);
    
    eventEmitter.emit('report_to_datapulse', {
      datapulse_user_id: user_id,
      datapulse_activity_id: "FEATURE_USAGE",
      datapulse_activity_ref_id: feature_name, // e.g., "export_to_pdf", "share_report"
      datapulse_event_label: "Feature Used"
    });
  } catch (error) {
    console.error(`FILE: feature.service.js | track_feature_usage | Error:`, error);
  }
}
```

## Aggregation and Data Retention

The Data Pulse Service supports various aggregation configurations:

- **Custom Minutes**: For short-term trends (e.g., 5-minute intervals for the past 24 hours)
- **Hourly**: For daily patterns
- **Daily**: For weekly or monthly trends
- **Monthly**: For yearly comparisons
- **Yearly**: For long-term analysis
- **Lifetime**: For cumulative metrics

Each aggregation level can have its own TTL (Time To Live) to automatically expire data:

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│                 Aggregation Levels                    │
│                                                       │
├───────────────┬───────────────┬───────────────────────┤
│ Level         │ Example Use   │ Common TTL            │
├───────────────┼───────────────┼───────────────────────┤
│ Custom Minutes│ Real-time     │ 24-48 hours           │
│ Hourly        │ Daily patterns│ 7-30 days             │
│ Daily         │ Weekly trends │ 30-90 days            │
│ Monthly       │ Yearly comp.  │ 1-2 years             │
│ Yearly        │ Long-term     │ 5+ years or permanent │
│ Lifetime      │ Cumulative    │ Permanent             │
└───────────────┴───────────────┴───────────────────────┘
```

## Implementation Standards

When implementing analytics reporting with the Data Pulse Service, follow these standards-compliant examples:

### Standard Event Emission

```javascript
const eventEmitter = require('../_core_app_connectivities/emitter');

function report_user_action(user_id, action_type, reference_id) {
  try {
    console.log(`FILE: analytics.service.js | report_user_action | Reporting user action: ${action_type}`);
    
    eventEmitter.emit('report_to_datapulse', {
      datapulse_user_id: user_id,
      datapulse_activity_id: action_type,
      datapulse_activity_ref_id: reference_id,
      datapulse_event_label: `User ${action_type}`
    });
    
    console.log(`FILE: analytics.service.js | report_user_action | Reported user action successfully`);
  } catch (error) {
    console.error(`FILE: analytics.service.js | report_user_action | Error reporting user action:`, error);
  }
}
```

### Direct Function Call

```javascript
const { report_to_data_pulse } = require('../event_driven_services/data_pulse.service');

async function log_critical_event(user_id, event_type, details) {
  try {
    console.log(`FILE: critical.service.js | log_critical_event | Logging critical event: ${event_type}`);
    
    // Direct function call
    await report_to_data_pulse({
      datapulse_user_id: user_id,
      datapulse_activity_id: "CRITICAL_EVENT",
      datapulse_activity_ref_id: event_type,
      datapulse_event_label: "Critical Event",
      datapulse_event_count: 1
    });
    
    console.log(`FILE: critical.service.js | log_critical_event | Critical event logged successfully`);
  } catch (error) {
    console.error(`FILE: critical.service.js | log_critical_event | Error logging critical event:`, error);
  }
}
```

## Best Practices

1. **Use Consistent Activity IDs**: Use UPPER_SNAKE_CASE for activity IDs to maintain consistency.
   
   ```javascript
   // Good
   datapulse_activity_id: "USER_REGISTRATION"
   
   // Avoid
   datapulse_activity_id: "userRegistration"
   ```

2. **Group Related Analytics**: Use consistent prefix for related activities to make them easier to analyze.
   
   ```javascript
   // Related activities with consistent prefixes
   datapulse_activity_id: "USER_REGISTRATION"
   datapulse_activity_id: "USER_LOGIN"
   datapulse_activity_id: "USER_PASSWORD_RESET"
   ```

3. **Use Reference IDs Effectively**: The reference ID should provide meaningful filtering capability.
   
   ```javascript
   // For platform-specific analytics
   datapulse_activity_ref_id: "web" | "ios" | "android"
   
   // For feature-specific analytics
   datapulse_activity_ref_id: "dashboard" | "reports" | "settings"
   ```

4. **Balance Granularity**: Be specific enough for useful insights, but not so specific that aggregation becomes meaningless.
   
   ```javascript
   // Too general
   datapulse_activity_id: "USER_ACTION" // ❌
   
   // Good balance
   datapulse_activity_id: "USER_DOCUMENT_ACTION" // ✅
   datapulse_activity_ref_id: "create" | "edit" | "delete" | "share"
   
   // Too specific
   datapulse_activity_id: "USER_DOCUMENT_PARAGRAPH_FORMATTING_CHANGE" // ❌
   ```

5. **Handle Errors**: Always wrap analytics reporting in try-catch blocks to prevent crashes in the main application flow.
   
   ```javascript
   try {
     // Important business logic
     const result = await critical_operation();
     
     // Analytics reporting (wrapped in try-catch)
     try {
       eventEmitter.emit('report_to_datapulse', {
         // Analytics data
       });
     } catch (analytics_error) {
       console.error(`FILE: business.service.js | critical_operation | Analytics reporting error:`, analytics_error);
       // Don't let analytics failures affect main application flow
     }
     
     return result;
   } catch (error) {
     console.error(`FILE: business.service.js | critical_operation | Critical operation error:`, error);
     throw error;
   }
   ```

6. **Document Analytics Events**: Maintain a list of all analytics events for reference.
   
   ```javascript
   /**
    * Analytics Event: USER_REGISTRATION
    * Description: Tracks new user registrations
    * Activity Ref ID: Platform (web, ios, android)
    * Aggregation: Hourly, Daily, Monthly
    * TTL: Hourly (30 days), Daily (1 year), Monthly (permanent)
    */
   ```

## Troubleshooting and Implementation Checks

When implementing analytics reporting or debugging issues, follow these guidelines:

### Common Issues

1. **Analytics not appearing in reports**:
   - Check that you're emitting to the correct 'report_to_datapulse' event
   - Verify that required fields are included (user_id, activity_id, activity_ref_id, event_label)
   - Check for RabbitMQ connection errors in logs

2. **Duplicate or missing analytics**:
   - Ensure you're reporting analytics at the right point in your code flow
   - For critical analytics, implement a separate retry mechanism
   - Consider using idempotent operations if duplicate reporting is a concern

3. **Incorrect aggregation**:
   - Verify that the activity is configured correctly in the Data Pulse service
   - Ensure timestamps are in Unix format (seconds, not milliseconds)

### Debugging Tips

When troubleshooting, add temporary logging to trace the flow:

```javascript
// Temporary debugging for analytics issues
eventEmitter.emit('report_to_datapulse', {
  datapulse_user_id: user_id,
  datapulse_activity_id: "PROBLEMATIC_ACTIVITY",
  datapulse_activity_ref_id: reference_id,
  datapulse_event_label: "Debug Event"
});
console.log(`FILE: debug.js | debug_analytics | Emitted analytics event with data:`, {
  user_id, activity: "PROBLEMATIC_ACTIVITY", ref_id: reference_id 
});
``` 