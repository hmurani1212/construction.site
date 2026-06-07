/***
* REDIS CONNECTION HANDLING
*
* Configure Redis Connection with automatic failover support.
* The retry strategy helps ensure that the connection is re-established in case of a failure.
*
* CONFIGURATION
* ------------
* Configure your Redis connection settings below:
* - REDIS_SERVERS: Array of Redis server IPs (primary and failover)
* - REDIS_PORT: Redis server port
* - REDIS_PASSWORD: Redis password
* - MAX_RETRIES_BEFORE_FAILOVER: Number of retries before switching to failover server
* - RETRY_INTERVAL: Maximum retry interval in milliseconds
* - MUNSHI_ENABLED: Enable/disable Munshi error reporting
*
* MUNSHI ERROR REPORTING INTEGRATION
* ----------------------------------
* This connector is integrated with the Munshi service for centralized error monitoring.
* All critical Redis errors are automatically reported to Munshi for tracking and alerting.
*
* Error Codes:
* - REDIS-CONN-001: Connection error
* - REDIS-CONN-002: Connection ended/disconnected
* - REDIS-FAILOVER-001: Failover to backup server triggered
* - REDIS-RETRY-001: Retry attempts in progress
*
* TTL Configuration:
* - 30 days (2592000s): Connection errors and disconnections
* - 15 days (1296000s): Retry attempts and failover events
*
* To disable Munshi reporting, set MUNSHI_ENABLED = false in this file.
*
**********/

// IMPORT THE REDIS PACKAGE
const Redis = require('ioredis');
const eventEmitter = require('./emitter');

/**
 * REDIS CONFIGURATION
 * Priority: REDIS_URL > Individual settings (REDIS_SERVERS, REDIS_PORT, REDIS_PASSWORD)
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://default:ozjBKNk9cWTz1sJ8YP8Uppp27PL2eR0X@redis-10509.c99.us-east-1-4.ec2.cloud.redislabs.com:10509';
const REDIS_SERVERS = process.env.REDIS_SERVERS 
    ? process.env.REDIS_SERVERS.split(',') 
    : ['172.18.0.86']; // Add more servers as needed for failover
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'openx';

/**
 * RETRY AND FAILOVER CONFIGURATION
 */
const MAX_RETRIES_BEFORE_FAILOVER = 5; // Retries before switching to failover server
const RETRY_INTERVAL = 10000; // Maximum retry interval in milliseconds (10 seconds)

/**
 * MUNSHI ERROR REPORTING CONFIGURATION
 */
const MUNSHI_ENABLED = true; // Set to false to disable Munshi error reporting

let currentServerIndex = 0;

