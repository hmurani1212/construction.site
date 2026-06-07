/**
 * Event Router Service
 * ===================
 * 
 * This module provides a centralized event routing system for the application.
 * Instead of setting up multiple event listeners, this service acts as a single entry point
 * for all events, routing them to the appropriate handlers based on an event ID.
 * 
 * Benefits:
 * ---------
 * 1. Reduced overhead: One listener instead of many
 * 2. Centralized event management: All event handling logic in one place
 * 3. Simplified event registration: Register handlers for specific event IDs
 * 4. Better debugging: Track all events through a single point
 * 5. Enhanced scalability: Easy to add new event types without modifying the event emitter
 * 
 * Usage Examples:
 * --------------
 * 1. Register an event handler:
 *    event_router.register_handler('USER_CREATED', (event_data) => {
 *      // Handle user created event
 *    });
 * 
 * 2. Emit an event:
 *    eventEmitter.emit('event_router', 'USER_CREATED', { user_id: '123', name: 'John Doe' });
 * 
 * 3. Register a RabbitMQ publisher:
 *    event_router.register_rabbitmq_publisher('SEND_EMAIL', 'email_queue');
 * 
 * 4. Register a handler with validation:
 *    event_router.register_handler('UPDATE_PROFILE', validate_profile_data, update_profile_handler);
 * 
 * Advanced Usage:
 * --------------
 * 1. Event priority (handlers execute in priority order, lower number = higher priority):
 *    event_router.register_handler('CRITICAL_EVENT', handler, { priority: 1 });
 *    event_router.register_handler('NORMAL_EVENT', handler, { priority: 5 });
 * 
 * 2. Event timeout (for handlers that should complete within a time limit):
 *    event_router.register_handler('API_CALL', handler, { timeout: 5000 }); // 5 seconds
 * 
 * 3. Event logging:
 *    event_router.set_log_level('debug'); // Options: 'error', 'warn', 'info', 'debug'
 */

// Import required dependencies
const axios = require('axios');
const moment = require('moment');
const eventEmitter = require('../_core_app_connectivities/emitter');
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');
const memcached_ops = require('../_core_app_connectivities/memcache');

// Constants
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// event_router class
class event_router {
  constructor() {
    this.handlers = {};
    this.rabbitmq_publishers = {};
    this.middlewares = [];
    this.log_level = LOG_LEVELS.INFO;
    
    // Initialize the router by setting up the main event listener
    this._initialize_router();
  }

  /**
   * Initialize the event router by setting up the main event listener
   * @private
   */
  _initialize_router() {
    eventEmitter.on('event_router', async (event_id, event_data) => {
      const start_time = Date.now();
      const log_context = {
        event_id,
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        execution_time_ms: null
      };

      try {
        this._log_event('debug', `Received event: ${event_id}`, { ...log_context, event_data });

        // Skip processing if no handlers registered for this event
        if (!this.handlers[event_id] && !this.rabbitmq_publishers[event_id]) {
          this._log_event('warn', `No handlers registered for event: ${event_id}`, log_context);
          return;
        }

        // Apply middlewares
        let processed_event_data = { ...event_data };
        for (const middleware of this.middlewares) {
          processed_event_data = await middleware(event_id, processed_event_data);
        }

        // Execute handlers in priority order
        const handlers = this.handlers[event_id] || [];
        if (handlers.length > 0) {
          // Sort handlers by priority (lower numbers execute first)
          const sorted_handlers = [...handlers].sort((a, b) => a.priority - b.priority);
          
          for (const handler of sorted_handlers) {
            try {
              // Execute the handler with timeout if specified
              if (handler.timeout) {
                await this._execute_with_timeout(handler.fn, processed_event_data, handler.timeout);
              } else {
                await handler.fn(processed_event_data);
              }
            } catch (handler_error) {
              this._log_event('error', `Handler error for event ${event_id}`, { 
                ...log_context, 
                handler: handler.name || 'anonymous', 
                error: handler_error.message 
              });
              // Continue processing other handlers even if one fails
            }
          }
        }

        // Publish to RabbitMQ if a publisher is registered
        if (this.rabbitmq_publishers[event_id]) {
          const { queue_name, options } = this.rabbitmq_publishers[event_id];
          await rabbitmq_ops.publishToQueue(queue_name, processed_event_data, options);
          this._log_event('debug', `Published event to RabbitMQ queue: ${queue_name}`, log_context);
        }

        // Log execution time
        const execution_time_ms = Date.now() - start_time;
        this._log_event('debug', `Event processing completed: ${event_id}`, { 
          ...log_context, 
          execution_time_ms 
        });

      } catch (error) {
        console.error(`FILE: event_router.service.js | _initialize_router | Error processing event: ${event_id}`, error);
        this._log_event('error', `Error processing event: ${event_id}`, { 
          ...log_context, 
          error: error.message,
          stack: error.stack
        });
      }
    });

    console.log(`FILE: event_router.service.js | _initialize_router | Event Router initialized and ready to process events`);
    this._log_event('info', 'Event Router initialized and ready to process events');
  }

