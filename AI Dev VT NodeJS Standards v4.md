# NodeJS Development Standards for AI Integration Platform

This document outlines the coding standards, file organization, naming conventions, and best practices that must be strictly adhered to when developing the AI Integration Platform. These standards ensure consistency with existing infrastructure and streamline future maintenance.

## 1. Directory Structure

The project must follow this exact directory structure:

```
app_home_dir/
├── _bg_services/            # Background services
├── _core_app_connectivities/ # Core connectivity services (MySQL/Mongo DB, cache, etc.)
├── classes/                 # Class definitions for core entities
├── controllers/             # Business logic controllers by domain
├── data_repositories/       # Data access layer for database operations
├── event_driven_services/   # Event processing logic
├── global_config/           # Global configuration files 
├── middlewares/              # Request processing middlewares
├── models/                  # Data models (Mongoose schemas)
├── plugins/                 # Any plugins for thirdparty integrations if needed
├── routes/                  # API route definitions
├── services/                # Business logic services by domain
├── utils/                   # Utility functions and helpers
├── validations/             # Request validation definitions
├── app.js                   # Main application setup (consumer API)
├── admin_app.js             # Admin interface application setup
└── ecosystem.config.js      # PM2 configuration
```

## 2. Naming Conventions

### 2.1. Files and Directories

- **Files**: Use snake_case for all file names
  - Example: `worker_service.js`, `rate_limit.middleware.js`

- **Directories**: Use snake_case for directory names
  - Example: `event_driven_services`, `global_config`

### 2.2. Code Identifiers

- **Variables and Functions**: Use snake_case
  ```javascript
  const user_token = "abc123";
  function validate_user_session() { }
  ```

- **Constants**: Use UPPER_SNAKE_CASE
  ```javascript
  const MAX_ATTEMPTS = 3;
  const DEFAULT_TIMEOUT = 30000;
  ```

- **Classes**: Use snake_case for class names (contrary to common JS practice)
  ```javascript
  class worker_service { }
  class openai_plugin { }
  ```

- **Database models**: Use singular nouns with snake_case
  ```javascript
  const ai_worker = mongoose.model('ai_worker', schema);
  ```

## 3. Core Connectivity Standards

### 3.1. Database Connections

- **IMPORTANT**: Never implement direct connection/connector code to data services
- Always use the existing files in `_core_app_connectivities` folder
- Import and use these connections as follows:

```javascript
// MongoDB connection (Mongoose)
const mongoose_connection = require('../_core_app_connectivities/db_mongo_mongoose');

// MySQL connection
const mysql_connection = require('../_core_app_connectivities/db_mysql');

// Redis connection
const redis = require('../_core_app_connectivities/redis');

// Memcached connection
const memcached_ops = require('../_core_app_connectivities/memcache');

// RabbitMQ connection
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');

// Event emitter
const eventEmitter = require('../_core_app_connectivities/emitter');
```

### 3.2. Event Driven Architecture

- Use the event emitter for internal communication
- Follow this pattern for event listeners:

```javascript
eventEmitter.on('event_name', async (event_data) => {
    try {
        // Handle event
    } catch (error) {
        console.error(`FILE: file_name.js | event_name | Error:`, error);
    }
});
```

### 3.3. Event Router Service

For applications requiring advanced event handling and routing capabilities, use the Event Router Service located in `event_driven_services/event_router.service.js`. This service provides a centralized event routing system that simplifies event handling, improves maintainability, and enhances performance.

**Key Features of the Event Router Service:**
- Single event listener with routing by event ID
- Priority-based execution of event handlers
- Support for middleware to process events
- Built-in RabbitMQ integration
- Timeout protection for handlers
- Comprehensive logging system

**Usage Example:**
```javascript
// Import the Event Router and Event Emitter
const event_router = require('./event_driven_services/event_router.service');
const eventEmitter = require('./_core_app_connectivities/emitter');

// Register a handler for a specific event ID
event_router.registerHandler('USER_CREATED', async (event_data) => {
    try {
        console.log(`FILE: user.service.js | USER_CREATED handler | Processing user: ${event_data.user_id}`);
        // Handle event
    } catch (error) {
        console.error(`FILE: user.service.js | USER_CREATED handler | Error:`, error);
    }
});

// Emit an event
eventEmitter.emit('event_router', 'USER_CREATED', {
    user_id: '12345',
    name: 'John Doe',
    email: 'john@example.com'
});
```

