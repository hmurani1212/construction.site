# Munshi Service - Queue-Based Error Monitoring

A centralized error monitoring and reporting system for Node.js applications with queue-based architecture and real-time dashboard integration.

## Key Features

- **Queue-Based Integration**: Uses VT_MUNSHI_SERVICE_MAIN queue for decoupled error processing
- **HTTP API Fallback**: Automatic fallback to HTTP API when RabbitMQ is unavailable (solves circular dependency)
- **Smart Routing**: RabbitMQ errors automatically use HTTP API to avoid circular dependency
- **Event Router Integration**: High-performance event handling via Event Router pattern
- **Real-time Dashboard**: Live error monitoring through admin dashboard
- **Dual Log Types**: Supports both system errors and general activity logging
- **Standardized Error Types**: Consistent error categorization
- **Automatic Stack Trace**: Intelligent extraction of file, function, and line information
- **TTL Management**: Flexible time-to-live settings for different error criticality levels

## Log Types

### System Logs
Used for **error reporting and system issues** - technical problems, exceptions, failures, and debugging information.

### General Logs  
Used for **activity tracking and audit trails** - user actions, business events, state changes, and operational activities.

## Quick Start

### 1. System Error Reporting (Event Router - Recommended)

```javascript
const eventEmitter = require('../_core_apps_connectivities/emitter');

try {
  await database.findOne({ _id: user_id });
} catch (error) {
  console.error(`FILE: user.service.js | get_user | Database error:`, error);
  
  eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
    error: error,
    error_code: 'USER-404',
    error_title: 'User Not Found',
    error_type: 'DB_ERROR',
    metadata: {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    },
    other_data: {
      user_id: user_id,
      query_params: { _id: user_id }
    },
    ttl: 1296000 // 15 days
  });
  
  throw error;
}
```

### 2. General Activity Logging (Event Router)

```javascript
const eventEmitter = require('../_core_apps_connectivities/emitter');

// Log user login activity
eventEmitter.emit('event_router', 'GENERAL_LOG_EVENT', {
  log_type: 'USER_LOGIN',
  plain_text: 'User logged in successfully',
  oneid: user.id,
  org_id: user.org_id,
  entity_id: user.id,
  entity_type: 'user',
  metadata: {
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    location: 'New York, US'
  },
  changes: [
    {
      field: 'status',
      old_value: 'offline',
      new_value: 'online'
    }
  ],
  other_data: {
    session_id: req.sessionID,
    login_method: 'password'
  },
  ttl: 1209600 // 14 days
});
```


## Parameters

**Note**: The `app_id` is configured directly in the `munshi.service.js` file via the `munshi_app_id` variable and should not be passed in the message body. To change the application ID, update the variable in the service file.

### System Log Parameters

| Parameter | Description | Required | Default | Example |
|-----------|-------------|----------|---------|---------|
| `error` | JavaScript Error object | Yes | - | `new Error('DB connection failed')` |
| `error_code` | Unique error identifier | Yes | - | `'DB-404'`, `'AUTH-001'` |
| `error_title` | Human-readable error title | Yes | - | `'Database Connection Failed'` |
| `error_type` | Error category (see Standard Types) | Yes | - | `'DB_ERROR'`, `'API_ERROR'` |
| `metadata` | Contextual metadata | No | `{}` | `{ ip_address: '192.168.1.1' }` |
| `other_data` | Error-specific data | No | `{}` | `{ query: 'SELECT * FROM users' }` |
| `ttl` | Time-to-live in seconds | No | `2592000` | `604800` (7 days) |

### General Log Parameters

| Parameter | Description | Required | Default | Example |
|-----------|-------------|----------|---------|---------|
| `log_type` | Activity type identifier | Yes | - | `'USER_LOGIN'`, `'DATA_UPDATE'` |
| `plain_text` | Human-readable description | Yes | - | `'User logged in successfully'` |
| `oneid` | User ID performing action | No | `null` | `12345` |
| `org_id` | Organization identifier | No | `null` | `'org_001'` |
| `entity_id` | ID of affected entity | No | `null` | `'user_123'` |
| `entity_type` | Type of affected entity | No | `null` | `'user'`, `'document'`, `'order'` |
| `metadata` | Contextual information | No | `{}` | `{ ip_address: '192.168.1.1' }` |
| `changes` | Array of field changes | No | `[]` | `[{field: 'status', old_value: 'active', new_value: 'inactive'}]` |
| `other_data` | Activity-specific data | No | `{}` | `{ session_id: 'sess_123' }` |
| `ttl` | Time-to-live in seconds | No | `2592000` | `1209600` (14 days) |

## Standard Error Types (System Logs)