// Function to create ioredis client
function createRedisClient(serverIndex) {
  let redisOptions;
  
  // If REDIS_URL is provided, use it directly (priority)
  if (REDIS_URL) {
    console.log(`FILE: redis.js | createRedisClient | Creating Redis client using REDIS_URL`);
    
    redisOptions = {
      // ioredis can parse the URL automatically, but we'll set it explicitly
      // Parse URL to extract components for better error handling
      ...(REDIS_URL.startsWith('rediss://') ? { 
        tls: {
          rejectUnauthorized: false // For Redis Labs SSL connections
        }
      } : {}),
      retryStrategy: (retries) => {
        console.log(`FILE: redis.js | retryStrategy | Retry attempt ${retries}`);
        
        // Report retry attempts to Munshi
        if (MUNSHI_ENABLED && retries > 2) {
          const error = new Error(`Redis connection retry attempt ${retries}`);
          eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'REDIS-RETRY-001',
            error_title: 'Redis Connection Retry Attempts',
            error_type: 'CACHE_ERROR',
            metadata: {
              redis_url: REDIS_URL.replace(/:[^:@]+@/, ':****@'), // Hide password in logs
              retry_count: retries,
              max_retries_before_failover: MAX_RETRIES_BEFORE_FAILOVER,
            },
            other_data: {
              timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 1296000 // 15 days for retry attempts
          });
        }
        
        if (retries > MAX_RETRIES_BEFORE_FAILOVER) {
          console.log(`FILE: redis.js | retryStrategy | Max retries reached`);
          return 15000; // Wait 15 seconds before retrying
        }
        // Reconnect after increasing intervals
        return Math.min(retries * 3000, RETRY_INTERVAL); // Wait up to configured interval
      },
      // Important: maxRetriesPerRequest should be set to null for BullMQ compatibility
      maxRetriesPerRequest: null,
    };
    
    // Create client with URL
    const client = new Redis(REDIS_URL, redisOptions);
    
    // Event listeners
    client.on('connect', () => {
      console.log(`FILE: redis.js | client.on.connect | Redis client connected via URL`);
    });
    
    client.on('ready', () => {   
      console.log(`FILE: redis.js | client.on.ready | Redis client ready to use`);
    });
    
    client.on('error', (err) => {
      console.error(`FILE: redis.js | client.on.error | Redis Client Error:`, err);
      
      // Report Redis errors to Munshi
      if (MUNSHI_ENABLED) {
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
          error: err,
          error_code: 'REDIS-CONN-001',
          error_title: 'Redis Connection Error',
          error_type: 'CACHE_ERROR',
          metadata: {
            redis_url: REDIS_URL.replace(/:[^:@]+@/, ':****@'), // Hide password in logs
            error_name: err.name
          },
          other_data: {
            error_message: err.message,
            error_code: err.code,
            error_command: err.command || null,
            timestamp: Math.floor(Date.now() / 1000)
          },
          ttl: 2592000 // 30 days for connection errors
        });
      }
    });
    
    client.on('end', () => {
      console.log(`FILE: redis.js | client.on.end | Redis client disconnected`);
      
      // Report Redis disconnection to Munshi
      if (MUNSHI_ENABLED) {
        const error = new Error(`Redis client disconnected`);
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
          error: error,
          error_code: 'REDIS-CONN-002',
          error_title: 'Redis Connection Ended',
          error_type: 'CACHE_ERROR',
          metadata: {
            redis_url: REDIS_URL.replace(/:[^:@]+@/, ':****@'), // Hide password in logs
            connection_state: 'disconnected'
          },
          other_data: {
            timestamp: Math.floor(Date.now() / 1000)
          },
          ttl: 2592000 // 30 days for disconnection events
        });
      }
    });
    
    return client;
  }
  
  // Fallback to individual server configuration
  const server = REDIS_SERVERS[serverIndex || 0];
  
  console.log(`FILE: redis.js | createRedisClient | Creating Redis client for server: ${server}`);
  
  redisOptions = {
    host: server,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    // If you're using TLS/SSL, uncomment and configure the following:
    // tls: {
    //   // Your TLS configuration
    // },
    retryStrategy: (retries) => {
      console.log(`FILE: redis.js | retryStrategy | Retry attempt ${retries} for server: ${server}`);
      
      // Report retry attempts to Munshi
      if (MUNSHI_ENABLED && retries > 2) {
        const error = new Error(`Redis connection retry attempt ${retries} for server ${server}`);
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
          error: error,
          error_code: 'REDIS-RETRY-001',
          error_title: 'Redis Connection Retry Attempts',
          error_type: 'CACHE_ERROR',
          metadata: {
            server: server,
            port: REDIS_PORT,
            retry_count: retries,
            max_retries_before_failover: MAX_RETRIES_BEFORE_FAILOVER,
            will_failover: retries > MAX_RETRIES_BEFORE_FAILOVER
          },
          other_data: {
            current_server_index: currentServerIndex,
            total_servers: REDIS_SERVERS.length,
            timestamp: Math.floor(Date.now() / 1000)
          },
          ttl: 1296000 // 15 days for retry attempts
        });
      }
      
      if (retries > MAX_RETRIES_BEFORE_FAILOVER) {
        // After max retries, switch to the failover server
        const oldServerIndex = currentServerIndex;
        currentServerIndex = (currentServerIndex + 1) % REDIS_SERVERS.length;
        const nextServer = REDIS_SERVERS[currentServerIndex];
        
        console.log(`FILE: redis.js | retryStrategy | Switching to failover server: ${nextServer}`);
        
        // Report failover to Munshi
        if (MUNSHI_ENABLED) {
          const error = new Error(`Redis failover triggered from ${server} to ${nextServer} after ${retries} retries`);
          eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'REDIS-FAILOVER-001',
            error_title: 'Redis Failover to Backup Server',
            error_type: 'CACHE_ERROR',
            metadata: {
              old_server: server,
              new_server: nextServer,
              old_server_index: oldServerIndex,
              new_server_index: currentServerIndex,
              retry_count: retries,
              severity: 'warning'
            },
            other_data: {
              total_servers: REDIS_SERVERS.length,
              failover_triggered: true,
              timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 1296000 // 15 days for failover events
          });
        }
        
        return 15000; // Wait 15 seconds before retrying
      }
      // Reconnect after increasing intervals
      return Math.min(retries * 3000, RETRY_INTERVAL); // Wait up to configured interval
    },
    // Important: maxRetriesPerRequest should be set to null for BullMQ compatibility
    maxRetriesPerRequest: null,
  };
  
  const client = new Redis(redisOptions);
  
  // Event listeners
  client.on('connect', () => {
    console.log(`FILE: redis.js | client.on.connect | Redis client connected to server ${server}`);
  });
  
  client.on('ready', () => {   
    console.log(`FILE: redis.js | client.on.ready | Redis client ready to use on server ${server}`);
  });
  
  client.on('error', (err) => {
    console.error(`FILE: redis.js | client.on.error | Redis Client Error on server ${server}:`, err);
    
    // Report Redis errors to Munshi
    if (MUNSHI_ENABLED) {
      eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
        error: err,
        error_code: 'REDIS-CONN-001',
        error_title: 'Redis Connection Error',
        error_type: 'CACHE_ERROR',
        metadata: {
          server: server,
          port: REDIS_PORT,
          server_index: serverIndex,
          error_name: err.name
        },
        other_data: {
          error_message: err.message,
          error_code: err.code,
          error_command: err.command || null,
          total_servers: REDIS_SERVERS.length,
          timestamp: Math.floor(Date.now() / 1000)
        },
        ttl: 2592000 // 30 days for connection errors
      });
    }
  });
  
  client.on('end', () => {
    console.log(`FILE: redis.js | client.on.end | Redis client disconnected from server ${server}`);
    
    // Report Redis disconnection to Munshi
    if (MUNSHI_ENABLED) {
      const error = new Error(`Redis client disconnected from server ${server}`);
      eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
        error: error,
        error_code: 'REDIS-CONN-002',
        error_title: 'Redis Connection Ended',
        error_type: 'CACHE_ERROR',
        metadata: {
          server: server,
          port: REDIS_PORT,
          server_index: serverIndex,
          connection_state: 'disconnected'
        },
        other_data: {
          total_servers: REDIS_SERVERS.length,
          timestamp: Math.floor(Date.now() / 1000)
        },
        ttl: 2592000 // 30 days for disconnection events
      });
    }
  });
  
  return client;
}

// Initialize the Redis client
const redisClient = createRedisClient();

module.exports = redisClient;