For comprehensive documentation on the Event Router Service, refer to the [EVENT_ROUTER_README.md](./event_driven_services/EVENT_ROUTER_README.md) file.

### 3.4. Data Pulse Service

For applications requiring analytics tracking and reporting capabilities, use the Data Pulse Service located in `event_driven_services/data_pulse.service.js`. This service provides a centralized analytics reporting system that simplifies tracking events, metrics, and user activity.

**Key Features of the Data Pulse Service:**
- Centralized analytics reporting
- Event-driven integration
- RabbitMQ-based message delivery
- Configurable aggregation levels (minutes, hourly, daily, etc.)
- Automatic retry mechanism
- Standardized data format

**Usage Example:**
```javascript
// Import the Event Emitter
const eventEmitter = require('./_core_app_connectivities/emitter');

// Report analytics for user registration
function report_user_registration(user_id, platform) {
    try {
        console.log(`FILE: analytics.service.js | report_user_registration | Reporting user registration on ${platform}`);
        
        eventEmitter.emit('report_to_datapulse', {
            datapulse_user_id: user_id,
            datapulse_activity_id: 'USER_REGISTRATION',
            datapulse_activity_ref_id: platform, // e.g., "web", "ios", "android"
            datapulse_event_label: 'New User Registration'
        });
        
        console.log(`FILE: analytics.service.js | report_user_registration | Successfully reported user registration`);
    } catch (error) {
        console.error(`FILE: analytics.service.js | report_user_registration | Error reporting user registration:`, error);
    }
}
```

For comprehensive documentation on the Data Pulse Service, refer to the [DATA_PULSE_README.md](./event_driven_services/DATA_PULSE_README.md) file.

### 3.5. Munshi Service - Error Monitoring and Reporting

For applications requiring centralized error monitoring and reporting, use the Munshi Service located in `event_driven_services/munshi.service.js`. This service provides a powerful solution for tracking, reporting, and managing application errors across the system.

**Key Features of the Munshi Service:**
- Centralized error reporting
- Event Router integration
- Automatic stack trace extraction
- RabbitMQ-based delivery
- Standardized error format
- Automatic retry mechanism
- Support for non-blocking errors and custom TTL

**Usage Example with Event Router:**
```javascript
// Import the Event Emitter
const eventEmitter = require('./_core_app_connectivities/emitter');

try {
  // Your code that might throw an error
  await database.findOne({ _id: user_id });
} catch (error) {
  // Standard error logging
  console.error(`FILE: user.service.js | get_user | Database query error:`, error);
  
  // Report to Munshi via Event Router
  eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
    error: error,
    error_code: 'DB-ERROR-1001',
    error_title: 'Database Query Failure',
    error_type: 'DB_ERROR',
    metadata: { 
      collection: 'users', 
      operation: 'findOne'
    },
    other_data: { 
      user_id: user_id, 
      query_params: { _id: user_id }
    }
  });
  
  // Rethrow or handle as appropriate
  throw error;
}
```

**Standard Error Types:**

For consistent categorization of errors, use these standardized error types:

- `DB_ERROR`: All database-related errors (connectivity, query execution, etc.)
- `CACHE_ERROR`: All cache-related errors (read/write failures, connectivity issues)
- `MQ_ERROR`: All message queue-related errors (publishing, consuming, connectivity)
- `API_ERROR`: All external API-related errors (timeouts, invalid responses, rate limits)
- `AUTH_ERROR`: All authentication/authorization errors (invalid credentials, permissions)
- `VALIDATION_ERROR`: All data validation errors (schema violations, format issues)
- `SYSTEM_ERROR`: All system resource errors (memory, CPU, disk, etc.)
- `UNEXPECTED_ERROR`: Any unexpected errors that don't fit other categories

These static error types ensure consistent categorization and filtering in the Munshi system.

For comprehensive documentation on the Munshi Service, refer to the [MUNSHI_README.md](./event_driven_services/MUNSHI_README.md) file.

### 3.6. Event-Driven Architecture: Business Logic and Event Handling Separation

When implementing event-driven functionality in our applications, it's critical to maintain a clear separation between business logic and event handling. This separation ensures code maintainability, testability, and follows the single responsibility principle.

#### 3.6.1. Architectural Pattern

Follow this pattern for all event-driven features:

