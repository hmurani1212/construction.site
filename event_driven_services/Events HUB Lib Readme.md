# VT EventS HUB Service

## 🎯 Overview

The **VT Events HUB Service** provides a standardized event envelope system that integrates seamlessly with existing **Event Router** library. It ensures all events across your VT Apps ecosystem follow a consistent format with rich metadata, correlation tracking, automatic categorization, and **auto-discovery for Events HUB MIS integration**.

## ⚙️ Configuration

**IMPORTANT**: Configure the service before using it in your application.

```javascript
// In event_hub.service.js, update the configuration:
const events_hub_config = {
    app_id: 123,                    // Your OneID assigned app ID
    environment: 'production',      // production, staging, development
    api_version: 'v2.1.0',         // Your API version
    envelope_version: 'v1.0.0',    // Event envelope version
    event_priority: 'medium',       // Default event priority
    event_ttl: 3600,               // Default TTL in seconds (1 hour)
    
    // Auto-Discovery Configuration
    auto_discovery_enabled: true,   // Enable/disable auto-discovery system
    discovery_sampling_rates: {
        development: 1.0,           // 100% sampling in development
        staging: 0.1,               // 10% sampling in staging  
        production: 0.01            // 1% sampling in production
    },
    discovery_queue: 'VT_EVENTS_HUB_AUTO_DISCOVERY'  // RabbitMQ queue name
};
```

### Auto-Discovery Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `auto_discovery_enabled` | Enable/disable the entire auto-discovery system | `true` |
| `discovery_sampling_rates` | Sampling rates per environment for event capture | See config above |
| `discovery_queue` | RabbitMQ queue name for discovery events | `'VT_EVENTS_HUB_AUTO_DISCOVERY'` |

## 🚀 Quick Start

### 1. Import and Initialize

```javascript
const events_hub = require('./event_driven_services/events_hub.service');
const event_router = require('./event_driven_services/event_router.service');

// Service is automatically initialized with your config
```

### 2. Publish Your First Event

**NEW FUNCTION SIGNATURE**: `publish(event_name, meta_data, data)`

```javascript
// Publish a user registration event
const event_id = await events_hub.publish('USER.ACCOUNT.CREATED', {
    // Meta-data comes first
    oneid: 12345,
    org_id: 456,
    correlation_id: 'session_abc123',
    client_info: {
        ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0...',
        session_id: 'sess_xyz789'
    }
}, {
    // Event data comes second
    user_id: 12345,
    email: 'john@example.com',
    name: 'John Doe',
    registration_method: 'email'
});

console.log(`Event published with ID: ${event_id}`);
```

### 3. Listen to Events

```javascript
// Register an event handler using existing Event Router library, for ref study event router documentation.
event_router.register_handler('USER.ACCOUNT.CREATED', (event_envelope) => {
    console.log(`Processing event: ${event_envelope.event_id}`);
    
    // Extract your data
    const user_data = event_envelope.payload;
    const metadata = event_envelope.event_metadata;
    
    console.log(`New user: ${user_data.name} (OneID: ${metadata.oneid})`);
    
    // Your business logic here
    send_welcome_email(user_data.email);
});
```

## 🔍 Auto-Discovery System

The Events HUB automatically captures events for MIS integration:

### How It Works

1. **Schema Hashing**: Each event structure gets a unique hash
2. **New Event Detection**: First occurrence of any event type is always captured
3. **Schema Change Detection**: Changes in event structure are always captured
4. **Smart Sampling**: Regular events are sampled based on environment settings
5. **RabbitMQ Publishing**: Discovery data is sent to `VT_EVENTS_HUB_AUTO_DISCOVERY` queue

### Discovery Logic

```javascript
// Auto-discovery decision tree:
if (is_new_event_type || schema_has_changed) {
    capture_event(); // Always capture new events and schema changes
} else if (random() < sampling_rate_for_environment) {
    capture_event(); // Sample existing events
}
```

### Discovery Message Format

```javascript
{
    "app_id": 123,
    "event_name": "USER.ACCOUNT.CREATED",
    "event_category": "general",
    "schema_hash": "a1b2c3d4e5f6...",
    "environment": "production",
    "capture_reason": "new_event|schema_change|sampling",
    "captured_at": "2023-10-29T12:00:00.000Z",
    "sample_envelope": { /* Complete event envelope */ }
}
```

### Control Auto-Discovery

