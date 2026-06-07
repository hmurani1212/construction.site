//DB CONNECTION HANDLING
/*
*
* Configure Memcache Connection with TRUE FAILOVER support (application-level).
*
* TRUE FAILOVER STRATEGY:
* - TWO separate memcached clients: PRIMARY and BACKUP
* - ALL requests go to PRIMARY server only under normal conditions
* - On PRIMARY failure, automatically switch to BACKUP server
* - Periodic health checks to automatically restore PRIMARY when it recovers
* - No data distribution - all keys go to active server ensuring consistency
*
* CONNECTION SETTINGS:
* - timeout: 800ms - Fast failure detection to prevent app hangs
* - retries: 1 - Total 2 attempts (800ms × 2 = 1.6s max per operation)
* - failures: 3 - Lower threshold for faster failover detection (was 10)
* - remove: false - Keep failed server for automatic recovery
* - reconnect: 3000ms - Health check interval (3 seconds)
*
* FAILOVER PROCESS:
* 1. Operation fails on PRIMARY (after retries)
* 2. Mark PRIMARY as unhealthy, switch to BACKUP
* 3. All subsequent requests go to BACKUP
* 4. Background health check attempts PRIMARY reconnection every 3s
* 5. On PRIMARY recovery, switch back automatically
*
* PROTECTION STRATEGY:
* - Fast timeouts (800ms) prevent individual operations from hanging
* - Non-blocking promises ensure app continues even during failures  
* - Operation-level timeouts (1.2s) provide additional safety net
* - Lower failure threshold (3) for faster failover switching
*
* MUNSHI INTEGRATION:
* - Critical failures and failover events reported to Munshi
* - Error throttling to prevent spam during outages
*
**********/
//IMPORT THE MEMCACHED PACKAGE
const Memcached = require('memcached');

//LAZY LOAD EVENT EMITTER FOR MUNSHI REPORTING (avoids circular dependencies)
let eventEmitter = null;
let munshi_loaded = false;

function load_munshi() {
    if (!munshi_loaded) {
        try {
            eventEmitter = require('./emitter');
            munshi_loaded = true;
        } catch (error) {
            console.error('FILE: memcache.js | load_munshi | Failed to load event emitter:', error);
        }
    }
}

//ERROR THROTTLING TO PREVENT MUNSHI SPAM DURING OUTAGES
const error_throttle = {
    last_reported: {},
    throttle_time: 60000, // Report same error type max once per minute
    
    should_report: function(error_type) {
        const now = Date.now();
        const last_report = this.last_reported[error_type] || 0;
        
        if (now - last_report > this.throttle_time) {
            this.last_reported[error_type] = now;
            return true;
        }
        return false;
    }
};

//SERVER CONFIGURATION
const PRIMARY_SERVER = '172.18.0.37:11211'; //Memcache Nodes behind load balancer/HAProxy
const BACKUP_SERVER = '172.18.0.82:11211'; //Secondary Memcache Nodes Direct

//MEMCACHED CLIENT CONFIG (shared settings)
const memcachedConfig = 
{
    maxValue: 2097152, //The maximum size of a value that Memcached can store - 2MB
    timeout: 800, //The time (in milliseconds) to wait for a server response - 800ms for fast failure detection
    idle: 30000, //The time (in milliseconds) to wait before closing idle connections. - 30 seconds
    retries: 1, //The number of times to retry an operation - 1 retry for fast failure (total 2 attempts)
    failures: 3, //Lower threshold for faster failover detection (3 failures = switch to backup)
    retry: 300, //The time (in milliseconds) to wait between failed-attempts - 300ms for fast retry
    remove: false, //CRITICAL: Keep failed servers in rotation for automatic recovery
    keyCompression: true, //Whether to compress keys
    reconnect: 3000, //Health check interval - 3 seconds
    poolSize: 10 //Connection pool size
};