1. **Business Logic**: Implement all business logic in the `services/` directory
2. **Event Handling**: Implement event listeners and emitters in the `event_driven_services/` directory
3. **Separation of Concerns**: Event handlers should only be responsible for receiving events and delegating to appropriate service methods

#### 3.6.2. Directory Structure and File Naming

```
services/
  ├── feature_name.service.js       # Contains all business logic
  └── ...

event_driven_services/
  ├── feature_name_events.service.js # Contains event listeners/handlers
  └── ...
```

#### 3.6.3. Implementation Example

For a feature called "chain_rule" that processes events:

**Business Logic (`services/chain_rule.service.js`):**

```javascript
// services/chain_rule.service.js
const mongodb_ops = require('../_core_app_connectivities/mongodb');
const logger = require('../_core_app_connectivities/logger');

class chain_rule_service {
  constructor() {
    logger.info('FILE: chain_rule.service.js | constructor | Service initialized');
  }
  
  // Business logic methods
  async process_event(eventData) {
    try {
      logger.debug(`FILE: chain_rule.service.js | process_event | Processing event data: ${JSON.stringify(eventData)}`);
      
      // Actual business logic implementation
      // ...
      
      return { status: 'success' };
    } catch (error) {
      logger.error(`FILE: chain_rule.service.js | process_event | Error: ${error.message}`, { error });
      throw error;
    }
  }
  
  // Other business logic methods
  // ...
}

module.exports = new chain_rule_service();
```

**Event Handler (`event_driven_services/chain_rule_events.service.js`):**

```javascript
// event_driven_services/chain_rule_events.service.js
const event_router = require('./event_router.service');
const chain_rule_service = require('../services/chain_rule.service');
const logger = require('../_core_app_connectivities/logger');

class chain_rule_events_service {
  constructor() {
    this.setup_event_listeners();
    logger.info('FILE: chain_rule_events.service.js | constructor | Service initialized');
  }
  
  setup_event_listeners() {
    // Register with event router
    event_router.register_handler('FEATURE_EVENT', this.handle_event.bind(this));
    logger.debug('FILE: chain_rule_events.service.js | setup_event_listeners | Handlers registered');
  }
  
  // Event handler methods only receive events and delegate to service methods
  async handle_event(eventData) {
    try {
      logger.debug(`FILE: chain_rule_events.service.js | handle_event | Received event: ${JSON.stringify(eventData)}`);
      
      // Delegate to the service method for actual business logic
      await chain_rule_service.process_event(eventData);
    } catch (error) {
      logger.error(`FILE: chain_rule_events.service.js | handle_event | Error: ${error.message}`, { error });
    }
  }
}

// Initialize and export the service
const service = new chain_rule_events_service();
module.exports = service;
```

#### 3.6.4. Key Benefits

This separation provides several advantages:

1. **Maintainability**: Business logic is isolated from event handling
2. **Testability**: Service methods can be tested independently without event system
3. **Single Responsibility**: Each file has a clear, distinct purpose
4. **Code Organization**: Developers can easily locate code related to business logic vs. event handling
5. **Scalability**: Services can be extended without modifying event handlers

#### 3.6.5. Rules to Follow

- **Never** place business logic directly in event handler methods
- **Always** delegate from event handlers to service methods
- **Don't** create circular dependencies between services and event handlers
- **Do** pass complete event data from handlers to services
- **Do** use proper error handling in both layers
- Event handlers should focus only on:
  - Receiving and validating events
  - Calling appropriate service methods
  - Basic error handling and logging

By following this pattern consistently, we ensure our event-driven architecture remains maintainable and scalable as the system grows.

### 3.7. Data Repositories Pattern for Database Access

#### 3.7.1. Centralized Data Access

The application must follow the Data Repositories Pattern for all database interactions. This pattern centralizes data access logic in dedicated data repository modules instead of directly querying databases from various parts of the application.

**Key Benefits:**
- **Separation of Concerns**: Database logic is isolated from business logic
- **Code Reusability**: Data access functions can be reused across the application
- **Maintainability**: Changes to database structure only require updates in one place
- **Testability**: Easy to mock data repositories for testing business logic
- **Consistency**: Ensures consistent data access patterns throughout the application

#### 3.7.2. Implementation Guidelines

All database queries must be implemented in dedicated data repository modules:

```
models/
  ├── schemas/
  |   └── user_account.schema.js  # Defines the schema
  |
data_repositories/
  ├── user_account.data_repository.js  # Contains all queries for user_accounts
  └── ...
```

