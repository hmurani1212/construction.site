//DB CONNECTION HANDLING
/*
*
* Use this to establish connection with your MongoDB database.
* The extra parameters help ensure that the connection is re-established in case of a failure.
*
* Simply copy/paste this file in your app _core_apps_connectivity folder and import it in your app.js file with below line:

const mongo_client = require('./db_mongo').getClient();
const mongo_db1 = client.db('database1');
const mongo_db2 = client.db('database2');

* You can then use db1 and db2 to perform your database operations.
**********/
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://USER:PASS@172.18.0.71:27017/admin';
const options = 
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000
};

let db;

async function connect() 
{
    const client = await MongoClient.connect(url, options);
}

connect().catch(error => 
{
    console.error('Failed to connect to the data source.', error);
    process.exit(1);
});

module.exports = 
{
    getClient: () => client
};