```javascript
// Disable auto-discovery completely
const events_hub_config = {
    // ... other config
    auto_discovery_enabled: false  // Turn off completely
};

// Custom sampling rates
const events_hub_config = {
    // ... other config
    discovery_sampling_rates: {
        development: 1.0,    // Capture everything in dev
        staging: 0.05,       // 5% sampling in staging
        production: 0.001    // 0.1% sampling in production
    }
};
```

## 📋 Complete Event Envelope Structure

Every published event follows this standardized envelope format:

```javascript
{
    // === CORE EVENT IDENTITY ===
    "event_id": "evt_1698595200_a1b2c3d4",       // Unique event identifier
    "event_name": "USER.ACCOUNT.CREATED",        // Event name (DOMAIN.ENTITY.ACTION)
    "event_app_id": 123,                         // Your OneID app ID (from config)
    "event_version": "v1.0.0",                   // Envelope version
    "event_category": "general",                 // Auto-categorized: general, system, integration, audit
    
    // === TIMING & CORRELATION ===
    "event_time": "2023-10-29T12:00:00.000Z",   // ISO timestamp when event occurred
    "event_correlation_id": "session_abc123",   // Request/session correlation ID
    "event_trace_id": "trace_def456",           // Distributed tracing ID
    
    // === PROCESSING METADATA ===
    "event_priority": "medium",                  // Processing priority (high, medium, low)
    "event_ttl": 3600,                          // Time-to-live in seconds
    
    // === CONTEXT METADATA ===
    "event_metadata": {
        "oneid": 12345,                          // OneID of the user who generated the event
        "billing_id": 12345,                    // Organization/billing ID (corporate apps)
        "org_id": 456,                          // OneID assigned organization ID
        "machine_ip": "10.0.0.1",              // Server/machine IP that generated the event
        "environment": "production",             // Environment (from config)
        "client_info": {
            "ip": "192.168.1.100",              // Client IP address
            "user_agent": "Mozilla/5.0...",     // Client user agent
            "session_id": "sess_xyz789"         // Session/JWT/Device ID
        }
    },
    
    // === YOUR EVENT DATA ===
    "payload": {
        // Your actual event data goes here
        "user_id": 12345,
        "email": "john@example.com",
        "name": "John Doe"
    }
}
```

## 📝 Event Field Descriptions

### Core Identity Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `event_id` | string | Unique identifier for this specific event | `"evt_1698595200_a1b2c3d4"` |
| `event_name` | string | Standardized event name in DOMAIN.ENTITY.ACTION format | `"USER.ACCOUNT.CREATED"` |
| `event_app_id` | number | Your OneID assigned application ID (from config) | `123` |
| `event_version` | string | Event envelope version for compatibility | `"v1.0.0"` |
| `event_category` | string | Auto-categorized event type | `"general"` |

### Timing & Correlation Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `event_time` | string | ISO timestamp when event occurred | `"2023-10-29T12:00:00.000Z"` |
| `event_correlation_id` | string | Links related events across a request/session | `"session_abc123"` |
| `event_trace_id` | string | Distributed tracing identifier | `"trace_def456"` |

### Processing Fields

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `event_priority` | string | Event processing priority | `"high"`, `"medium"`, `"low"` |
| `event_ttl` | number | Time-to-live in seconds | `3600` (1 hour) |

### Context Metadata Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `event_metadata.oneid` | number | OneID of the user who generated the event | `12345` |
| `event_metadata.billing_id` | number | Organization/billing ID for corporate apps | `12345` |
| `event_metadata.org_id` | number | OneID assigned organization ID | `456` |
| `event_metadata.machine_ip` | string | IP of server/machine that generated event | `"10.0.0.1"` |
| `event_metadata.environment` | string | Environment where event occurred | `"production"` |
| `event_metadata.client_info.ip` | string | Client IP address | `"192.168.1.100"` |
| `event_metadata.client_info.user_agent` | string | Client browser/app user agent | `"Mozilla/5.0..."` |
| `event_metadata.client_info.session_id` | string | Session/JWT/Device identifier | `"sess_xyz789"` |

### Payload Field

| Field | Type | Description |
|-------|------|-------------|
| `payload` | object | Your actual event data - structure varies by event type |

## 🎯 Event Naming Convention

Use the format: **`DOMAIN.ENTITY.ACTION`**

### Categories & Auto-Classification

Events are automatically categorized based on naming patterns:

#### **General Events** (Business Operations)
- `USER.ACCOUNT.CREATED`
- `USER.PROFILE.UPDATED`
- `BILLING.ORDER.CREATED`
- `BILLING.PAYMENT.COMPLETED`
- `SUBSCRIPTION.ACTIVATED`
- `INVITATION.SENT`
- `ENROLLMENT.GRANTED`

