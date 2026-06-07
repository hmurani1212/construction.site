/***
* DB CONNECTION HANDLING - MONGODB (MONGOOSE)
*
* Use this to establish connection with your MongoDB database.
* The extra parameters help ensure that the connection is re-established in case of a failure.
*
* CONFIGURATION
* ------------
* Configure your MongoDB connection settings below:
* - MONGO_USER: MongoDB username
* - MONGO_PASSWORD: MongoDB password
* - MONGO_SERVER_IP: MongoDB server IP and port
* - MONGO_AUTH_DB: Authentication database
* - MAX_POOL_SIZE: Maximum number of connections in pool
* - SERVER_SELECTION_TIMEOUT: Server selection timeout in milliseconds
* - SOCKET_TIMEOUT: Socket timeout in milliseconds
* - MAX_LISTENERS: Maximum event listeners
* - MUNSHI_ENABLED: Enable/disable Munshi error reporting
*
* USAGE:
* Simply copy/paste this file in your app _core_apps_connectivities folder and import it in your app.js file with below line:

const mongoose_connection = require('./db_mongo_mongoose');

* You can then use mongoose_connection to perform your database operations.
*
* MUNSHI ERROR REPORTING INTEGRATION
* ----------------------------------
* This connector is integrated with the Munshi service for centralized error monitoring.
* All critical MongoDB errors are automatically reported to Munshi for tracking and alerting.
*
* Error Codes:
* - MONGO-CONN-001: Initial connection failure
* - MONGO-CONN-002: Connection error during runtime
* - MONGO-CONN-003: Connection disconnected
* - MONGO-CONN-004: Connection reconnected successfully
*
* TTL Configuration:
* - 90 days (7776000s): Initial connection failures
* - 30 days (2592000s): Runtime connection errors and disconnections
* - 7 days (604800s): Reconnection events
*
* To disable Munshi reporting, set MUNSHI_ENABLED = false in this file.
*
**********/
const mongoose = require("mongoose"); // Import mongoose for MongoDB connection
const eventEmitter = require('./emitter');

/**
 * MONGODB CONFIGURATION
 */
const MONGO_CONNECTION_STRING = process.env.MONGO_URI || "mongodb+srv://Project:A6pyWYW5Hbu7QE9T@cluster0.obxjkz6.mongodb.net";
const DB_NAME = process.env.DB_NAME || "Grossery_store";

/**
 * CONNECTION POOL AND TIMEOUT CONFIGURATION
 */
const MAX_POOL_SIZE = 250; // Adjust this based on your server capabilities
const SERVER_SELECTION_TIMEOUT = 30000; // Server selection timeout in milliseconds
const SOCKET_TIMEOUT = 45000; // Socket timeout in milliseconds
const MAX_LISTENERS = 20; // Maximum event listeners

/**
 * MUNSHI ERROR REPORTING CONFIGURATION
 */
const MUNSHI_ENABLED = true; // Set to false to disable Munshi error reporting

// Adjust the number of event listeners based on your application's needs
mongoose.connection.setMaxListeners(MAX_LISTENERS);

// Connect to MongoDB
mongoose.connect(MONGO_CONNECTION_STRING, 
    { 
        dbName: DB_NAME,
        maxPoolSize: MAX_POOL_SIZE,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
        socketTimeoutMS: SOCKET_TIMEOUT
    }
).then(() => {
    console.log(`FILE: db_mongo_mongoose.js | mongoose.connect | Successfully connected to MongoDB database: ${DB_NAME}`);
}).catch((error) => {
    console.error("FILE: db_mongo_mongoose.js | mongoose.connect | MongoDB Connection Failure:", error);
    
    // Report initial connection failure to Munshi
    if (MUNSHI_ENABLED) {
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'MONGO-CONN-001',
            error_title: 'MongoDB Initial Connection Failed',
            error_type: 'DB_ERROR',
            metadata: {
                connection_string: MONGO_CONNECTION_STRING.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Mask credentials
                database: DB_NAME,
                max_pool_size: MAX_POOL_SIZE,
                server_selection_timeout: SERVER_SELECTION_TIMEOUT,
                severity: 'critical'
            },
            other_data: {
                error_message: error.message,
                error_name: error.name,
                error_code: error.code,
                timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 7776000 // 90 days for initial connection failures
        });
    }
});

// Connection event listeners for monitoring
mongoose.connection.on('connected', () => {
    console.log('FILE: db_mongo_mongoose.js | connection.on.connected | Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('FILE: db_mongo_mongoose.js | connection.on.error | Mongoose connection error:', err);
    
    // Report runtime connection errors to Munshi
    if (MUNSHI_ENABLED) {
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: err,
            error_code: 'MONGO-CONN-002',
            error_title: 'MongoDB Runtime Connection Error',
            error_type: 'DB_ERROR',
            metadata: {
                database: DB_NAME,
                connection_state: mongoose.connection.readyState,
                error_name: err.name
            },
            other_data: {
                error_message: err.message,
                error_code: err.code,
                timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 2592000 // 30 days for runtime connection errors
        });
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('FILE: db_mongo_mongoose.js | connection.on.disconnected | Mongoose disconnected from MongoDB');
    
    // Report disconnection to Munshi
    if (MUNSHI_ENABLED) {
        const error = new Error(`MongoDB connection disconnected from database: ${DB_NAME}`);
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'MONGO-CONN-003',
            error_title: 'MongoDB Connection Disconnected',
            error_type: 'DB_ERROR',
            metadata: {
                database: DB_NAME,
                connection_state: 'disconnected',
                severity: 'warning'
            },
            other_data: {
                timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 2592000 // 30 days for disconnection events
        });
    }
});

mongoose.connection.on('reconnected', () => {
    console.log('FILE: db_mongo_mongoose.js | connection.on.reconnected | Mongoose reconnected to MongoDB');
    
    // Log successful reconnection (informational, shorter TTL)
    if (MUNSHI_ENABLED) {
        const error = new Error(`MongoDB connection successfully reconnected to database: ${DB_NAME}`);
        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
            error: error,
            error_code: 'MONGO-CONN-004',
            error_title: 'MongoDB Connection Reconnected Successfully',
            error_type: 'DB_ERROR',
            metadata: {
                database: DB_NAME,
                connection_state: 'reconnected',
                severity: 'info'
            },
            other_data: {
                timestamp: Math.floor(Date.now() / 1000)
            },
            ttl: 604800 // 7 days for reconnection events (informational)
        });
    }
});

module.exports = mongoose.connection;