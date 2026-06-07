/**
 * 
 * Munshi Service - Centralized Error Monitoring and Reporting System
 * 
 * This service provides a centralized error monitoring and reporting solution,
 * allowing errors to be reported from anywhere in the application via the event router.
 * It automatically extracts stack trace information and standardizes error reporting.
 * 
 * REPORTING METHODS:
 *  1. Directly call the function report_error_to_munshi() with the required data
 *  2. Emit an event through the event router with the data to be reported (using event ID: "MUNSHI_EVENT")
 * 
 * FALLBACK MECHANISM (Solves Circular Dependency):
 * - RabbitMQ errors (error_type: MQ_ERROR or error_code starts with RABBITMQ-) are sent directly 
 *   via HTTP API to avoid circular dependency when RabbitMQ is down
 * - For other errors, the service tries RabbitMQ queue first, then falls back to HTTP API if queue fails
 * - This ensures critical errors are always reported even when RabbitMQ is unavailable
 * 
 * Error data format:
 * {
 *   error: Error object (required for automatic stack trace extraction)
 *   error_code: Error code identifier for categorization and tracking
 *   error_title: Human-readable error title
 *   error_type: Standardized error type (DB_ERROR, API_ERROR, etc.)
 *   metadata: Additional contextual metadata for the error
 *   other_data: Other error-specific data
 *   ttl: Time to live in seconds (optional)
 * }
 * 
 * Note: app_id is configured via the munshi_app_id variable in this service file
 * and should not be passed in the event data.
 * 
 * Standard Error Types:
 * - DB_ERROR: All database-related errors
 * - CACHE_ERROR: All cache-related errors
 * - MQ_ERROR: All message queue-related errors (uses HTTP API fallback automatically)
 * - API_ERROR: All external API-related errors
 * - AUTH_ERROR: All authentication/authorization errors
 * - VALIDATION_ERROR: All data validation errors
 * - SYSTEM_ERROR: All system resource errors
 * - UNEXPECTED_ERROR: Any unexpected errors that don't fit other categories
 * 
 ************************************************************************/

/**
 * 
 * Importing Basic data/connectivity services.
 * 
 ********************/
const path = require('path');
const axios = require('axios');
const eventEmitter = require('../_core_app_connectivities/emitter');
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');
const event_router = require('./event_router.service');

/**
 * 
 * Configuring the Munshi Service
 * 
 *********************/
const munshi_app_id = 1020; // OneID Application ID for Munshi Service
const munshi_ttl = 2592000; // 30 days by default
const munshi_queue_name = 'VT_MUNSHI_SERVICE_MAIN'; // Queue name for log processing
const munshi_app_address = '172.18.0.26:7575'; // Munshi Service Address
const munshi_app_api_key = '24df7feb2b3942a32273d55fe25f1'; // Munshi API Key, can be found after registering your app with Munshi

/**
 * 
 * Send log data directly to Munshi API endpoint (HTTP fallback)
 * 
 * This function provides a fallback mechanism to report logs when RabbitMQ is unavailable.
 * It's critical for reporting RabbitMQ-related errors to avoid circular dependency.
 * 
 * @param {object} log_data - The log data to be sent (system or general log)
 * @param {string} log_category - Category: 'system' or 'general'
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 * 
 **********/