#### **System Events** (Infrastructure)
- `SYSTEM.SERVICE.STARTED`
- `SYSTEM.HEALTH.DEGRADED`
- `CACHE.CLEARED`
- `DATABASE.BACKUP.COMPLETED`
- `MAINTENANCE.SCHEDULED`

#### **Integration Events** (External Systems)
- `WEBHOOK.SENT`
- `API.EXTERNAL.CALLED`
- `SYNC.DATA.COMPLETED`
- `IMPORT.USERS.FINISHED`
- `EXPORT.REPORT.GENERATED`

#### **Audit Events** (Security & Compliance)
- `AUTH.LOGIN.SUCCESS`
- `AUTH.LOGIN.FAILED`
- `PERMISSION.GRANTED`
- `SECURITY.BREACH.DETECTED`
- `ACCESS.DENIED`

## 🔧 Publishing Methods

### 1. Basic Event Publishing

**Function**: `publish(event_name, meta_data, data)`

```javascript
const event_id = await events_hub.publish(event_name, meta_data, data);
```

**Parameters:**
- `event_name` (string): Event name in DOMAIN.ENTITY.ACTION format
- `meta_data` (object): Metadata and context information  
- `data` (object): Your event data payload

**Example:**
```javascript
await events_hub.publish('BILLING.ORDER.CREATED', {
    // Meta-data
    oneid: 12345,
    org_id: 456,
    correlation_id: 'checkout_session_789'
}, {
    // Event data
    order_id: 'order_123',
    amount: 99.99,
    currency: 'USD',
    customer_email: 'user@example.com'
});
```

### 2. Batch Publishing

```javascript
const event_ids = await events_hub.publish_batch([
    {
        event_name: 'USER.INVITATION.SENT',
        meta_data: { oneid: 12345 },
        data: { email: 'user1@example.com', role: 'USER' }
    },
    {
        event_name: 'USER.INVITATION.SENT',
        meta_data: { oneid: 12345 },
        data: { email: 'user2@example.com', role: 'ADMIN' }
    }
]);
```

### 3. Scoped Publisher (Request Context)

**Function**: `scoped.publish(event_name, additional_meta_data, data)`

```javascript
// Create a scoped publisher for a user session
const scoped_publisher = events_hub.create_scoped_publisher({
    oneid: req.user_oneid,
    org_id: req.user_org_id,
    correlation_id: req.correlation_id,
    client_info: {
        ip: req.ip,
        user_agent: req.headers['user-agent'],
        session_id: req.session_id
    }
});

// All events automatically include the scoped context
await scoped_publisher.publish('BILLING.ORDER.CREATED', {}, order_data);
await scoped_publisher.publish('BILLING.PAYMENT.PROCESSED', {}, payment_data);
```

## 👂 Consuming Events

### 1. Basic Event Handler

```javascript
event_router.register_handler('USER.ACCOUNT.CREATED', (event_envelope) => {
    try {
        console.log(`Processing event: ${event_envelope.event_id}`);
        
        // Extract data
        const user_data = event_envelope.payload;
        const user_oneid = event_envelope.event_metadata.oneid;
        const client_ip = event_envelope.event_metadata.client_info.ip;
        
        // Your business logic
        console.log(`New user: ${user_data.name} (OneID: ${user_oneid})`);
        send_welcome_email(user_data.email);
        
    } catch (error) {
        console.error(`Error processing event: ${event_envelope.event_id}`, error);
    }
});
```

### 2. Handler with Options

```javascript
event_router.register_handler('BILLING.PAYMENT.COMPLETED', payment_handler, {
    priority: 1,        // High priority
    timeout: 5000,      // 5 second timeout
    name: 'payment_processor'
});

async function payment_handler(event_envelope) {
    const payment_data = event_envelope.payload;
    const correlation_id = event_envelope.event_correlation_id;
    
    console.log(`Processing payment: ${payment_data.payment_id}`);
    
    // Activate subscription
    await activate_subscription(payment_data.order_id);
    
    // Send receipt
    await send_receipt(payment_data, correlation_id);
}
```

## 💡 Integration Examples

### Example 1: User Registration Flow

