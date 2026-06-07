/**
 * Munshi Example - Updated for Queue-Based Logging Integration
 * -----------------------------------------------------------
 * 
 * This file demonstrates how to use the updated munshi.service.js library
 * integrated with the queue-based logging system and Event Router.
 * It shows typical patterns and best practices for reporting errors.
 * 
 * The examples follow VT NodeJS standards and demonstrate integration with:
 * - Queue-based logging system (VT_MUNSHI_SERVICE_MAIN)
 * - Event Router for centralized event handling
 * - Real-time events for admin dashboard
 * - Proper error categorization and TTL management
 */

// Import dependencies following VT standards
const eventEmitter = require('../_core_apps_connectivities/emitter');
const munshi_service = require('./munshi.service');

/**
 * Example 1: Basic Error Reporting via Event Router (Recommended)
 * --------------------------------------------------------------
 * Report a basic error using the Event Router pattern
 */
function example_basic_error_reporting() {
    try {
        console.log(`FILE: munshi_example.js | example_basic_error_reporting | Simulating basic error scenario`);
        
        // Simulate an error
        throw new Error('This is a test error for demonstration');
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_basic_error_reporting | Error occurred:`, error);
        
        // Report to Munshi via Event Router (recommended approach)
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'EXAMPLE-1001',
            error_title: 'Example Basic Error',
            error_type: 'UNEXPECTED_ERROR',
            metadata: { 
                example_type: 'basic_demonstration',
                severity: 'low'
            },
            other_data: { 
                function_name: 'example_basic_error_reporting',
                demo: true
            }
        });
        
        console.log(`FILE: munshi_example.js | example_basic_error_reporting | Error reported via Event Router`);
    }
}

/**
 * Example 2: Database Error Reporting
 * ----------------------------------
 * Demonstrate handling and reporting database-related errors
 */
async function example_database_error_reporting() {
    try {
        console.log(`FILE: munshi_example.js | example_database_error_reporting | Simulating database operation`);
        
        // Simulate a database error
        const db_error = new Error('Connection to database failed');
        db_error.code = 'ECONNREFUSED';
        db_error.errno = -61;
        
        throw db_error;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_database_error_reporting | Database error:`, error);
        
        // Report via Event Router with DB_ERROR type
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'DB-ERROR-2001',
            error_title: 'Database Connection Failure',
            error_type: 'DB_ERROR',
            metadata: {
                database: 'munshi_logs',
                operation: 'connection',
                host: 'localhost:27017',
                retry_attempted: false
            },
            other_data: {
                connection_timeout: 5000,
                error_code: error.code,
                errno: error.errno
            },
            ttl: 2592000 // 30 days retention for critical DB errors
        });
        
        console.log(`FILE: munshi_example.js | example_database_error_reporting | Database error reported with extended TTL`);
    }
}

/**
 * Example 3: API Error Reporting with Custom TTL
 * ---------------------------------------------
 * Demonstrate handling external API errors with custom retention
 */
async function example_api_error_handling() {
    try {
        console.log(`FILE: munshi_example.js | example_api_error_handling | Making external API call`);
        
        // Simulate an API timeout error
        const api_error = new Error('Request timeout');
        api_error.response = {
            status: 504,
            statusText: 'Gateway Timeout',
            data: { error: 'Upstream service unavailable' }
        };
        api_error.config = {
            url: '/api/external/data',
            method: 'GET',
            timeout: 5000
        };
        
        throw api_error;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_api_error_handling | API call failed:`, error);
        
        // Report with API_ERROR type and custom TTL
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'API-ERROR-3001',
            error_title: 'External API Timeout',
            error_type: 'API_ERROR',
            metadata: {
                endpoint: error.config?.url || 'unknown',
                method: error.config?.method || 'unknown',
                status_code: error.response?.status || 'unknown',
                timeout_duration: error.config?.timeout || 'unknown'
            },
            other_data: {
                response_data: error.response?.data || {},
                status_text: error.response?.statusText || 'unknown',
                request_id: generate_request_id()
            },
            ttl: 604800 // 7 days for API errors (shorter retention)
        });
        
        console.log(`FILE: munshi_example.js | example_api_error_handling | API error reported with custom TTL`);
    }
}

/**
 * Example 4: Cache Error Reporting
 * -------------------------------
 * Demonstrate reporting cache-related errors
 */
function example_cache_error_reporting() {
    try {
        console.log(`FILE: munshi_example.js | example_cache_error_reporting | Processing cache operation`);
        
        // Simulate a cache error
        throw new Error('Cache connection timeout');
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_cache_error_reporting | Cache operation failed:`, error);
        
        // Report cache error
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'CACHE-4001',
            error_title: 'Cache Connection Timeout',
            error_type: 'CACHE_ERROR',
            metadata: { 
                cache_type: 'redis',
                operation: 'get',
                timeout_duration: '5000ms'
            },
            other_data: { 
                cache_key: 'user_session_12345',
                fallback_available: true,
                retry_count: 3
            }
        });
        
        console.log(`FILE: munshi_example.js | example_cache_error_reporting | Cache error reported`);
    }
}