//CREATE TWO SEPARATE MEMCACHED CLIENTS FOR TRUE FAILOVER
const primaryMemcached = new Memcached([PRIMARY_SERVER], memcachedConfig);
const backupMemcached = new Memcached([BACKUP_SERVER], memcachedConfig);

//FAILOVER STATE MANAGEMENT
const failoverState = {
    currentServer: 'primary', // 'primary' or 'backup'
    primaryHealthy: true,
    backupHealthy: true,
    consecutiveFailures: 0,
    failureThreshold: 3, // Switch to backup after 3 consecutive failures
    lastFailoverTime: null,
    lastHealthCheck: null
};

//GET ACTIVE MEMCACHED CLIENT BASED ON CURRENT STATE
function getActiveClient() {
    return failoverState.currentServer === 'primary' ? primaryMemcached : backupMemcached;
}

//SWITCH TO BACKUP SERVER
function switchToBackup(reason) {
    if (failoverState.currentServer === 'primary') {
        console.error(`FILE: memcache.js | FAILOVER | Switching to BACKUP server. Reason: ${reason}`);
        failoverState.currentServer = 'backup';
        failoverState.primaryHealthy = false;
        failoverState.lastFailoverTime = Date.now();
        
        // Report failover to Munshi
        report_to_munshi(
            'MEMCACHE-FAILOVER-001',
            'Memcache Failover to Backup',
            `Switched to backup server: ${BACKUP_SERVER}`,
            {
                from_server: PRIMARY_SERVER,
                to_server: BACKUP_SERVER,
                reason: reason,
                timestamp: new Date().toISOString()
            }
        );
    }
}

//SWITCH BACK TO PRIMARY SERVER
function switchToPrimary(reason) {
    if (failoverState.currentServer === 'backup') {
        console.log(`FILE: memcache.js | RECOVERY | Switching back to PRIMARY server. Reason: ${reason}`);
        failoverState.currentServer = 'primary';
        failoverState.primaryHealthy = true;
        failoverState.consecutiveFailures = 0;
        
        // Report recovery to Munshi
        try {
            load_munshi();
            if (eventEmitter && munshi_loaded) {
                eventEmitter.emit('event_router', 'GENERAL_LOG_EVENT', {
                    log_type: 'MEMCACHE_RECOVERY',
                    plain_text: `Memcache switched back to PRIMARY server: ${PRIMARY_SERVER}`,
                    metadata: {
                        service: 'memcache',
                        from_server: BACKUP_SERVER,
                        to_server: PRIMARY_SERVER,
                        reason: reason,
                        timestamp: new Date().toISOString()
                    },
                    ttl: 1209600, // 14 days retention
                    app_id: 1001
                });
            }
        } catch (error) {
            console.error('FILE: memcache.js | switchToPrimary | Error reporting to Munshi:', error);
        }
    }
}