async function send_log_to_munshi_api(log_data, log_category = 'system') {
    try {
        const api_url = `http://${munshi_app_address}/api/logs/${log_category}`;
        
        console.log(`FILE: munshi.service.js | send_log_to_munshi_api | Sending ${log_category} log to Munshi API: ${log_data.error_code || log_data.log_type}`);
        
        const response = await axios.post(api_url, log_data, {
            headers: {
                'x-api-key': munshi_app_api_key,
                'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
        });
        
        if (response.status === 200 || response.status === 201) {
            console.log(`FILE: munshi.service.js | send_log_to_munshi_api | Successfully sent log to Munshi API`);
            return true;
        } else {
            console.warn(`FILE: munshi.service.js | send_log_to_munshi_api | Unexpected response status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`FILE: munshi.service.js | send_log_to_munshi_api | Failed to send log to Munshi API:`, error.message);
        return false;
    }
}

/**
 * For backward compatibility, maintain support for the 'report_to_munshi' event
 */
eventEmitter.on('report_to_munshi', (event_data) => {
    try {
        console.log(`FILE: munshi.service.js | legacy_event_handler | Received direct event, forwarding to event router`);
        // Forward to the event router (new pattern)
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', event_data);
    } catch (error) {
        console.error(`FILE: munshi.service.js | legacy_event_handler | Error forwarding event:`, error);
    }
});

/*** 
*
*	Register with the event router to handle MUNSHI_EVENT events
*
**********/
function register_munshi_event_handler() {
    try {
        console.log(`FILE: munshi.service.js | register_munshi_event_handler | Registering handler for MUNSHI_EVENT`);
        
        event_router.register_handler('MUNSHI_EVENT', async (event_data) => {
            try {
                console.log(`FILE: munshi.service.js | MUNSHI_EVENT handler | Received error data: ${event_data.error_title}`);
                
                /**
                * Start - Let's handle events to customize the data/event reporting to Munshi, if required.
                ***/

                // Any customization to the event data can be done here based on error_type or other criteria
                // if(event_data.error_type === "DB_ERROR") { ... }

                /**
                * Pass the event data to the Munshi function to be reported.
                ***/
                await report_to_munshi(event_data);
                
            } catch (error) {
                console.error(`FILE: munshi.service.js | MUNSHI_EVENT handler | Error processing error data:`, error);
            }
        }, {
            priority: 1, // High priority for error reporting
            timeout: 10000, // 10 second timeout
            name: 'munshi_error_handler'
        });
        
        console.log(`FILE: munshi.service.js | register_munshi_event_handler | Successfully registered MUNSHI_EVENT handler`);
    } catch (error) {
        console.error(`FILE: munshi.service.js | register_munshi_event_handler | Failed to register handler:`, error);
    }
}

// Register the handler when this module is loaded
register_munshi_event_handler();

/*** 
*
*	Register with the event router to handle GENERAL_LOG_EVENT events
*
**********/
function register_general_log_event_handler() {
    try {
        console.log(`FILE: munshi.service.js | register_general_log_event_handler | Registering handler for GENERAL_LOG_EVENT`);
        
        event_router.register_handler('GENERAL_LOG_EVENT', async (event_data) => {
            try {
                console.log(`FILE: munshi.service.js | GENERAL_LOG_EVENT handler | Received log data: ${event_data.log_type} - ${event_data.plain_text}`);
                
                /**
                * Pass the event data to the general log function to be reported.
                ***/
                await publish_general_log(event_data);
                
            } catch (error) {
                console.error(`FILE: munshi.service.js | GENERAL_LOG_EVENT handler | Error processing log data:`, error);
            }
        }, {
            priority: 1, // High priority for logging
            timeout: 10000, // 10 second timeout
            name: 'munshi_general_log_handler'
        });
        
        console.log(`FILE: munshi.service.js | register_general_log_event_handler | Successfully registered GENERAL_LOG_EVENT handler`);
    } catch (error) {
        console.error(`FILE: munshi.service.js | register_general_log_event_handler | Failed to register handler:`, error);
    }
}

// Register the general log handler when this module is loaded
register_general_log_event_handler();

/**
 * 
 * This function reports errors to the Munshi service via the queue-based logging system.
 * 
 * It automatically extracts stack trace information from the error object
 * and standardizes the error reporting format, then publishes to the VT_MUNSHI_SERVICE_MAIN queue.
 * 
 * @param {object} event_data - The error data to be reported
 * @param {Error} event_data.error - The JavaScript Error object
 * @param {string} event_data.error_code - Error code identifier
 * @param {string} event_data.error_title - Human-readable error title
 * @param {string} event_data.error_type - Standardized error type
 * @param {object} event_data.metadata - Additional contextual metadata
 * @param {object} event_data.other_data - Other error-specific data
 * @param {number} event_data.ttl - Time to live in seconds (optional)
 * 
 **********/
async function report_to_munshi(event_data) {
    try {
        console.log(`FILE: munshi.service.js | report_to_munshi | Processing error: ${event_data.error_title} [${event_data.error_type}]`);
        
        // Extract stack trace information
        let origin_trace = extract_stack_trace(event_data.error);
        
        // Set default values for unspecified fields
        const ttl = event_data.ttl || munshi_ttl;
        const metadata = {
            ...event_data.metadata || {},
            reported_via: 'munshi_service',
            error_type: event_data.error_type,
            nonblocking: event_data.nonblocking || 0
        };
        const other_data = {
            ...event_data.other_data || {},
            error_message: event_data.error.message,
            error_stack: event_data.error.stack,
            reported_at: Math.floor(Date.now() / 1000)
        };

        // Prepare system log data for the queue-based logging system
        const system_log_data = {
            app_id: munshi_app_id,
            error_code: event_data.error_code,
            error_title: event_data.error_title,
            origin_trace: origin_trace,
            metadata: metadata,
            other_data: other_data,
            ttl: ttl,
            entry_time: Math.floor(Date.now() / 1000)
        };

        // Check if this is a RabbitMQ-related error (to avoid circular dependency)
        const is_rabbitmq_error = event_data.error_code && event_data.error_code.startsWith('RABBITMQ-');
        const is_mq_error = event_data.error_type === 'MQ_ERROR';
        
        // For RabbitMQ errors, use HTTP API directly to avoid circular dependency
        if (is_rabbitmq_error || is_mq_error) {
            console.log(`FILE: munshi.service.js | report_to_munshi | Detected RabbitMQ error, using HTTP API fallback`);
            const api_success = await send_log_to_munshi_api(system_log_data, 'system');
            
            if (api_success) {
                console.log(`FILE: munshi.service.js | report_to_munshi | Error reported via HTTP API: ${event_data.error_code} - ${event_data.error_title}`);
            } else {
                console.error(`FILE: munshi.service.js | report_to_munshi | Failed to report RabbitMQ error via HTTP API`);
            }
            return;
        }

        // For non-RabbitMQ errors, try queue first, then fallback to HTTP API
        try {
            // Add log type and timestamp for queue processing
            const queue_message = {
                ...system_log_data,
                log_type: 'system',
                queued_at: Math.floor(Date.now() / 1000)
            };
            
            await rabbitmq_ops.sendToRabbitMQ(munshi_queue_name, queue_message);
            console.log(`FILE: munshi.service.js | report_to_munshi | Error reported to Munshi queue: ${event_data.error_code} - ${event_data.error_title}`);
        } catch (queue_error) {
            console.error(`FILE: munshi.service.js | report_to_munshi | Failed to report to queue, attempting HTTP API fallback:`, queue_error.message);
            
            // Try HTTP API as fallback
            const api_success = await send_log_to_munshi_api(system_log_data, 'system');
            
            if (api_success) {
                console.log(`FILE: munshi.service.js | report_to_munshi | Error reported via HTTP API fallback: ${event_data.error_code}`);
            } else {
                console.error(`FILE: munshi.service.js | report_to_munshi | Both queue and HTTP API failed for error: ${event_data.error_code}`);
                
                // Last resort: retry queue after a delay
                setTimeout(async () => {
                    try {
                        const queue_message = {
                            ...system_log_data,
                            log_type: 'system',
                            queued_at: Math.floor(Date.now() / 1000)
                        };
                        
                        await rabbitmq_ops.sendToRabbitMQ(munshi_queue_name, queue_message);
                        console.log(`FILE: munshi.service.js | report_to_munshi | Queue retry successful for error: ${event_data.error_code}`);
                    } catch (retry_error) {
                        console.error(`FILE: munshi.service.js | report_to_munshi | Queue retry also failed for error: ${event_data.error_code}`, retry_error.message);
                    }
                }, 2000); // 2 second delay
            }
        }
    } catch (error) {
        console.error(`FILE: munshi.service.js | report_to_munshi | Error processing error data:`, error);
    }
}

/**
 * 
 * This function publishes general logs to the Munshi queue for activity tracking.
 * 
 * @param {object} event_data - The general log data to be published
 * @param {string} event_data.log_type - Activity type identifier
 * @param {string} event_data.plain_text - Human-readable description
 * @param {number} event_data.oneid - User ID performing action (optional)
 * @param {string} event_data.org_id - Organization identifier (optional)
 * @param {string} event_data.entity_id - ID of affected entity (optional)
 * @param {string} event_data.entity_type - Type of affected entity (optional)
 * @param {object} event_data.metadata - Additional contextual information (optional)
 * @param {array} event_data.changes - Array of field changes (optional)
 * @param {object} event_data.other_data - Activity-specific data (optional)
 * @param {number} event_data.ttl - Time to live in seconds (optional)
 * 
 **********/
async function publish_general_log(event_data) {
    try {
        console.log(`FILE: munshi.service.js | publish_general_log | Processing general log: ${event_data.log_type} - ${event_data.plain_text}`);
        
        // Set default values for unspecified fields
        const ttl = event_data.ttl || munshi_ttl;
        
        // Prepare general log data for the queue-based logging system
        const general_log_data = {
            app_id: munshi_app_id,
            oneid: event_data.oneid || null,
            org_id: event_data.org_id || null,
            entity_id: event_data.entity_id || null,
            entity_type: event_data.entity_type || null,
            log_type: event_data.log_type,
            plain_text: event_data.plain_text,
            metadata: {
                ...event_data.metadata || {},
                reported_via: 'munshi_service'
            },
            changes: event_data.changes || [],
            other_data: {
                ...event_data.other_data || {},
                reported_at: Math.floor(Date.now() / 1000)
            },
            ttl: ttl,
            entry_time: Math.floor(Date.now() / 1000)
        };

        // Publish to the queue-based logging system
        try {
            // Add log type and timestamp for queue processing
            const queue_message = {
                ...general_log_data,
                log_type: event_data.log_type, // Preserve the original log_type for general logs
                queued_at: Math.floor(Date.now() / 1000)
            };
            
            await rabbitmq_ops.sendToRabbitMQ(munshi_queue_name, queue_message);
            console.log(`FILE: munshi.service.js | publish_general_log | General log published to Munshi queue: ${event_data.log_type} - ${event_data.plain_text}`);
        } catch (queue_error) {
            console.error(`FILE: munshi.service.js | publish_general_log | Failed to publish to queue, attempting HTTP API fallback:`, queue_error.message);
            
            // Try HTTP API as fallback
            const api_success = await send_log_to_munshi_api(general_log_data, 'general');
            
            if (api_success) {
                console.log(`FILE: munshi.service.js | publish_general_log | General log published via HTTP API fallback: ${event_data.log_type}`);
            } else {
                console.error(`FILE: munshi.service.js | publish_general_log | Both queue and HTTP API failed for log: ${event_data.log_type}`);
                
                // Last resort: retry queue after a delay
                setTimeout(async () => {
                    try {
                        const queue_message = {
                            ...general_log_data,
                            log_type: event_data.log_type,
                            queued_at: Math.floor(Date.now() / 1000)
                        };
                        
                        await rabbitmq_ops.sendToRabbitMQ(munshi_queue_name, queue_message);
                        console.log(`FILE: munshi.service.js | publish_general_log | Queue retry successful for log: ${event_data.log_type}`);
                    } catch (retry_error) {
                        console.error(`FILE: munshi.service.js | publish_general_log | Queue retry also failed for log: ${event_data.log_type}`, retry_error.message);
                    }
                }, 2000); // 2 second delay
            }
        }
    } catch (error) {
        console.error(`FILE: munshi.service.js | publish_general_log | Error processing general log data:`, error);
    }
}

/**
 * Extract file and function information from the stack trace
 * 
 * @param {Error} error - The Error object containing the stack trace
 * @returns {object} Extracted stack trace information
 */
function extract_stack_trace(error) {
    try {
        console.log(`FILE: munshi.service.js | extract_stack_trace | Extracting stack trace information`);
        
        // Get stack trace information
        const stack_lines = error.stack.split('\n');
        const caller_line = stack_lines[1] || ''; // First line after Error message
        
        // Parse file information from stack trace
        // Example format: "    at authenticate (/path/to/file.js:42:3)"
        const match = caller_line.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) || 
                      caller_line.match(/at\s+()(.*):(\d+):(\d+)/);
        
        if (!match) {
            console.warn(`FILE: munshi.service.js | extract_stack_trace | Failed to parse stack trace: ${caller_line}`);
            return {
                file_path: 'unknown',
                file_name: 'unknown.js',
                function_name: 'anonymous',
                line_no: 0,
                column_no: 0
            };
        }
        
        const [, func_name, file_path, line_no, column_no] = match;
        const file_name = path.basename(file_path);
        
        const trace_info = {
            file_path: file_path,
            file_name: file_name,
            function_name: func_name || 'anonymous',
            line_no: parseInt(line_no, 10),
            column_no: parseInt(column_no, 10)
        };
        
        console.log(`FILE: munshi.service.js | extract_stack_trace | Extracted trace: ${file_name}:${line_no} in ${func_name || 'anonymous'}`);
        return trace_info;
        
    } catch (error) {
        console.error(`FILE: munshi.service.js | extract_stack_trace | Error extracting stack trace:`, error);
        return {
            file_path: 'unknown',
            file_name: 'unknown.js',
            function_name: 'anonymous',
            line_no: 0,
            column_no: 0
        };
    }
}

/**
 * Create a convenience wrapper for the error_reporter function from utils
 * This preserves backward compatibility with existing code using the utility
 * 
 * @param {Error} error - The JavaScript Error object
 * @param {string} error_code - Error code identifier
 * @param {string} error_title - Human-readable error title
 * @param {string} error_type - Standardized error type
 * @param {object} metadata - Additional contextual metadata
 * @param {object} other_data - Other error-specific data
 * @param {number} ttl - Time to live in seconds (optional)
 */
function report_error_to_munshi(error, error_code, error_title, error_type, metadata = {}, other_data = {}, nonblocking = 0, ttl = null) {
    try {
        console.log(`FILE: munshi.service.js | report_error_to_munshi | Reporting error: ${error_code} - ${error_title}`);
        
        // Prepare the event data
        const event_data = {
            error: error,
            error_code: error_code,
            error_title: error_title,
            error_type: error_type,
            metadata: metadata,
            other_data: other_data,
            nonblocking: nonblocking
        };
        
        // Add optional parameters if provided
        if (ttl !== null) {
            event_data.ttl = ttl;
        }
        
        // Report to Munshi directly rather than through the event router
        // This prevents circular dependencies if error occurs in the event router
        report_to_munshi(event_data);
        
        console.log(`FILE: munshi.service.js | report_error_to_munshi | Error reported successfully: ${error_code}`);
    } catch (reporter_error) {
        console.error(`FILE: munshi.service.js | report_error_to_munshi | Error in error reporter:`, reporter_error);
    }
}

/**
 * Get the status of the Munshi service and RabbitMQ connection
 * 
 * @returns {object} Status information
 */
function get_munshi_status() {
    try {
        const channel_mq = rabbitmq_ops.getChannelMQ();
        const queue_status = {
            queue_name: munshi_queue_name,
            channel_available: !!channel_mq,
            status: channel_mq ? 'connected' : 'disconnected'
        };
        
        return {
            service_name: 'munshi_service',
            app_id: munshi_app_id,
            default_ttl: munshi_ttl,
            queue_name: munshi_queue_name,
            queue_status: queue_status,
            event_router_integrated: true,
            backward_compatible: true,
            self_sufficient: true
        };
    } catch (error) {
        console.error(`FILE: munshi.service.js | get_munshi_status | Error getting status:`, error);
        return {
            service_name: 'munshi_service',
            status: 'error',
            error: error.message
        };
    }
}

/**
 * Create a convenience wrapper for general log reporting
 * This provides direct function call capability for general activity logging
 * 
 * @param {string} log_type - Activity type identifier
 * @param {string} plain_text - Human-readable description
 * @param {number} oneid - User ID performing action (optional)
 * @param {string} org_id - Organization identifier (optional)
 * @param {string} entity_id - ID of affected entity (optional)
 * @param {string} entity_type - Type of affected entity (optional)
 * @param {object} metadata - Additional contextual information (optional)
 * @param {array} changes - Array of field changes (optional)
 * @param {object} other_data - Activity-specific data (optional)
 * @param {number} ttl - Time to live in seconds (optional)
 */
function log_general_activity(log_type, plain_text, oneid = null, org_id = null, entity_id = null, entity_type = null, metadata = {}, changes = [], other_data = {}, ttl = null) {
    try {
        console.log(`FILE: munshi.service.js | log_general_activity | Logging activity: ${log_type} - ${plain_text}`);
        
        // Prepare the event data
        const event_data = {
            log_type: log_type,
            plain_text: plain_text,
            oneid: oneid,
            org_id: org_id,
            entity_id: entity_id,
            entity_type: entity_type,
            metadata: metadata,
            changes: changes,
            other_data: other_data
        };
        
        // Add optional parameters if provided
        if (ttl !== null) {
            event_data.ttl = ttl;
        }
        
        // Publish general log directly
        publish_general_log(event_data);
        
        console.log(`FILE: munshi.service.js | log_general_activity | Activity logged successfully: ${log_type}`);
    } catch (reporter_error) {
        console.error(`FILE: munshi.service.js | log_general_activity | Error in general log reporter:`, reporter_error);
    }
}

// Export functions for direct calling
module.exports = {
    report_to_munshi,
    report_error_to_munshi,
    publish_general_log,
    log_general_activity,
    get_munshi_status,
    send_log_to_munshi_api // Export for direct API calls if needed
}; 