```javascript
// In your user registration controller
async function register_user(req, res) {
    try {
        // Create user
        const new_user = await user_service.create(req.body);
        
        // Publish event with rich context (NEW SIGNATURE)
        await events_hub.publish('USER.ACCOUNT.CREATED', {
            // Meta-data first
            oneid: new_user.oneid,
            correlation_id: req.correlation_id,
            client_info: {
                ip: req.ip,
                user_agent: req.headers['user-agent'],
                session_id: req.session?.id
            }
        }, {
            // Event data second  
            user_id: new_user.id,
            oneid: new_user.oneid,
            email: new_user.email,
            name: new_user.full_name,
            registration_method: 'email',
            account_type: 'personal',
            verification_required: true
        });
        
        res.json({ STATUS: 'SUCCESSFUL', USER: new_user });
        
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ STATUS: 'ERROR' });
    }
}

// Event handler for welcome email
event_router.register_handler('USER.ACCOUNT.CREATED', async (event_envelope) => {
    const user_data = event_envelope.payload;
    
    if (user_data.verification_required) {
        await send_verification_email(user_data.email, user_data.name);
    } else {
        await send_welcome_email(user_data.email, user_data.name);
    }
});
```

### Example 2: Billing Order Processing

```javascript
// In your billing service
class billing_service {
    async create_order(order_data, user_context) {
        const new_order = await this.save_order(order_data);
        
        // Create scoped publisher for this user session
        const scoped_publisher = events_hub.create_scoped_publisher({
            oneid: user_context.oneid,
            org_id: user_context.org_id,
            billing_id: user_context.billing_id,
            correlation_id: user_context.session_id
        });
        
        // Publish order created event (NEW SIGNATURE)
        await scoped_publisher.publish('BILLING.ORDER.CREATED', {}, {
            order_id: new_order.id,
            order_ref: new_order.reference,
            amount: new_order.total_amount,
            currency: new_order.currency,
            items: new_order.items,
            customer_email: new_order.customer_email,
            status: 'pending'
        });
        
        return new_order;
    }
    
    async process_payment(order_id, payment_data) {
        const payment_result = await this.charge_payment(payment_data);
        
        if (payment_result.success) {
            await events_hub.publish('BILLING.PAYMENT.COMPLETED', {
                // Meta-data first
                oneid: payment_data.user_oneid,
                correlation_id: payment_data.correlation_id
            }, {
                // Payment data second
                payment_id: payment_result.id,
                order_id: order_id,
                amount: payment_result.amount,
                currency: payment_result.currency,
                payment_method: payment_data.method,
                transaction_id: payment_result.transaction_id
            });
        }
        
        return payment_result;
    }
}

// Event handlers for billing events
event_router.register_handler('BILLING.ORDER.CREATED', async (event_envelope) => {
    const order_data = event_envelope.payload;
    
    // Send order confirmation
    await send_order_confirmation(order_data.customer_email, order_data);
    
    // Schedule payment reminder
    if (order_data.status === 'pending') {
        schedule_payment_reminder(order_data.order_id);
    }
});

event_router.register_handler('BILLING.PAYMENT.COMPLETED', async (event_envelope) => {
    const payment_data = event_envelope.payload;
    
    // Activate services
    await activate_order_services(payment_data.order_id);
    
    // Send receipt
    await send_payment_receipt(payment_data);
});
```

## ✅ Best Practices

### 1. **Use Correlation IDs**
```javascript
// Link related events with correlation IDs
const correlation_id = `checkout_${Date.now()}`;

await events_hub.publish('BILLING.ORDER.CREATED', {
    correlation_id: correlation_id
}, order_data);

await events_hub.publish('BILLING.PAYMENT.PROCESSED', {
    correlation_id: correlation_id
}, payment_data);
```

### 2. **Control Auto-Discovery**
```javascript
// For high-frequency events, consider reducing sampling in production
const events_hub_config = {
    // ... other config
    auto_discovery_enabled: true,
    discovery_sampling_rates: {
        development: 1.0,      // Capture all events in development
        staging: 0.1,          // 10% sampling in staging
        production: 0.001      // 0.1% sampling for high-frequency production events
    }
};

// Or disable completely for super high-frequency events
const events_hub_config = {
    // ... other config
    auto_discovery_enabled: false  // No discovery overhead
};
```

### 3. **Handle Errors Gracefully**
```javascript
event_router.register_handler('CRITICAL.EVENT', async (event_envelope) => {
    try {
        await process_critical_event(event_envelope.payload);
    } catch (error) {
        console.error(`Failed to process event: ${event_envelope.event_id}`, error);
        // Don't throw - let other handlers continue
        await log_event_error(event_envelope, error);
    }
});
```