//HEALTH CHECK FOR PRIMARY SERVER
async function healthCheckPrimary() {
    // Only check if we're currently on backup
    if (failoverState.currentServer !== 'backup') {
        return;
    }
    
    // Throttle health checks to every 3 seconds
    const now = Date.now();
    if (failoverState.lastHealthCheck && (now - failoverState.lastHealthCheck) < 3000) {
        return;
    }
    failoverState.lastHealthCheck = now;
    
    // Try a simple get operation on primary to check if it's alive
    return new Promise((resolve) => {
        const testKey = '__health_check__';
        const timeout = setTimeout(() => {
            resolve(false); // Health check failed
        }, 1000); // 1 second timeout for health check
        
        primaryMemcached.get(testKey, (err) => {
            clearTimeout(timeout);
            if (!err) {
                // Primary is healthy again, switch back
                switchToPrimary('Health check successful');
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

//HANDLE OPERATION FAILURE - DECIDE IF FAILOVER IS NEEDED
function handleOperationFailure(operationName, key, error) {
    if (failoverState.currentServer === 'primary') {
        failoverState.consecutiveFailures++;
        
        if (failoverState.consecutiveFailures >= failoverState.failureThreshold) {
            switchToBackup(`${failoverState.consecutiveFailures} consecutive failures on operation: ${operationName}`);
        }
    }
    
    console.error(`FILE: memcache.js | ${operationName} | Error on ${failoverState.currentServer.toUpperCase()} | Key: ${key} | Error: ${error.message}`);
}

//HANDLE OPERATION SUCCESS - RESET FAILURE COUNTER
function handleOperationSuccess() {
    if (failoverState.consecutiveFailures > 0) {
        failoverState.consecutiveFailures = 0;
    }
}


/*
*
*	START Getting value from memcache WITH FAILOVER SUPPORT
*	RESILIENT: Returns null on error instead of rejecting to prevent app hangs
*	FAILOVER: Automatically switches to backup on failures, health checks primary for recovery
*
**********/
async function getFromMemcache(key)
{
    // Trigger health check if we're on backup
    healthCheckPrimary();
    
    return new Promise((resolve) => 
	{
		//Safety timeout to prevent indefinite hanging (shorter timeout for faster failure)
		const operationTimeout = setTimeout(() => {
			console.error('FILE: memcache.js | getFromMemcache | Operation timeout for key:', key);
			handleOperationFailure('getFromMemcache', key, new Error('Operation timeout'));
			resolve(null); //Return null instead of hanging
		}, 1200); //800ms memcache timeout + 2 retries + buffer = ~1200ms max
		
        // Use active client based on failover state
        const activeClient = getActiveClient();
        activeClient.get(CacheKeyPrefix + key, (err, value) => 
		{
			clearTimeout(operationTimeout);
            if (err) 
			{
				handleOperationFailure('getFromMemcache', key, err);
                resolve(null); //Graceful degradation - return null instead of rejecting
            } else {
				handleOperationSuccess();
				resolve(value);
			}
        });
    });
}




/*
*
*	START Getting JSON object from memcache WITH FAILOVER SUPPORT
*	RESILIENT: Returns null on error instead of rejecting to prevent app hangs
*	FAILOVER: Automatically switches to backup on failures, health checks primary for recovery
*
**********/
async function getJsonFromMemcache(key)
{
    // Trigger health check if we're on backup
    healthCheckPrimary();
    
    return new Promise((resolve) => 
	{
		//Safety timeout to prevent indefinite hanging (shorter timeout for faster failure)
		const operationTimeout = setTimeout(() => {
			console.error('FILE: memcache.js | getJsonFromMemcache | Operation timeout for key:', key);
			handleOperationFailure('getJsonFromMemcache', key, new Error('Operation timeout'));
			resolve(null); //Return null instead of hanging
		}, 1200); //800ms memcache timeout + 2 retries + buffer = ~1200ms max
		
        // Use active client based on failover state
        const activeClient = getActiveClient();
        activeClient.get(CacheKeyPrefix + key, (err, value) => 
		{
			clearTimeout(operationTimeout);
            if (err) 
			{
				handleOperationFailure('getJsonFromMemcache', key, err);
                resolve(null); //Graceful degradation - return null instead of rejecting
            } else {
				handleOperationSuccess();
				//Safely parse JSON
				try {
					resolve(value ? JSON.parse(value.toString()) : null);
				} catch (parseError) {
					console.error('FILE: memcache.js | getJsonFromMemcache | JSON parse error for key:', key);
					resolve(null); //Return null if JSON parsing fails
				}
			}
        });
    });
}



/*
*
*	START Deleting Key from memcache WITH FAILOVER SUPPORT
*	RESILIENT: Returns success even on error to prevent blocking the caller
*	FAILOVER: Automatically switches to backup on failures, health checks primary for recovery
*
**********/
async function deleteCacheKey(key) 
{
    // Trigger health check if we're on backup
    healthCheckPrimary();
    
    return new Promise((resolve) => {
        //Safety timeout to prevent indefinite hanging (shorter timeout for faster failure)
        const operationTimeout = setTimeout(() => {
            console.error('FILE: memcache.js | deleteCacheKey | Operation timeout for key:', key);
            handleOperationFailure('deleteCacheKey', key, new Error('Operation timeout'));
            resolve(true); //Return success to not block caller
        }, 1200); //800ms memcache timeout + 2 retries + buffer = ~1200ms max
        
        // Use active client based on failover state
        const activeClient = getActiveClient();
        activeClient.delete(CacheKeyPrefix + key, (error) => {
            clearTimeout(operationTimeout);
            if (error) {
                handleOperationFailure('deleteCacheKey', key, error);
                resolve(true); //Return success to not block caller - deletion errors are not critical
            } else {
                handleOperationSuccess();
                console.log(`FILE: memcache.js | deleteCacheKey | Cache for ${key} deleted successfully.`);
                resolve(true);
            }
        });
    });
}




/******************************************************
 * 
 * 
 * Handling Memcached Set Operations WITH FAILOVER SUPPORT
 * RESILIENT: Returns false on error instead of rejecting to prevent app hangs
 * FAILOVER: Automatically switches to backup on failures, health checks primary for recovery
 *
 ******************************************************/
async function setMemcache(key, value, ttl = CentralcacheTime)
{
    // Trigger health check if we're on backup
    healthCheckPrimary();
    
    return new Promise((resolve) => {
		//Safety timeout to prevent indefinite hanging (shorter timeout for faster failure)
		const operationTimeout = setTimeout(() => {
			console.error('FILE: memcache.js | setMemcache | Operation timeout for key:', key);
			handleOperationFailure('setMemcache', key, new Error('Operation timeout'));
			resolve(false); //Return false but don't block caller
		}, 1200); //800ms memcache timeout + 2 retries + buffer = ~1200ms max
		
        // Use active client based on failover state
        const activeClient = getActiveClient();
        activeClient.set(CacheKeyPrefix + key, value, ttl, (error, result) => {
			clearTimeout(operationTimeout);
            if (error) {
				handleOperationFailure('setMemcache', key, error);
                resolve(false); //Return false but don't block caller - set errors are not critical
            } else {
				handleOperationSuccess();
				resolve(result);
			}
        });
    });
}





/******************************************************
 * 
 * 
 * Report Critical Memcache Errors to Munshi
 * 
 ******************************************************/
function report_to_munshi(error_code, error_title, error_message, details = {}) {
    try {
        load_munshi();
        
        if (eventEmitter && munshi_loaded) {
            // Throttle error reporting to prevent spam during prolonged outages
            if (!error_throttle.should_report(error_code)) {
                return;
            }
            
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: new Error(error_message),
                error_code: error_code,
                error_title: error_title,
                error_type: 'CACHE_ERROR', // Standard error type for cache-related issues
                metadata: {
                    service: 'memcache',
                    timestamp: new Date().toISOString(),
                    ...details
                },
                other_data: {
                    memcache_config: {
                        timeout: 800,
                        retries: 1,
                        failures: 10,
                        remove: false,
                        reconnect: 5000
                    },
                    details: details
                },
                ttl: 2592000, // 30 days retention for critical cache errors
                app_id: 1001
            });
        }
    } catch (reporting_error) {
        console.error('FILE: memcache.js | report_to_munshi | Error reporting to Munshi:', reporting_error);
    }
}


/******************************************************
 * 
 * 
 * Handling Memcached Events with Munshi Integration
 * Event listeners for BOTH primary and backup servers
 * 
 *
 ******************************************************/

// PRIMARY SERVER EVENT LISTENERS
primaryMemcached.on('issue', (details) => 
{
    console.error('FILE: memcache.js | PRIMARY | TIME:', new Date(), '| ERROR: Memcached connection issue', details);
    
    // Report critical connection issues to Munshi
    report_to_munshi(
        'MEMCACHE-CONN-001',
        'Memcache PRIMARY Connection Issue',
        'Primary memcache server connection issue detected',
        {
            server: 'PRIMARY - ' + details.server,
            tokens: details.tokens,
            messages: details.messages
        }
    );
});

primaryMemcached.on('failure', (details) => 
{
    console.error('FILE: memcache.js | PRIMARY | TIME:', new Date(), '| ERROR: Memcached server failure', details);
    
    // Report server failures to Munshi
    report_to_munshi(
        'MEMCACHE-FAIL-001',
        'Memcache PRIMARY Server Failure',
        'Primary memcache server marked as failed',
        {
            server: 'PRIMARY - ' + details.server,
            tokens: details.tokens,
            messages: details.messages
        }
    );
});

primaryMemcached.on('reconnecting', (details) => {
    console.log('FILE: memcache.js | PRIMARY | TIME:', new Date(), '| INFO: Reconnecting to primary server', details.server);
});
  
primaryMemcached.on('reconnect', (details) => {
    console.log('FILE: memcache.js | PRIMARY | TIME:', new Date(), '| INFO: PRIMARY reconnection successful', details.server);
    
    // Report successful recovery to Munshi
    try {
        load_munshi();
        if (eventEmitter && munshi_loaded) {
            eventEmitter.emit('event_router', 'GENERAL_LOG_EVENT', {
                log_type: 'MEMCACHE_RECOVERY',
                plain_text: `PRIMARY memcache server reconnected successfully: ${details.server}`,
                metadata: {
                    service: 'memcache',
                    server_type: 'PRIMARY',
                    server: details.server,
                    timestamp: new Date().toISOString()
                },
                other_data: {
                    details: details
                },
                ttl: 1209600, // 14 days retention
                app_id: 1001
            });
        }
    } catch (error) {
        console.error('FILE: memcache.js | PRIMARY.on.reconnect | Error reporting to Munshi:', error);
    }
});

// BACKUP SERVER EVENT LISTENERS
backupMemcached.on('issue', (details) => 
{
    console.error('FILE: memcache.js | BACKUP | TIME:', new Date(), '| ERROR: Memcached connection issue', details);
    
    // Report critical connection issues to Munshi
    report_to_munshi(
        'MEMCACHE-CONN-002',
        'Memcache BACKUP Connection Issue',
        'Backup memcache server connection issue detected',
        {
            server: 'BACKUP - ' + details.server,
            tokens: details.tokens,
            messages: details.messages
        }
    );
});

backupMemcached.on('failure', (details) => 
{
    console.error('FILE: memcache.js | BACKUP | TIME:', new Date(), '| ERROR: Memcached server failure', details);
    
    // Report server failures to Munshi
    report_to_munshi(
        'MEMCACHE-FAIL-002',
        'Memcache BACKUP Server Failure',
        'Backup memcache server marked as failed',
        {
            server: 'BACKUP - ' + details.server,
            tokens: details.tokens,
            messages: details.messages
        }
    );
});

backupMemcached.on('reconnecting', (details) => {
    console.log('FILE: memcache.js | BACKUP | TIME:', new Date(), '| INFO: Reconnecting to backup server', details.server);
});
  
backupMemcached.on('reconnect', (details) => {
    console.log('FILE: memcache.js | BACKUP | TIME:', new Date(), '| INFO: BACKUP reconnection successful', details.server);
    
    // Report successful recovery to Munshi
    try {
        load_munshi();
        if (eventEmitter && munshi_loaded) {
            eventEmitter.emit('event_router', 'GENERAL_LOG_EVENT', {
                log_type: 'MEMCACHE_RECOVERY',
                plain_text: `BACKUP memcache server reconnected successfully: ${details.server}`,
                metadata: {
                    service: 'memcache',
                    server_type: 'BACKUP',
                    server: details.server,
                    timestamp: new Date().toISOString()
                },
                other_data: {
                    details: details
                },
                ttl: 1209600, // 14 days retention
                app_id: 1001
            });
        }
    } catch (error) {
        console.error('FILE: memcache.js | BACKUP.on.reconnect | Error reporting to Munshi:', error);
    }
});


/******************************************************
 * 
 * GET FAILOVER STATUS - For monitoring and debugging
 * 
 ******************************************************/
function getFailoverStatus() {
    return {
        currentServer: failoverState.currentServer,
        primaryHealthy: failoverState.primaryHealthy,
        backupHealthy: failoverState.backupHealthy,
        consecutiveFailures: failoverState.consecutiveFailures,
        lastFailoverTime: failoverState.lastFailoverTime,
        uptime: failoverState.lastFailoverTime ? Date.now() - failoverState.lastFailoverTime : null,
        servers: {
            primary: PRIMARY_SERVER,
            backup: BACKUP_SERVER
        }
    };
}


/******************************************************
 * 
 * CREATE PROXY MEMCACHED CLIENT FOR BACKWARD COMPATIBILITY
 * This proxy intercepts all memcached method calls and routes them
 * to the active client (primary or backup) with automatic failover
 * 
 ******************************************************/
const memcached = new Proxy({}, {
    get: function(target, prop) {
        // Trigger health check if we're on backup
        if (failoverState.currentServer === 'backup') {
            healthCheckPrimary();
        }
        
        // Get the active client
        const activeClient = getActiveClient();
        const value = activeClient[prop];
        
        // If it's a method, wrap it with failover logic
        if (typeof value === 'function') {
            return function(...args) {
                // For callback-based methods (get, set, delete, etc.)
                // Intercept the callback to handle failures
                if (args.length > 0 && typeof args[args.length - 1] === 'function') {
                    const originalCallback = args[args.length - 1];
                    
                    // Wrap the callback with failover handling
                    args[args.length - 1] = function(err, ...callbackArgs) {
                        if (err) {
                            // Track failure for potential failover
                            handleOperationFailure(prop, args[0], err);
                        } else {
                            // Reset failure counter on success
                            handleOperationSuccess();
                        }
                        
                        // Call the original callback
                        originalCallback(err, ...callbackArgs);
                    };
                }
                
                // Call the method on active client
                return value.apply(activeClient, args);
            };
        }
        
        // Return properties as-is (for event emitters, etc.)
        return value;
    }
});





/***
*
*	DEFINE a value for the cache storage time.
*	If you use this value in a function, it can help you controlled the caching time in centralized manner.
*   ie incase of development you can reduce this value to let the changes take effect instantly, in production you can
*   increase it.
*   This is exported from this module so to use it in other modules, you can import/use it as follows:
*   memcached_ops.CentralcacheTime
*   
*   Ensure you have imported this module in the file you want to use it.
*
******************************************************/
const CentralcacheTime = 120; //Value in seconds.


/***
*
*	DEFINE a prefix for the cache keys.
*   This is exported from this module so to use it in other modules, you can import/use it as follows:
*   memcached_ops.CacheKeyPrefix
*   
*   This is used to differentiate the data in cache to avoid conflicts with other apps or same apps
*   running on different platforms ie PHP etc. this way it will keep its own cache data separate from other apps.
*   Generally there is no need to export this, since this would already be used here in this module, set & get functions.
*
******************************************************/
const CacheKeyPrefix = 'NODEJS-';



//EXPORT MODULES
module.exports = 
{
memcached,             // MAIN EXPORT - Proxy client with automatic failover (BACKWARD COMPATIBLE)
getActiveClient,       // Export function to get currently active client
getFailoverStatus,     // Export function to get failover status for monitoring
failoverState,         // Export state for monitoring failover status
deleteCacheKey,
getFromMemcache,
getJsonFromMemcache,
CentralcacheTime,
setMemcache,
CacheKeyPrefix
};