/**
 * Example 5: Authentication Error with Security Context
 * ---------------------------------------------------
 * Report an authentication error with security-related metadata
 */
function example_auth_error(user_credentials) {
    console.log(`FILE: munshi_example.js | example_auth_error | Validating user credentials`);
    
    try {
        if (!user_credentials || !user_credentials.token) {
            const error = new Error('Missing authentication token');
            
            // Report AUTH_ERROR with security context
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'AUTH-5001',
                error_title: 'Missing Authentication Token',
                error_type: 'AUTH_ERROR',
                metadata: {
                    auth_method: 'jwt',
                    endpoint: '/api/secure/data',
                    user_agent: 'Mozilla/5.0...',
                    ip_address: '192.168.1.100'
                },
                other_data: {
                    token_present: false,
                    headers_received: user_credentials ? Object.keys(user_credentials) : [],
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 1209600 // 14 days for auth errors
            });
            
            throw error;
        }
        
        // Simulate token validation
        if (user_credentials.token !== 'valid-jwt-token') {
            const error = new Error('Invalid authentication token');
            
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'AUTH-5002',
                error_title: 'Invalid Authentication Token',
                error_type: 'AUTH_ERROR',
                metadata: {
                    auth_method: 'jwt',
                    token_length: user_credentials.token.length,
                    validation_method: 'signature_check'
                },
                other_data: {
                    token_expired: false,
                    token_malformed: true,
                    attempt_number: 1
                }
            });
            
            throw error;
        }
        
        return { user_id: '12345', role: 'admin' };
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_auth_error | Authentication failed:`, error);
        throw error;
    }
}

/**
 * Example 6: Validation Error with Field Details
 * ---------------------------------------------
 * Demonstrate reporting data validation errors with specific field information
 */
function example_validation_error(user_data) {
    console.log(`FILE: munshi_example.js | example_validation_error | Validating user registration data`);
    
    try {
        const validation_errors = [];
        
        // Email validation
        if (!user_data.email) {
            validation_errors.push('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(user_data.email)) {
            validation_errors.push('Email format is invalid');
        }
        
        // Password validation
        if (!user_data.password) {
            validation_errors.push('Password is required');
        } else if (user_data.password.length < 8) {
            validation_errors.push('Password must be at least 8 characters');
        }
        
        // Phone validation
        if (user_data.phone && !/^\+?[\d\s\-\(\)]+$/.test(user_data.phone)) {
            validation_errors.push('Phone number format is invalid');
        }
        
        if (validation_errors.length > 0) {
            const error = new Error(`Validation failed: ${validation_errors.join(', ')}`);
            
            // Report validation error with detailed field information
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'VALIDATION-6001',
                error_title: 'User Registration Validation Failed',
                error_type: 'VALIDATION_ERROR',
                metadata: {
                    validation_source: 'user_registration',
                    form_type: 'signup',
                    failed_fields: validation_errors.length,
                    total_fields: Object.keys(user_data).length
                },
                other_data: {
                    validation_errors: validation_errors,
                    submitted_fields: Object.keys(user_data),
                    data_types: Object.keys(user_data).reduce((acc, key) => {
                        acc[key] = typeof user_data[key];
                        return acc;
                    }, {})
                }
            });
            
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_validation_error | Validation failed:`, error);
        throw error;
    }
}

/**
 * Example 7: Using Direct Function Call (Legacy Compatibility)
 * ----------------------------------------------------------
 * For code that needs to avoid event router dependency
 * Note: app_id is configured in munshi.service.js and not passed as parameter
 */