### 4. **Use Scoped Publishers for Requests**
```javascript
// Create request-scoped publisher
const scoped_publisher = events_hub.create_scoped_publisher({
    oneid: req.user_oneid,
    org_id: req.user_org_id,
    correlation_id: req.correlation_id,
    client_info: extract_client_info(req)
});

// All events automatically include context
await scoped_publisher.publish('USER.ACTION.PERFORMED', {}, action_data);
```

## 🔧 Configuration Options

### Global Configuration

Update the `events_hub_config` object in the service file:

```javascript
const events_hub_config = {
    app_id: 123,                    // Your OneID app ID
    environment: 'production',      // production, staging, development
    api_version: 'v2.1.0',         // Your API version
    envelope_version: 'v1.0.0',    // Event format version
    event_priority: 'medium',       // Default priority
    event_ttl: 3600,               // Default TTL (1 hour)
    
    // Auto-Discovery Configuration
    auto_discovery_enabled: true,   // Enable/disable auto-discovery
    discovery_sampling_rates: {
        development: 1.0,           // 100% sampling in development
        staging: 0.1,               // 10% sampling in staging  
        production: 0.01            // 1% sampling in production
    },
    discovery_queue: 'VT_EVENTS_HUB_AUTO_DISCOVERY'  // RabbitMQ queue
};
```

### Per-Event Meta-data

Override defaults when publishing:

```javascript
await events_hub.publish('HIGH.PRIORITY.EVENT', {
    priority: 'high',           // Override default priority
    ttl: 7200,                 // 2 hours instead of default 1 hour
    category: 'audit',         // Override auto-categorization
    event_version: 'v2.0.0'    // Use different envelope version
}, event_data);
```

## 🚨 Troubleshooting

### Events Not Being Received
1. Check Event Router is initialized: `event_router.service.js`
2. Verify handler registration: `event_router.register_handler()`
3. Ensure event names match exactly (case-sensitive)
4. Check console logs for publishing errors

### Auto-Discovery Not Working
1. Verify `auto_discovery_enabled: true` in config
2. Check RabbitMQ connection: Look for "RabbitMQ connected - Auto-discovery ready" log
3. Verify discovery queue name matches your RabbitMQ setup
4. Check sampling rates - might be too low to see events

### Performance Issues
1. Use batch publishing for multiple events
2. Use scoped publishers for request-level context
3. Adjust auto-discovery sampling rates
4. Disable auto-discovery for ultra high-frequency events

## 📈 Monitoring & Statistics

```javascript
// Get current statistics
const stats = events_hub.get_statistics();
console.log('Service Statistics:', stats);

// Monitor event processing
event_router.set_log_level('debug'); // Enable detailed logging

// Auto-discovery monitoring
console.log('Auto-discovery enabled:', events_hub_config.auto_discovery_enabled);
console.log('Current sampling rate:', events_hub_config.discovery_sampling_rates[events_hub_config.environment]);
```

## 🔄 Migration Guide

### From Old to New Function Signature

```javascript
// OLD WAY (Don't use)
await events_hub.publish('USER.CREATED', {
    user_id: 123,
    email: 'user@example.com'
}, {
    oneid: 123,
    correlation_id: 'abc123'
});

// NEW WAY (Use this)
await events_hub.publish('USER.CREATED', {
    // Meta-data first
    oneid: 123,
    correlation_id: 'abc123'
}, {
    // Data second
    user_id: 123,
    email: 'user@example.com'
});
```

### Batch Publishing Migration

```javascript
// OLD WAY
await events_hub.publish_batch([
    {
        event_name: 'USER.INVITATION.SENT',
        data: { email: 'user1@example.com' },
        options: { oneid: 12345 }
    }
]);

// NEW WAY
await events_hub.publish_batch([
    {
        event_name: 'USER.INVITATION.SENT',
        meta_data: { oneid: 12345 },
        data: { email: 'user1@example.com' }
    }
]);
```

---

## 🎉 You're Ready!

The Event HUB Publisher Service now includes:

- ✅ **Standardized event envelopes** with rich context
- ✅ **Auto-discovery system** for MIS integration  
- ✅ **Schema change detection** with hashing
- ✅ **Smart sampling** by environment
- ✅ **RabbitMQ integration** for discovery data
- ✅ **Updated function signature** for better developer experience

**Next Steps:**
1. Configure your `app_id` and environment
2. Set up RabbitMQ listener for `VT_EVENTS_HUB_AUTO_DISCOVERY` queue
3. Update existing code to use new function signature
4. Monitor auto-discovery data in your MIS system

Your events are now discoverable, trackable, and integration-ready! 🚀