**Naming Convention:**
- Data repository filenames **MUST** begin with the name of the table or collection they access
- Example: `user_account.data_repository.js` for the `user_accounts` table
- This consistent naming enables easier understanding and navigation of the codebase

**Data Repository Implementation Example:**

```javascript
// data_repositories/user_account.data_repository.js
const mysql_connection = require('../_core_app_connectivities/db_mysql');
const logger = require('../utils/logger');

class user_account_data_repository {
  constructor() {
    logger.info('FILE: user_account.data_repository.js | constructor | Data Repository initialized');
  }
  
  async get_user_by_id(user_id) {
    try {
      logger.debug(`FILE: user_account.data_repository.js | get_user_by_id | Fetching user: ${user_id}`);
      
      const query = 'SELECT * FROM user_accounts WHERE id = ?';
      const [rows] = await mysql_connection.execute(query, [user_id]);
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`FILE: user_account.data_repository.js | get_user_by_id | Error: ${error.message}`, { error });
      throw error;
    }
  }
  
  async get_users_by_role(role) {
    try {
      const query = 'SELECT * FROM user_accounts WHERE role = ?';
      const [rows] = await mysql_connection.execute(query, [role]);
      
      return rows;
    } catch (error) {
      logger.error(`FILE: user_account.data_repository.js | get_users_by_role | Error: ${error.message}`, { error });
      throw error;
    }
  }
  
  // Other data access methods...
}

// Export singleton instance
module.exports = new user_account_data_repository();
```

**Service Usage Example:**

```javascript
// services/user.service.js
const user_account_data_repository = require('../data_repositories/user_account.data_repository');

class user_service {
  async get_user_details(user_id) {
    try {
      // Use the data repository method instead of writing SQL queries directly
      const user = await user_account_data_repository.get_user_by_id(user_id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      // Handle error
      throw error;
    }
  }
}

module.exports = new user_service();
```

#### 3.7.3. Strict Enforcement

- **NEVER** write SQL queries directly in service files, controllers, or other business logic
- **ALWAYS** create and use data repository methods for data access
- **DO NOT** duplicate data access logic across multiple files
- **DO** create specific, well-named data repository methods for each data access pattern
- **DO** handle database errors properly within data repository methods

This centralized approach to data access ensures that when database structures change, updates only need to be made in a single location rather than hunting down direct database queries scattered throughout the application.

### 3.8. Cross-Module Data Access Standards

#### 3.8.1. Prohibition of Cross-Table Queries

**CRITICAL RULE: Never write direct database queries to tables owned by other modules.**

When your module needs data from another module's table, you MUST use the existing services for that module instead of writing direct queries.

**❌ VIOLATION - Never Do This:**
```javascript
// DON'T: Query another module's table directly
class invitation_service {
    async check_user_access(user_id, app_id) {
        // WRONG: Direct query to allowed_app table (owned by app_operations module)
        const query = `SELECT COUNT(*) FROM oneid.allowed_app WHERE user_id = ? AND app_id = ?`;
        const [rows] = await mysql_connection.execute(query, [user_id, app_id]);
        return rows[0].count > 0;
    }
}
```

**✅ CORRECT - Always Do This:**
```javascript
// CORRECT: Use existing service that owns the table
class invitation_service {
    async check_user_access(user_id, app_id) {
        // RIGHT: Use existing service that manages allowed_app table
        const access_check = await app_operations_service.is_app_allowed(user_id, app_id);
        return access_check.STATUS === 'SUCCESSFUL' && access_check.APP_STATUS !== 'NOT_ALLOWED';
    }
}
```

#### 3.8.2. Service-Oriented Database Access

**Each table/collection should have ONE primary owning service that manages all access to that data.**

**Table Ownership Examples:**
- `oneid.allowed_app` → **Owned by**: `app_operations.service.js`
- `oneid.enrolled_apps` → **Owned by**: `app_operations.service.js`
- `oneid.oneid_roles` → **Owned by**: `roles_permissions_ops.service.js`
- `oneid.user_accounts` → **Owned by**: `registration_ops.service.js`
- `oneid.enroll_app_invitations` → **Owned by**: `invitation.service.js`

**When you need data from another table:**
1. **First**: Search the codebase for existing functions that access that table
2. **Then**: Use the existing service method instead of writing new queries
3. **Never**: Create duplicate data access logic

#### 3.8.3. Discovery Pattern for Existing Services

Before writing any database query, follow this discovery pattern:

```bash
# 1. Search for existing functions that access the table
grep -r "table_name" app_dir/services/

# 2. Search for functions that might handle your use case
grep -r "functionality_keyword" app_dir/services/

# 3. Examine the owning service for available methods
```

**Example Discovery Process:**
```javascript
// Need to check if user has app access?
// 1. Search: grep -r "allowed_app" app_dir/services/
// 2. Find: app_operations_service has is_app_allowed() method
// 3. Use: await app_operations_service.is_app_allowed(user_id, app_id)

// Need to validate role exists?
// 1. Search: grep -r "oneid_roles" app_dir/services/
// 2. Find: roles_permissions_ops_service has get_role_id_by_name() method  
// 3. Use: await roles_permissions_ops_service.get_role_id_by_name(app_id, role_name)
```

#### 3.8.4. Service Coordination Pattern

When your service needs functionality from multiple modules, coordinate through service calls:

```javascript
class invitation_service {
    async create_invitation(invitation_data) {
        // ✅ Use app_operations service for app validation
        const app_response = await app_operations_service.get_app_detail(invitation_data.app_id);
        
        // ✅ Use roles service for role validation
        const role_response = await roles_permissions_ops_service.get_role_id_by_name(
            invitation_data.app_id, 
            invitation_data.role_name
        );
        
        // ✅ Use registration service for user lookup
        const user_response = await registration_ops_service.get_user_oneid(0, invitation_data.email);
        
        // ✅ Use app_operations service for access checking
        if (user_response.ONE_ID) {
            const access_check = await app_operations_service.is_app_allowed(
                user_response.ONE_ID, 
                invitation_data.app_id
            );
        }
        
        // ✅ Only then use your own data repository for invitation-specific data
        await enroll_app_invitations_data_repository.create_invitation(data);
    }
}
```

#### 3.8.5. Benefits of This Approach

1. **Code Reuse**: Leverages existing, tested functionality
2. **Consistency**: Uses the same business logic throughout the application
3. **Maintainability**: Changes to table structure only affect the owning service
4. **Testing**: Existing services are already tested and proven
5. **Business Logic Preservation**: Maintains complex business rules embedded in existing services
6. **Performance**: Existing services often include caching and optimization

#### 3.8.6. Exception Handling

When using cross-module services, handle errors gracefully:

```javascript
try {
    const access_check = await app_operations_service.is_app_allowed(user_id, app_id);
    if (access_check.STATUS === 'SUCCESSFUL' && access_check.APP_STATUS !== 'NOT_ALLOWED') {
        // User has access
    }
} catch (service_error) {
    console.error('invitation.service.js:XXX | method_name | Service call error:', service_error);
    // Decide whether to fail or continue based on business requirements
    // Often continue with invitation creation if access check fails
}
```

This approach ensures architectural integrity and leverages the existing robust functionality already built into the platform.

## 4. Code Structure and Organization

### 4.1. MVC Pattern

- **Models**: Define data structures and database schemas
- **Controllers**: Handle request processing and coordinate service calls
- **Services**: Implement core business logic
- **Routes**: Define API endpoints and connect to controllers
- **Middleware**: Process requests before they reach controllers

### 4.2. Class Implementation

- Implement services and business logic using classes
- Use singleton pattern for services:

```javascript
class worker_service {
    constructor() {
        // Initialize service
    }
    
    async get_worker(id) {
        // Service method implementation
    }
}

// Export singleton instance
module.exports = new worker_service();
```

## 5. Logging Standards

### 5.1. Log Format

- Include a unique log identifier with filename, function name, and descriptive message
- Mask sensitive information
- Follow this pattern:

```javascript
console.log(`worker_service.js:001 | get_worker | Getting worker: ${worker_id}`);
console.error(`worker_service.js:002 | get_worker | Error fetching worker:`, error);
```

The log identifier (`filename.js:XXX`) should be:
- Unique across the entire codebase
- Static (does not change when code is modified)
- Numeric with padding zeros (e.g., worker_service.js:001, worker_service.js:002, etc.)
- Incremented for each new log statement

### 5.2. Error Logging Pattern

For errors, use this detailed pattern:

```javascript
console.error(`rules_engine_v2.service.js:110 | store_new_rule | Failed to store rule, ERROR: `, error);
```

### 5.3. Data Logging

For data logging, provide adequate context:

```javascript
console.log('billing.service.js:614 | charge_user_on_ebb | data:', data);
```