function example_legacy_function_call() {
    try {
        console.log(`FILE: munshi_example.js | example_legacy_function_call | Using direct function call approach`);
        
        // Operation that fails
        throw new Error('Legacy pattern demonstration error');
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_legacy_function_call | Legacy error:`, error);
        
        // Using direct function call (backward compatibility)
        munshi_service.report_error_to_munshi(
            error,
            'LEGACY-7001',
            'Legacy Function Call Pattern',
            'SYSTEM_ERROR',
            { 
                pattern: 'legacy',
                compatibility: 'backward'
            },
            { 
                notes: 'Direct function call still supported',
                migration_recommended: true
            },
            0, // nonblocking
            1209600 // 14 days TTL
        );
        
        console.log(`FILE: munshi_example.js | example_legacy_function_call | Error reported via direct function call`);
    }
}

/**
 * Example 8: Message Queue Error with Retry Context
 * ------------------------------------------------
 * Demonstrate reporting message queue related errors
 */
async function example_mq_error_reporting() {
    try {
        console.log(`FILE: munshi_example.js | example_mq_error_reporting | Processing message queue operation`);
        
        // Simulate MQ connection error
        const mq_error = new Error('RabbitMQ connection lost');
        mq_error.code = 'CONNECTION_LOST';
        mq_error.details = {
            queue: 'VT_MUNSHI_SERVICE_MAIN',
            host: '172.18.0.88',
            port: 5672
        };
        
        throw mq_error;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_mq_error_reporting | Message queue error:`, error);
        
        // Report MQ_ERROR with retry context
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'MQ-ERROR-8001',
            error_title: 'RabbitMQ Connection Lost',
            error_type: 'MQ_ERROR',
            metadata: {
                queue_name: error.details?.queue || 'unknown',
                mq_host: error.details?.host || 'unknown',
                mq_port: error.details?.port || 'unknown',
                connection_type: 'consumer'
            },
            other_data: {
                error_code: error.code,
                auto_retry_enabled: true,
                max_retries: 30,
                reconnection_delay: 10000,
                last_successful_connection: Date.now() - 60000
            },
            ttl: 3600 // 1 hour for MQ connection errors (short retention)
        });
        
        console.log(`FILE: munshi_example.js | example_mq_error_reporting | MQ error reported with retry context`);
    }
}

/**
 * Example 9: System Resource Error
 * -------------------------------
 * Demonstrate reporting system resource related errors
 */
function example_system_error_reporting() {
    try {
        console.log(`FILE: munshi_example.js | example_system_error_reporting | Checking system resources`);
        
        // Simulate memory limit error
        const system_error = new Error('Memory limit exceeded');
        system_error.type = 'ENOMEM';
        system_error.code = 'MEMORY_LIMIT';
        
        throw system_error;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_system_error_reporting | System error:`, error);
        
        // Report SYSTEM_ERROR with resource context
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'SYSTEM-9001',
            error_title: 'Memory Limit Exceeded',
            error_type: 'SYSTEM_ERROR',
            metadata: {
                resource_type: 'memory',
                error_type: error.type || 'unknown',
                process_id: process.pid,
                node_version: process.version
            },
            other_data: {
                memory_usage: process.memoryUsage(),
                uptime: process.uptime(),
                load_average: require('os').loadavg(),
                free_memory: require('os').freemem()
            },
            ttl: 7776000 // 90 days for system errors (long retention)
        });
        
        console.log(`FILE: munshi_example.js | example_system_error_reporting | System error reported with resource context`);
    }
}

/**
 * Example 10: Service Status Check
 * -------------------------------
 * Demonstrate how to check Munshi service status
 */
function example_service_status_check() {
    try {
        console.log(`FILE: munshi_example.js | example_service_status_check | Checking Munshi service status`);
        
        const status = munshi_service.get_munshi_status();
        console.log(`FILE: munshi_example.js | example_service_status_check | Service status:`, status);
        
        if (status.queue_status && status.queue_status.status === 'connected') {
            console.log(`FILE: munshi_example.js | example_service_status_check | Munshi service is operational`);
        } else {
            console.warn(`FILE: munshi_example.js | example_service_status_check | Munshi service may have issues`);
        }
        
        return status;
    } catch (error) {
        console.error(`FILE: munshi_example.js | example_service_status_check | Error checking status:`, error);
        return null;
    }
}

/**
 * Utility function to generate request IDs
 */
function generate_request_id() {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Demonstration runner - executes all examples
 */
async function run_all_examples() {
    console.log(`FILE: munshi_example.js | run_all_examples | Starting Munshi service examples demonstration`);
    
    try {
        // Basic examples
        example_basic_error_reporting();
        await example_database_error_reporting();
        await example_api_error_handling();
        
        // Advanced examples
        example_cache_error_reporting();
        example_auth_error({ token: 'invalid-token' });
        
        // Validation example
        try {
            example_validation_error({ email: 'invalid-email', password: '123' });
        } catch (validation_error) {
            console.log(`FILE: munshi_example.js | run_all_examples | Validation example completed as expected`);
        }
        
        // Legacy and system examples
        example_legacy_function_call();
        await example_mq_error_reporting();
        example_system_error_reporting();
        
        // Status check
        example_service_status_check();
        
        console.log(`FILE: munshi_example.js | run_all_examples | All examples completed successfully`);
    } catch (error) {
        console.error(`FILE: munshi_example.js | run_all_examples | Error running examples:`, error);
    }
}

// Export functions for individual testing and demonstration
module.exports = {
    example_basic_error_reporting,
    example_database_error_reporting,
    example_api_error_handling,
    example_cache_error_reporting,
    example_auth_error,
    example_validation_error,
    example_legacy_function_call,
    example_mq_error_reporting,
    example_system_error_reporting,
    example_service_status_check,
    run_all_examples
}; 