- `DB_ERROR` - Database operations (connection, queries, transactions)
- `API_ERROR` - External API calls (timeouts, invalid responses, rate limits)
- `AUTH_ERROR` - Authentication/authorization (invalid credentials, permissions)
- `VALIDATION_ERROR` - Data validation (schema violations, format issues)
- `SYSTEM_ERROR` - System-level issues (memory, CPU, disk, network)
- `CACHE_ERROR` - Cache operations (read/write failures, connectivity)
- `NETWORK_ERROR` - Network connectivity (DNS, timeouts, unreachable)
- `FILE_ERROR` - File operations (read/write, permissions, not found)
- `CONFIG_ERROR` - Configuration issues (missing values, invalid format)
- `UNKNOWN_ERROR` - Unclassified errors

## Common Log Types (General Logs)

- `USER_LOGIN` / `USER_LOGOUT` - Authentication events
- `DATA_CREATE` / `DATA_UPDATE` / `DATA_DELETE` - CRUD operations
- `PERMISSION_GRANT` / `PERMISSION_REVOKE` - Access control changes
- `FILE_UPLOAD` / `FILE_DOWNLOAD` - File operations
- `PAYMENT_SUCCESS` / `PAYMENT_FAILED` - Transaction events
- `EMAIL_SENT` / `SMS_SENT` - Communication events
- `EXPORT_DATA` / `IMPORT_DATA` - Data transfer operations
- `SYSTEM_BACKUP` / `SYSTEM_RESTORE` - System maintenance

## TTL Guidelines

- **Critical System Errors**: 7776000 seconds (90 days)
- **Standard System Errors**: 2592000 seconds (30 days)
- **General Activity Logs**: 1209600 seconds (14 days)
- **Minor Issues/Debug**: 604800 seconds (7 days)

## Event Router Events

| Event Name | Purpose | Log Type |
|------------|---------|----------|
| `MUNSHI_EVENT` | System error reporting | System Log |
| `GENERAL_LOG_EVENT` | Activity logging | General Log |

## Architecture

```
Application Code
       ↓
Event Router / Direct Function
       ↓
Munshi Service (Error Processing & Stack Trace Extraction)
       ↓
    [Smart Routing Decision]
       ↓
   ┌───┴────┐
   ↓        ↓
Queue    HTTP API
(Primary) (Fallback)
   ↓        ↓
   └───┬────┘
       ↓
Log Queue Consumer
       ↓
Database Storage + Real-time Dashboard Events
```

### Fallback Mechanism

**Problem Solved**: When RabbitMQ is down, Munshi service couldn't report errors because it depends on RabbitMQ - creating a circular dependency.

**Solution**: 
- **RabbitMQ/MQ Errors**: Automatically use HTTP API (`POST http://munshi_app_address/api/logs/system`) to bypass circular dependency
- **Other Errors**: Try RabbitMQ queue first, fallback to HTTP API if queue fails
- **General Logs**: Same fallback behavior for activity tracking

**HTTP API Details**:
- Endpoint: `POST /api/logs/system` (for errors) or `POST /api/logs/general` (for activity logs)
- Header: `x-api-key: {munshi_app_api_key}`
- Body: Same structure as queue message
- Timeout: 5 seconds

## Examples

See comprehensive usage examples in `munshi_example.js` covering:
- **System Logs**: Database errors, API failures, authentication errors, validation errors, cache errors, system errors
- **General Logs**: User activities, data operations, audit trails, business events
- **Integration Patterns**: Event Router usage, error handling, TTL management
- **Service Monitoring**: Health checks, status monitoring, troubleshooting

## Configuration

The Munshi service is configured in `munshi.service.js`:

```javascript
const munshi_app_id = 1020; // OneID Application ID for Munshi Service
const munshi_ttl = 2592000; // 30 days by default
const munshi_queue_name = 'VT_MUNSHI_SERVICE_MAIN'; // Queue name
const munshi_app_address = '172.18.0.26:7575'; // Munshi Service Address (for HTTP fallback)
const munshi_app_api_key = '24df7feb2b3942a35202273d55fe25f1'; // Munshi API Key
```

**Note**: The HTTP API fallback requires `axios` package. Install it if not already present:
```bash
npm install axios
```

## Integration Standards

Follow the Node.js Development Standards in `AI Dev VT NodeJS Standards v4.md`:
- Use snake_case naming conventions
- Proper logging patterns: `FILE: filename.js | function_name | message`
- Try-catch blocks with comprehensive error logging
- Event Router integration with proper handler registration

## Service Status

Check service health and connectivity:
```javascript
const { get_munshi_status } = require('../event_driven_services/munshi.service');
const status = get_munshi_status();
console.log('Munshi Service Status:', status);
```

## Quick Reference

```javascript
// System Error (via Event Router)
eventEmitter.emit('event_router', 'MUNSHI_EVENT', { error, error_code, error_title, error_type, ... });

// General Activity (via Event Router)  
eventEmitter.emit('event_router', 'GENERAL_LOG_EVENT', { log_type, plain_text, oneid, ... });

``` 