This ensures that Munshi errors can be directly correlated with console logs.

## 6. Error Handling

### 6.1. Try-Catch Blocks

- Wrap all async operations in try-catch blocks
- Include descriptive error messages
- Rethrow errors when appropriate

```javascript
async function get_worker(worker_id) {
    try {
        const worker = await worker_model.findById(worker_id);
        return worker;
    } catch (error) {
        console.error(`FILE: worker_service.js | get_worker | Error:`, error);
        throw error; // Rethrow for handling at higher level
    }
}
```

### 6.2. Error Codes

- In ERROR_CODE use predefined error code as "VTAPP-XXX01", this will later be updated after code is issued by our central error registry, this is used our internal tech teams to locate and trace the issues.
- Basically The ERROR_FILTER is used to map error/messages on frontend.
- The ERROR_DESCRIPTION is human readable error message displayed to user.

```javascript
const error_response = {
    STATUS: "ERROR",
    ERROR_FILTER: "TECHNICAL_ISSUE", // Options: USER_END_VIOLATION, TECHNICAL_ISSUE, INVALID_REQUEST
    ERROR_CODE: "VTAPP-XXX01", //We will later update them.
    ERROR_DESCRIPTION: "Database connection failed"
};
```

## 7. API Response Format

### 7.1. Success Response Format

```javascript
{
  "STATUS": "SUCCESSFUL",
  "ERROR_CODE": "",
  "ERROR_FILTER": "",
  "ERROR_DESCRIPTION": "",
  "DB_DATA": { /* Response/DB data */ }
}
```

### 7.2. Error Response Format

```javascript
{
  "STATUS": "ERROR",
  "ERROR_FILTER": "[ERROR_CATEGORY]", // e.g., "USER_END_VIOLATION", "TECHNICAL_ISSUE"
  "ERROR_CODE": "VTWE-[NUMBER]", // e.g., "VTWE-143782177"
  "ERROR_DESCRIPTION": "[Human-readable error message]"
}
```

### 7.3. Rate Limiting Response Format

For rate limiting responses, use this specific format to provide clients with detailed rate limit information:

```javascript
{
  "STATUS": "ERROR",
  "ERROR_FILTER": "RATE_LIMIT_EXCEEDED",
  "ERROR_CODE": "VTWE-[NUMBER]", // e.g., "VTWE-143782177"
  "ERROR_DESCRIPTION": "[Human-readable error message]",
  "RATE_LIMIT": {
    "type": "[LIMIT_TYPE]", // e.g., "IP", "USER", "USERNAME", "GLOBAL"
    "retry_after_seconds": 1800, // Time in seconds before retry is allowed
    "remaining_points": 0 // Remaining request quota
  }
}
```

**Rate Limiting Standards:**
- Always use `RATE_LIMIT` object (not `DETAILS`) for rate limit information
- Include HTTP headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Follow standard error response format with `ERROR_CODE` and `ERROR_DESCRIPTION`
- Use standardized limit types: `IP`, `USER`, `USERNAME`, `GLOBAL`, `EMERGENCY_LIMIT`
- Use error code pattern `VTWE-429XXX` for rate limiting errors

**Rate Limiting Implementation Example:**

```javascript
// Set standard rate limiting headers
res.set({
    'Retry-After': retry_after_seconds,
    'X-RateLimit-Limit': 10,
    'X-RateLimit-Remaining': remaining_points,
    'X-RateLimit-Reset': Math.ceil((Date.now() + ms_before_next) / 1000),
    'X-RateLimit-Type': 'IP'
});

 return res.status(429).json({
     STATUS: 'ERROR',
     ERROR_FILTER: 'RATE_LIMIT_EXCEEDED',
     ERROR_CODE: 'VTWE-429001',
     ERROR_DESCRIPTION: 'Too many requests from your location. Please try again in 30 minutes.',
     RATE_LIMIT: {
         type: 'IP',
         retry_after_seconds: 1800,
         remaining_points: 0
     }
 });
```

### 7.4 Cloudflare + HAProxy IP Extraction Standards

When using **Cloudflare → HAProxy → Express** architecture, proper IP extraction is critical for rate limiting and security:

**Architecture Flow:**
```
Client → Cloudflare → HAProxy → Express App
```