  /**
   * Execute a function with a timeout
   * @private
   * @param {Function} fn - The function to execute
   * @param {Object} data - The data to pass to the function
   * @param {number} timeout_ms - Timeout in milliseconds
   * @returns {Promise} - Promise that resolves with the function result or rejects on timeout
   */
  async _execute_with_timeout(fn, data, timeout_ms) {
    return new Promise((resolve, reject) => {
      const timeout_id = setTimeout(() => {
        reject(new Error(`Handler execution timed out after ${timeout_ms}ms`));
      }, timeout_ms);

      Promise.resolve(fn(data))
        .then(result => {
          clearTimeout(timeout_id);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout_id);
          reject(error);
        });
    });
  }

  /**
   * Log an event based on the current log level
   * @private
   * @param {string} level - Log level (error, warn, info, debug)
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  _log_event(level, message, data = {}) {
    const level_map = {
      'error': LOG_LEVELS.ERROR,
      'warn': LOG_LEVELS.WARN,
      'info': LOG_LEVELS.INFO,
      'debug': LOG_LEVELS.DEBUG
    };

    if (level_map[level] <= this.log_level) {
      const log_prefix = `[EventRouter][${level.toUpperCase()}]`;
      
      if (level === 'error') {
        console.error(`FILE: event_router.service.js | ${level} | ${message}`, data);
      } else if (level === 'warn') {
        console.warn(`FILE: event_router.service.js | ${level} | ${message}`, data);
      } else if (level === 'info') {
        console.info(`FILE: event_router.service.js | ${level} | ${message}`, data);
      } else {
        console.log(`FILE: event_router.service.js | ${level} | ${message}`, data);
      }
    }
  }

  /**
   * Register a handler for a specific event ID
   * @param {string} event_id - The event identifier
   * @param {Function} handler_fn - The handler function that processes the event
   * @param {Object} [options] - Handler options
   * @param {number} [options.priority=10] - Handler priority (lower numbers execute first)
   * @param {number} [options.timeout] - Execution timeout in milliseconds
   * @param {string} [options.name] - Handler name for debugging
   * @returns {event_router} - Returns this for method chaining
   */
  register_handler(event_id, handler_fn, options = {}) {
    try {
      console.log(`FILE: event_router.service.js | register_handler | Registering handler for event: ${event_id}`);
      
      if (!event_id || typeof event_id !== 'string') {
        throw new Error('Event ID must be a non-empty string');
      }

      if (typeof handler_fn !== 'function') {
        throw new Error('Handler must be a function');
      }

      // Initialize handlers array for this event if it doesn't exist
      if (!this.handlers[event_id]) {
        this.handlers[event_id] = [];
      }

      // Add the handler with options
      this.handlers[event_id].push({
        fn: handler_fn,
        priority: options.priority || 10,
        timeout: options.timeout || null,
        name: options.name || `${event_id}_handler_${this.handlers[event_id].length + 1}`
      });

      this._log_event('info', `Registered handler for event: ${event_id}`, { 
        handler_name: options.name || 'anonymous', 
        priority: options.priority || 10 
      });

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | register_handler | Error registering handler for event: ${event_id}`, error);
      throw error;
    }
  }

  /**
   * Unregister a handler for a specific event ID
   * @param {string} event_id - The event identifier
   * @param {Function} [handler_fn] - The handler function to remove (if not specified, removes all handlers)
   * @returns {event_router} - Returns this for method chaining
   */
  unregister_handler(event_id, handler_fn) {
    try {
      console.log(`FILE: event_router.service.js | unregister_handler | Unregistering handler for event: ${event_id}`);
      
      if (!this.handlers[event_id]) {
        return this;
      }

      if (handler_fn) {
        // Remove specific handler
        this.handlers[event_id] = this.handlers[event_id].filter(handler => handler.fn !== handler_fn);
        this._log_event('info', `Unregistered specific handler for event: ${event_id}`);
      } else {
        // Remove all handlers for this event
        delete this.handlers[event_id];
        this._log_event('info', `Unregistered all handlers for event: ${event_id}`);
      }

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | unregister_handler | Error unregistering handler for event: ${event_id}`, error);
      return this;
    }
  }

  /**
   * Register a RabbitMQ publisher for a specific event ID
   * @param {string} event_id - The event identifier
   * @param {string} queue_name - The RabbitMQ queue name
   * @param {Object} [options] - Publishing options
   * @returns {event_router} - Returns this for method chaining
   */
  register_rabbitmq_publisher(event_id, queue_name, options = {}) {
    try {
      console.log(`FILE: event_router.service.js | register_rabbitmq_publisher | Registering RabbitMQ publisher for event: ${event_id}`);
      
      if (!event_id || typeof event_id !== 'string') {
        throw new Error('Event ID must be a non-empty string');
      }

      if (!queue_name || typeof queue_name !== 'string') {
        throw new Error('Queue name must be a non-empty string');
      }

      this.rabbitmq_publishers[event_id] = { queue_name, options };
      this._log_event('info', `Registered RabbitMQ publisher for event: ${event_id}`, { queue_name });

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | register_rabbitmq_publisher | Error registering RabbitMQ publisher for event: ${event_id}`, error);
      throw error;
    }
  }

  /**
   * Unregister a RabbitMQ publisher for a specific event ID
   * @param {string} event_id - The event identifier
   * @returns {event_router} - Returns this for method chaining
   */
  unregister_rabbitmq_publisher(event_id) {
    try {
      console.log(`FILE: event_router.service.js | unregister_rabbitmq_publisher | Unregistering RabbitMQ publisher for event: ${event_id}`);
      
      if (this.rabbitmq_publishers[event_id]) {
        delete this.rabbitmq_publishers[event_id];
        this._log_event('info', `Unregistered RabbitMQ publisher for event: ${event_id}`);
      }

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | unregister_rabbitmq_publisher | Error unregistering RabbitMQ publisher for event: ${event_id}`, error);
      return this;
    }
  }

  /**
   * Register a middleware function that processes event data before handlers
   * @param {Function} middleware_fn - The middleware function
   * @returns {event_router} - Returns this for method chaining
   */
  use(middleware_fn) {
    try {
      console.log(`FILE: event_router.service.js | use | Registering middleware function`);
      
      if (typeof middleware_fn !== 'function') {
        throw new Error('Middleware must be a function');
      }

      this.middlewares.push(middleware_fn);
      this._log_event('info', 'Registered middleware function');

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | use | Error registering middleware function`, error);
      throw error;
    }
  }

  /**
   * Set the log level for the router
   * @param {string} level - Log level ('error', 'warn', 'info', 'debug')
   * @returns {event_router} - Returns this for method chaining
   */
  set_log_level(level) {
    try {
      console.log(`FILE: event_router.service.js | set_log_level | Setting log level to: ${level}`);
      
      const level_map = {
        'error': LOG_LEVELS.ERROR,
        'warn': LOG_LEVELS.WARN,
        'info': LOG_LEVELS.INFO,
        'debug': LOG_LEVELS.DEBUG
      };

      if (!level_map.hasOwnProperty(level)) {
        throw new Error(`Invalid log level: ${level}. Valid levels are: error, warn, info, debug`);
      }

      this.log_level = level_map[level];
      this._log_event('info', `Log level set to: ${level}`);

      return this;
    } catch (error) {
      console.error(`FILE: event_router.service.js | set_log_level | Error setting log level to: ${level}`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const router = new event_router();
module.exports = router; 