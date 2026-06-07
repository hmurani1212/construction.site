/***
* DB CONNECTION HANDLING - MYSQL
*
* Configure MySQL Connection Pool to avoid timeout issues.
* We have used proxy to pass connections/queries to DB which can greatly help handling
* failure such as incase of connection losses, this will auto reattempt connection to 
* execute the query before failing apart.
*
* CONFIGURATION
* ------------
* Configure your MySQL connection settings below:
* - DB_HOST: MySQL server host
* - DB_USER: MySQL username
* - DB_PASSWORD: MySQL password
* - DB_NAME: Default database name
* - CONNECTION_LIMIT: Maximum number of connections in pool
* - MAX_RETRIES: Maximum query retry attempts
* - RETRY_DELAY: Delay between retries in milliseconds
* - MUNSHI_ENABLED: Enable/disable Munshi error reporting
*
* MUNSHI ERROR REPORTING INTEGRATION
* ----------------------------------
* This connector is integrated with the Munshi service for centralized error monitoring.
* All critical MySQL errors are automatically reported to Munshi for tracking and alerting.
*
* Error Codes:
* - MYSQL-CONN-001: Connection lost (with retry attempts)
* - MYSQL-CONN-002: Max connection retries reached
* - MYSQL-QUERY-001: Query execution failed after max retries
* - MYSQL-POOL-001: Pool creation or connection error
*
* TTL Configuration:
* - 90 days (7776000s): Critical failures that exhaust all retries
* - 30 days (2592000s): Connection lost errors with retry attempts
* - 15 days (1296000s): Individual query failures
*
* To disable Munshi reporting, set MUNSHI_ENABLED = false in this file.
*
**********/
const mysql = require('mysql2/promise');
const eventEmitter = require('./emitter');

/**
 * MYSQL CONFIGURATION
 */
const DB_HOST = '172.18.0.63';
const DB_USER = 'USER';
const DB_PASSWORD = 'PASSWORD';
const DB_NAME = '';
const CONNECTION_LIMIT = 20;

/**
 * RETRY CONFIGURATION
 */
const MAX_RETRIES = 3; // Maximum number of retries
const RETRY_DELAY = 1000; // Delay between retries in milliseconds

/**
 * MUNSHI ERROR REPORTING CONFIGURATION
 */
const MUNSHI_ENABLED = true; // Set to false to disable Munshi error reporting

function createDbPool() 
{
  try {
    console.log('FILE: db_mysql.js | createDbPool | Creating MySQL connection pool');
    
    return mysql.createPool({
      multipleStatements: true,
      connectionLimit: CONNECTION_LIMIT,
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });
  } catch (error) {
    console.error('FILE: db_mysql.js | createDbPool | Failed to create MySQL pool:', error);
    
    // Report pool creation error to Munshi
    if (MUNSHI_ENABLED) {
      eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
        error: error,
        error_code: 'MYSQL-POOL-001',
        error_title: 'MySQL Pool Creation Failed',
        error_type: 'DB_ERROR',
        metadata: {
          host: DB_HOST,
          database: DB_NAME,
          connection_limit: CONNECTION_LIMIT
        },
        other_data: {
          error_message: error.message,
          error_code: error.code,
          timestamp: Math.floor(Date.now() / 1000)
        },
        ttl: 2592000 // 30 days for pool creation errors
      });
    }
    
    throw error;
  }
}
 
let pool = createDbPool();



const poolProxy = new Proxy(pool, 
  {
  get(target, prop, receiver) {
    if (typeof target[prop] === 'function') 
    {
      return async (...args) => 
      {
        let attempts = 0;
        let lastError = null;

        while (attempts <= MAX_RETRIES) {
          try 
          {
            const result = await target[prop](...args);
            return result; // If the query is successful, return the results
          } catch (error) 
          {
            attempts++;
            lastError = error;
            
            if (error.code === 'PROTOCOL_CONNECTION_LOST' && attempts <= MAX_RETRIES) 
            {
              console.log(`FILE: db_mysql.js | poolProxy | Connection lost, attempting to recreate pool and retry... Attempt ${attempts} of ${MAX_RETRIES}`);
              
              // Report connection lost to Munshi
              if (MUNSHI_ENABLED) {
                eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                  error: error,
                  error_code: 'MYSQL-CONN-001',
                  error_title: 'MySQL Connection Lost - Retrying',
                  error_type: 'DB_ERROR',
                  metadata: {
                    host: DB_HOST,
                    database: DB_NAME,
                    attempt: attempts,
                    max_retries: MAX_RETRIES,
                    function_called: prop,
                    will_retry: attempts < MAX_RETRIES
                  },
                  other_data: {
                    error_message: error.message,
                    error_code: error.code,
                    sqlState: error.sqlState,
                    errno: error.errno,
                    timestamp: Math.floor(Date.now() / 1000)
                  },
                  ttl: 2592000 // 30 days for connection lost errors
                });
              }
              
              // Recreate the pool
              target = createDbPool();
              pool = target; // Update the reference for future queries
              
              // Wait for a bit before retrying
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
              
              // Retry logic will continue
            } 
            else 
            {
              // If max retries reached or other type of error, throw
              console.error(`FILE: db_mysql.js | poolProxy | Query failed after ${attempts} attempts:`, error);
              
              // Report critical failure to Munshi
              if (MUNSHI_ENABLED) {
                // Determine if this is max retries or immediate failure
                const is_max_retries = attempts > 1;
                
                eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                  error: error,
                  error_code: is_max_retries ? 'MYSQL-CONN-002' : 'MYSQL-QUERY-001',
                  error_title: is_max_retries 
                    ? 'MySQL Max Connection Retries Reached' 
                    : 'MySQL Query Execution Failed',
                  error_type: 'DB_ERROR',
                  metadata: {
                    host: DB_HOST,
                    database: DB_NAME,
                    attempts: attempts,
                    max_retries: MAX_RETRIES,
                    function_called: prop,
                    severity: 'critical'
                  },
                  other_data: {
                    error_message: error.message,
                    error_code: error.code,
                    sqlState: error.sqlState,
                    errno: error.errno,
                    sql: error.sql ? error.sql.substring(0, 500) : undefined, // Limit SQL to 500 chars
                    timestamp: Math.floor(Date.now() / 1000)
                  },
                  ttl: is_max_retries ? 7776000 : 1296000 // 90 days for max retries, 15 days for query failures
                });
              }
              
              throw error;
            }
          }
        }
        
        // This shouldn't be reached, but just in case
        if (lastError) {
          throw lastError;
        }
      };
    } else 
    {
      return target[prop];
    }
  }
});


//EXPORT THE FUNCTIONS/MODULES FOR FURTHER USE
module.exports = poolProxy;