**Required Express Configuration:**
```javascript
// CRITICAL: Must be set for proxy chain environments
app.set('trust proxy', true);

// Alternative specific configurations:
// app.set('trust proxy', 1); // Trust first proxy (HAProxy)
// app.set('trust proxy', ['haproxy_ip_range']); // Trust specific HAProxy IPs
```

**IP Extraction Priority Order:**
1. `CF-Connecting-IP` (Cloudflare's real client IP - if preserved by HAProxy)
2. `X-Forwarded-For` (first IP in chain: client, cloudflare_edge, haproxy)
3. `X-Real-IP` (HAProxy might set this to real client IP)
4. `req.ip` (Express with trust proxy enabled)
5. Connection-based (HAProxy server IP - not useful for rate limiting)

**Implementation Example:**
```javascript
function getClientIP(req) {
    // Priority order for Cloudflare → HAProxy → Express
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    if (req.headers['x-forwarded-for']) {
        const forwarded_ips = req.headers['x-forwarded-for'].split(',').map(ip => ip.trim());
        return forwarded_ips[0]; // First IP is usually real client
    }
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'];
    }
    if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
        return req.ip;
    }
    return 'unknown';
}
```

**HAProxy Configuration Considerations:**
- Ensure HAProxy preserves `CF-Connecting-IP` header from Cloudflare
- Configure HAProxy to set proper `X-Forwarded-For` and `X-Real-IP` headers
- Verify HAProxy doesn't strip important headers

**IP Normalization for Redis:**
- Convert IPv6 localhost (::1) to IPv4 (127.0.0.1)
- Remove IPv6 prefixes (::ffff:)
- Replace special characters (:[]%) with underscores
- Trim whitespace from all IPs

**Testing Endpoint:**
```javascript
// Debug endpoint to verify IP extraction in HAProxy setup
app.get('/debug/ip', (req, res) => {
    const forwarded_chain = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',').map(ip => ip.trim())
        : [];
    
    res.json({
        architecture: 'Cloudflare → HAProxy → Express',
        detected_ip: req.ip,
        priority_analysis: {
            '1_cf_connecting_ip': req.headers['cf-connecting-ip'] || 'NOT_SET',
            '2_x_forwarded_for_first': forwarded_chain[0] || 'NOT_SET',
            '3_x_real_ip': req.headers['x-real-ip'] || 'NOT_SET',
            '4_express_req_ip': req.ip || 'NOT_SET'
        },
        forwarded_chain: forwarded_chain,
        trust_proxy_setting: app.get('trust proxy')
    });
});
```

**Common Issues in HAProxy Setup:**
- HAProxy might strip `CF-Connecting-IP` header
- Multiple IPs in `X-Forwarded-For` need proper parsing
- Trust proxy configuration must account for proxy chain
- Rate limiting HAProxy's IP instead of client IP if misconfigured

## 8. Controllers and Routes

### 8.1. Controller Methods

- Each controller method should have this structure:

```javascript
async createWorker(req, res) {
    try {
        console.log(`FILE: worker.controller.js | createWorker | Request received`);
        
        // Get data from request
        const worker_data = req.body;
        
        // Call service layer
        const result = await worker_service.create_worker(worker_data);
        
        // Return success response
        return res.status(201).json({
            STATUS: "SUCCESSFUL",
            ERROR_CODE: "",
            ERROR_FILTER: "",
            ERROR_DESCRIPTION: "",
            DB_DATA: result
        });
    } catch (error) {
        console.error(`FILE: worker.controller.js | createWorker | Error:`, error);
        
        // Return error response
        return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "TECHNICAL_ISSUE",
            ERROR_CODE: "VTWE-143782177",
            ERROR_DESCRIPTION: error.message
        });
    }
}
```

### 8.2. Route Definitions

- Organize routes by domain
- Include appropriate middleware
- Document routes with comments:

```javascript
/**
 * @route   POST /api/v1/workers
 * @desc    Create a new worker
 * @access  Private
 */
router.post(
    '/',
    auth_middleware.authenticate,
    validator_middleware.validate_worker_create,
    worker_controller.create_worker
);
```

## 9. Model Definitions

### 9.1. Mongoose Schemas

- Use separate files for each model
- Include proper indexing
- Follow this pattern:

```javascript
const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection from existing connectors
const mongoose_connection = require("../_core_app_connectivities/db_mongo_mongoose");

// Create a database for AI Platform
const ai_platform = mongoose.connection.useDb("ai_platform");

const ai_worker_schema = new Schema({
    _id: {
        type: mongoose.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
    },
    ref_id: {
        type: String,
        required: true,
        unique: true,
    },
    // Additional fields...
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    }
});

// Add index for faster lookups
ai_worker_schema.index({ ref_id: 1 }, { unique: true });

module.exports = ai_platform.model("ai_worker", ai_worker_schema);
```

## 10. Middleware Implementation

### 10.1. Middleware Pattern

- Export middleware as a class with methods:

```javascript
class auth_middleware {
    authenticate(req, res, next) {
        try {
            // Authentication logic
            next();
        } catch (error) {
            console.error(`FILE: auth.middleware.js | authenticate | Error:`, error);
            return res.status(401).json({
                STATUS: "ERROR",
                ERROR_FILTER: "USER_END_VIOLATION",
                ERROR_CODE: "VTWE-143782188",
                ERROR_DESCRIPTION: "Authentication failed"
            });
        }
    }
}

module.exports = new auth_middleware();
```

## 11. Validation

### 11.1. Request Validation

- Use Joi for request validation
- Implement in separate middleware:

```javascript
const Joi = require('joi');

class validator_middleware {
    validate_worker_create(req, res, next) {
        const schema = Joi.object({
            name: Joi.string().required(),
            // Other validation rules...
        });

        const { error } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                STATUS: "ERROR",
                ERROR_FILTER: "INVALID_REQUEST",
                ERROR_CODE: "VTWE-143782191",
                ERROR_DESCRIPTION: error.details[0].message
            });
        }
        
        next();
    }
}

module.exports = new validator_middleware();
```

## 12. Caching Strategy

### 12.1. Memcached Usage

- Use the `memcached_ops` helper from `_core_app_connectivities`
- Use the centralized cache time configuration:
- Our memcache is central service so ensure to use prefix for this app in all keys to avoid conflict with other apps.

```javascript
// Get from cache
const cached_data = await memcached_ops.getJsonFromMemcache(cache_key);

// Set in cache
await memcached_ops.memcached.set(
    cache_key, 
    JSON.stringify(data), 
    memcached_ops.CentralcacheTime // Use this standard value
);

// Clear from cache
await memcached_ops.deleteCacheKey(cache_key);
```

## 13. Plugin System Standards

### 13.1. Plugin Interface

- All plugins must implement a base interface
- Export plugin class for dynamic loading:

```javascript
const base_plugin = require('./base.plugin');

class openai_plugin extends base_plugin {
    getName() {
        return 'openai';
    }
    
    // Other methods implementation...
}

module.exports = openai_plugin;
```

### 13.2. Plugin Registry

- Implement a registry for plugin management
- Support dynamic loading:

```javascript
class plugin_registry {
    constructor() {
        this.plugins = {};
    }
    
    register_plugin(name, plugin_class, config) {
        this.plugins[name] = {
            class: plugin_class,
            instance: new plugin_class(config)
        };
    }
    
    // Other methods...
}

// Export singleton
module.exports = new plugin_registry();
```

## 14. Background Services

### 14.1. Service Implementation

- Use classes with start/stop methods
- Add event listeners for RabbitMQ connectivity:

```javascript
class session_cleanup_service {
    constructor() {
        this.is_running = false;
        this.interval_id = null;
    }
    
    start(interval_minutes = 60) {
        // Start service
    }
    
    stop() {
        // Stop service
    }
}

// Export singleton
module.exports = new session_cleanup_service();

// In app.js or entry point:
eventEmitter.on('rabbitMQConnected', () => {
    console.log(`FILE: app.js | rabbitMQConnected | Starting background services`);
    session_cleanup_service.start(60);
});
```

## 15. Scalability Considerations

### 15.1. Stateless Design

- API services should be stateless
- Use Redis for session storage
- Use distributed caching via Memcached
- Implement rate limiting with Redis distributed counters

### 15.2. PM2 Configuration

- Use the ecosystem.config.js for PM2 cluster mode:

```javascript
module.exports = {
    apps: [
        {
            name: 'aip-api',
            script: 'app.js',
            instances: 'max',
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        }
    ]
};
```

## 16. Security Standards

### 16.1. Authentication

- API key-based authentication for system integrations
- JWT-based authentication for admin portal
- Implement proper middleware for auth checks

### 16.2. Environment Variables

- Store sensitive information in environment variables
- Use .env files for development (but don't commit them)
- Access via process.env:

```javascript
const API_KEY = process.env.OPENAI_API_KEY;
```