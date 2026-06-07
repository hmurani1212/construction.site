/**
 * SHARED DATABASE CONNECTION MODULE
 * 
 * This module provides a shared database connection instance that all models use.
 * This ensures all models are registered on the same connection, which is required
 * for Mongoose populate() operations to work correctly.
 * 
 * All models should import this module and use db_connection instead of mongoose.connection.useDb()
 */

const mongoose = require("mongoose");
// Import the main connection to ensure it's initialized
const mongoose_connection = require("./db_mongo_mongoose");

// Get the shared database connection instance
// useDb() with the same name returns the same instance, ensuring all models use the same connection
// This is critical for populate() to work correctly
const db_connection = mongoose.connection.useDb("Contruction_Manager");

console.log(`FILE: db_connection_shared.js | Shared database connection created for: Grossery_store (connection state: ${mongoose.connection.readyState})`);

// Export the connection instance
module.exports = {
  db_connection
};

