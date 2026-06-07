/***
* RABBIT MQ CONNECTION HANDLING
*
* Use this to establish connection with VT Queuing System/RabbitMQ.
* The extra parameters help ensure that the connection is re-established in case of a failure.
*
* CONFIGURATION
* ------------
* Configure your RabbitMQ credentials and connection settings at the top of this file:
* - RABBITMQ_USER: Your RabbitMQ username
* - RABBITMQ_PASS: Your RabbitMQ password
* - RABBITMQ_HOST: RabbitMQ server host
* - RABBITMQ_PORT: RabbitMQ server port
* - RABBITMQ_VHOST: Virtual host (use %2f for default /)
* - MAX_RECON_RETRIES: Maximum reconnection attempts (default: 30)
* - RECONNECTION_DELAY: Delay between reconnection attempts in ms (default: 10000)
* - MAX_RETRIES: Maximum retries for message sending (default: 3)
* - RETRY_DELAY: Delay between message send retries in ms (default: 2000)
* - MUNSHI_ENABLED: Enable/disable Munshi error reporting (default: true)
*
* USAGE
* -----
* Simply copy/paste this file in your app _core_apps_connectivity folder and import it in your app.js file with below line:

const rabbitmq_ops				= require('./_core_app_connectivity/rabbitmq');

* You can then use below code to securely start using rabbitmq once the connection is successfully established by listening to the event 'rabbitMQConnected'.


*
*
*	Event fired on Successful Connection with RabbitMQ.
*
**********
eventEmitter.on('rabbitMQConnected', () => 
{
	channelMQ = rabbitmq_ops.getChannelMQ();

	//Add error handling on the RabbitMQ connection
	channelMQ.on('error', (err) => 
	{
	    console.error(' [!] RabbitMQ Channel Error:', err.message);
	});
	
    Any of code that needs to be executed after the RabbitMQ connection is established.

});

*
* MUNSHI ERROR REPORTING INTEGRATION
* ----------------------------------
* This connector is integrated with the Munshi service for centralized error monitoring.
* All critical RabbitMQ errors are automatically reported to Munshi for tracking and alerting.
*
* Error Codes:
* - RABBITMQ-CONN-001: Connection error
* - RABBITMQ-CONN-002: Connection closed unexpectedly
* - RABBITMQ-CHAN-001: Channel error
* - RABBITMQ-CHAN-002: Channel closed unexpectedly
* - RABBITMQ-INIT-001: Initial connection failed
* - RABBITMQ-RECON-001: Reconnection attempt failed
* - RABBITMQ-RECON-002: Max reconnection attempts reached (critical - triggers process exit)
* - RABBITMQ-SEND-001: Message send failed after max retries
* - RABBITMQ-RETRY-001: Message retry failed
* - RABBITMQ-RETRY-002: Message max retries reached (moved to dead letter)
*
* TTL Configuration:
* - 90 days (7776000s): Critical system failures that cause service exit
* - 30 days (2592000s): Connection/channel errors, send failures, dead letter messages
* - 15 days (1296000s): Connection/channel close events, retry failures
*
* To disable Munshi reporting, set MUNSHI_ENABLED = false in this file.
*
**********/
const amqp = require('amqplib/callback_api');
const eventEmitter = require('./emitter');

/**
 * RABBITMQ CONFIGURATION
 * Configure your RabbitMQ connection settings below
 */
const RABBITMQ_USER = 'general_apps';
const RABBITMQ_PASS = 'ub4G5Ov779yL';
const RABBITMQ_HOST = '172.18.0.88';
const RABBITMQ_PORT = '5672';
const RABBITMQ_VHOST = '%2f'; // Default vhost, use %2f for /

// Construct RabbitMQ URL
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}/${RABBITMQ_VHOST}`;

/**
 * RECONNECTION CONFIGURATION
 */
const MAX_RECON_RETRIES = 30; // Maximum number of retries before exiting
const RECONNECTION_DELAY = 10000; // Reconnection delay in milliseconds (10 seconds)

/**
 * MESSAGE RETRY CONFIGURATION
 */
const MAX_RETRIES = 3; // Maximum retries for sending messages
const RETRY_DELAY = 2000; // Delay between retries in milliseconds (2 seconds)

/**
 * MUNSHI ERROR REPORTING CONFIGURATION
 */
const MUNSHI_ENABLED = true; // Set to false to disable Munshi error reporting

let channelMQ; // This will hold our channel
let connection; // This will hold our connection
let isReconnecting = false; // Flag to prevent multiple reconnections
let retryCount = 0; // Retry counter



async function startRabbitMQChannel(url) {
    // Close existing connection and channel before creating new ones
    if (channelMQ) {
        try {
            await channelMQ.close();
            console.log('Existing channel closed.');
        } catch (error) {
            console.error('Error closing existing channel:', error.message);
        }
    }

    if (connection) {
        try {
            await connection.close();
            console.log('Existing connection closed.');
        } catch (error) {
            console.error('Error closing existing connection:', error.message);
        }
    }

    connection = await new Promise((resolve, reject) => {
        amqp.connect(url, (err, conn) => {
            if (err) reject(err);
            else resolve(conn);
        });
    });

    connection.on('error', (err) => {
        console.error('FILE: rabbitmq.js | connection.on.error | Connection error:', err.message);
        
        // Report to Munshi service
        if (MUNSHI_ENABLED) {
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: err,
                error_code: 'RABBITMQ-CONN-001',
                error_title: 'RabbitMQ Connection Error',
                error_type: 'MQ_ERROR',
                metadata: {
                    connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                    reconnecting: isReconnecting,
                    retry_count: retryCount
                },
                other_data: {
                    error_message: err.message,
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 2592000 // 30 days for critical MQ errors
            });
        }
        
        if (!isReconnecting) {
            reconnectToRabbitMQ(url); // Attempt to reconnect
        }
    });

    connection.on('close', () => {
        console.log('FILE: rabbitmq.js | connection.on.close | Connection closed. Reconnecting...');
        
        // Report to Munshi service
        if (MUNSHI_ENABLED) {
            const error = new Error('RabbitMQ connection closed unexpectedly');
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'RABBITMQ-CONN-002',
                error_title: 'RabbitMQ Connection Closed',
                error_type: 'MQ_ERROR',
                metadata: {
                    connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                    reconnecting: isReconnecting,
                    retry_count: retryCount
                },
                other_data: {
                    auto_reconnect_enabled: true,
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 1296000 // 15 days for connection close events
            });
        }
        
        if (!isReconnecting) {
            reconnectToRabbitMQ(url); // Attempt to reconnect
        }
    });

    channelMQ = await new Promise((resolve, reject) => {
        connection.createChannel((err, channel) => {
            if (err) reject(err);
            else resolve(channel);
        });
    });

    channelMQ.on('error', (err) => {
        console.error('FILE: rabbitmq.js | channelMQ.on.error | Channel error:', err.message);
        
        // Report to Munshi service
        if (MUNSHI_ENABLED) {
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: err,
                error_code: 'RABBITMQ-CHAN-001',
                error_title: 'RabbitMQ Channel Error',
                error_type: 'MQ_ERROR',
                metadata: {
                    connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                    reconnecting: isReconnecting,
                    retry_count: retryCount
                },
                other_data: {
                    error_message: err.message,
                    channel_available: !!channelMQ,
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 2592000 // 30 days for critical MQ errors
            });
        }
        
        if (!isReconnecting) {
            reconnectToRabbitMQ(url); // Attempt to reconnect
        }
    });

    channelMQ.on('close', () => {
        console.log('FILE: rabbitmq.js | channelMQ.on.close | Channel closed. Reconnecting...');
        
        // Report to Munshi service
        if (MUNSHI_ENABLED) {
            const error = new Error('RabbitMQ channel closed unexpectedly');
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'RABBITMQ-CHAN-002',
                error_title: 'RabbitMQ Channel Closed',
                error_type: 'MQ_ERROR',
                metadata: {
                    connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                    reconnecting: isReconnecting,
                    retry_count: retryCount
                },
                other_data: {
                    auto_reconnect_enabled: true,
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 1296000 // 15 days for channel close events
            });
        }
        
        if (!isReconnecting) {
            reconnectToRabbitMQ(url); // Attempt to reconnect
        }
    });

    retryCount = 0; // Reset retry counter on successful connection
    return channelMQ;
}



async function reconnectToRabbitMQ(url) {
    if (isReconnecting) return; // Prevent multiple reconnections
    isReconnecting = true;

    console.log(`Attempting to reconnect to RabbitMQ in ${RECONNECTION_DELAY / 1000} seconds...`);
    setTimeout(async () => {
        try {
            await startRabbitMQChannel(url);
            eventEmitter.emit('rabbitMQConnected');
            console.log('Reconnected to RabbitMQ.');
            isReconnecting = false;
        } catch (error) {
            retryCount += 1;
            console.error(`FILE: rabbitmq.js | reconnectToRabbitMQ | Reconnection attempt ${retryCount} failed:`, error.message);

            // Report reconnection failure to Munshi
            if (MUNSHI_ENABLED) {
                eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                    error: error,
                    error_code: 'RABBITMQ-RECON-001',
                    error_title: 'RabbitMQ Reconnection Attempt Failed',
                    error_type: 'MQ_ERROR',
                    metadata: {
                        connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                        retry_count: retryCount,
                        max_retries: MAX_RECON_RETRIES,
                        reconnection_delay: RECONNECTION_DELAY
                    },
                    other_data: {
                        error_message: error.message,
                        will_retry: retryCount < MAX_RECON_RETRIES,
                        timestamp: Math.floor(Date.now() / 1000)
                    },
                    ttl: 2592000 // 30 days for reconnection failures
                });
            }

            if (retryCount >= MAX_RECON_RETRIES) {
                console.error(`FILE: rabbitmq.js | reconnectToRabbitMQ | Maximum retry attempts (${MAX_RECON_RETRIES}) reached. Exiting...`);
                
                // Report critical failure to Munshi before exiting
                if (MUNSHI_ENABLED) {
                    const criticalError = new Error(`RabbitMQ reconnection failed after ${MAX_RECON_RETRIES} attempts`);
                    eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                        error: criticalError,
                        error_code: 'RABBITMQ-RECON-002',
                        error_title: 'RabbitMQ Max Reconnection Attempts Reached - Service Exiting',
                        error_type: 'SYSTEM_ERROR',
                        metadata: {
                            connection_url: url.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                            retry_count: retryCount,
                            max_retries: MAX_RECON_RETRIES,
                            severity: 'critical',
                            action: 'process_exit'
                        },
                        other_data: {
                            last_error: error.message,
                            total_retry_time_ms: retryCount * RECONNECTION_DELAY,
                            timestamp: Math.floor(Date.now() / 1000)
                        },
                        ttl: 7776000 // 90 days for critical system failures
                    });
                    
                    // Give Munshi a moment to send the message before exiting
                    setTimeout(() => {
                        process.exit(1); // Exit the process to trigger PM2 restart
                    }, 1000);
                } else {
                    process.exit(1); // Exit the process to trigger PM2 restart
                }
            } else {
                isReconnecting = false;
                reconnectToRabbitMQ(url); // Retry reconnection
            }
        }
    }, RECONNECTION_DELAY);
}



async function connectToRabbitMQ() {
    try {
        await startRabbitMQChannel(RABBITMQ_URL);
        console.log('FILE: rabbitmq.js | connectToRabbitMQ | Successfully connected to RabbitMQ and created a channel.');
        eventEmitter.emit('rabbitMQConnected');
    } catch (error) {
        console.error(`FILE: rabbitmq.js | connectToRabbitMQ | Error: ${error.message}`);
        
        // Report initial connection failure to Munshi
        if (MUNSHI_ENABLED) {
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'RABBITMQ-INIT-001',
                error_title: 'RabbitMQ Initial Connection Failed',
                error_type: 'MQ_ERROR',
                metadata: {
                    connection_url: RABBITMQ_URL.replace(/\/\/.*:.*@/, '//***:***@'), // Mask credentials
                    connection_type: 'initial',
                    auto_retry_enabled: true
                },
                other_data: {
                    error_message: error.message,
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 2592000 // 30 days for connection failures
            });
        }
        
        reconnectToRabbitMQ(RABBITMQ_URL); // Attempt to reconnect
    }
}



// Start the connection establishment
connectToRabbitMQ();


// Calling the function in-order to allow the connection with RabbitMQ is established
// before the instance is called/used.
function getChannelMQ() 
{
    return channelMQ;
}





/*
*
*	Function to Send/Publish Data into RabbitMQ Q
*	Pass exchange field as empty '', in-case you want to publish to default exchange.
*
*   Never sent JSON Stringified data into this function as this double stringify it and will cause issues,
*   As this function already perform JSON.stringify on data being stored.
*
**********/
async function sendToRabbitMQ(queue, messages, headers = {}, exchange = '') 
{
    // Create or check the existence of the queue
    // Note: This is relevant if you're not using a specific exchange to route messages.
    if (exchange === '')
    {
        await channelMQ.assertQueue(queue, {
            durable: true // Ensuring the queue will survive broker restarts
        });
    }

    // Send the message to the queue    
    const sendMessage = async (message) => 
	{
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) 
		{
            try 
			{
				await channelMQ.publish(exchange, queue, Buffer.from(JSON.stringify(message)), { headers });
				return;  // Successful send
            } 
			catch (rabbitMQError) 
			{
                console.warn(`FILE: rabbitmq.js | sendToRabbitMQ | Attempt ${attempt} failed when sending to RabbitMQ. Retrying in ${RETRY_DELAY}ms...`);
                if (attempt < MAX_RETRIES) 
				{
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
				else 
				{
                    console.error("FILE: rabbitmq.js | sendToRabbitMQ | Max retries reached. Failed to send to RabbitMQ:", rabbitMQError);
                    
                    // Report to Munshi after max retries reached
                    if (MUNSHI_ENABLED) {
                        eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                            error: rabbitMQError,
                            error_code: 'RABBITMQ-SEND-001',
                            error_title: 'RabbitMQ Message Send Failed After Max Retries',
                            error_type: 'MQ_ERROR',
                            metadata: {
                                queue_name: queue,
                                exchange: exchange || 'default',
                                attempts: MAX_RETRIES,
                                retry_delay: RETRY_DELAY
                            },
                            other_data: {
                                error_message: rabbitMQError.message,
                                message_type: Array.isArray(message) ? 'array' : 'object',
                                headers: headers,
                                timestamp: Math.floor(Date.now() / 1000)
                            },
                            ttl: 2592000 // 30 days for send failures
                        });
                    }
                    
                    throw rabbitMQError;
                }
            }
        }
    };

    if(Array.isArray(messages)) 
	{
		await sendMessage(messages);
    } 
	else 
	{
        //Handle a single message
        await sendMessage(messages);
    }
}




/*
*
*	Function to handle Q Message retries, this stores a count
*	in header info, incase of maxRetries failures, this responds with nack
*	where the message is then moved to dead letter for onwards processing.
*	
*	It could be very useful in-case you want to retry a Q message incase of
*	any failures and that's too in controlled manner ie maintaining certain
*	number of retries.
*
*	The max_retries takes int value to attempt max retries on the message.
*
**********/
async function RetryQMessage(msg, max_retries, queue)
{
	//SET THE INITIAL RETRIES TO 1 AS A FAILED MESSAGE WILL REACH HERE FOR RETRY
    const currentRetryCount = msg.properties.headers['x-retry-count'] || 1;


    if(currentRetryCount < max_retries)
	{
		//CONVERT BUFFER TO JSON OBJECT
		const messageContent = JSON.parse(msg.content.toString());
		
				
        //UPDATE THE HEADER WITH THE INCREMENTED RETRY COUNT
        const headers = { ...msg.properties.headers, 'x-retry-count': currentRetryCount + 1 };
        
        try
		{
            //SEND THE UPDATED MESSAGE BACK TO THE SAME QUEUE
            await sendToRabbitMQ(queue, messageContent, headers);
            
            //IF WE REACH HERE, IT MEANS SENDTORABBITMQ WAS SUCCESSFUL, SO WE CAN ACKNOWLEDGE THE OLD MESSAGE
            channelMQ.ack(msg);
        }
		catch (error) 
		{
            console.error("FILE: rabbitmq.js | RetryQMessage | Failed to retry message:", error);
            
            // Report retry failure to Munshi
            if (MUNSHI_ENABLED) {
                eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                    error: error,
                    error_code: 'RABBITMQ-RETRY-001',
                    error_title: 'RabbitMQ Message Retry Failed',
                    error_type: 'MQ_ERROR',
                    metadata: {
                        queue_name: queue,
                        current_retry_count: currentRetryCount,
                        max_retries: max_retries,
                        message_requeued: true
                    },
                    other_data: {
                        error_message: error.message,
                        message_fields: msg.fields || {},
                        timestamp: Math.floor(Date.now() / 1000)
                    },
                    ttl: 1296000 // 15 days for retry failures
                });
            }
            
			//IF DESIRED, YOU CAN NACK THE MESSAGE HERE IF SENDING FAILS. OTHERWISE, IT WILL JUST REMAIN UNACKNOWLEDGED.
            channelMQ.nack(msg, false, true); 
        }
    }
	else 
	{
        console.error(`FILE: rabbitmq.js | RetryQMessage | Max retries (${max_retries}) reached for message in queue: ${queue}`);
        
        // Report max retries reached to Munshi
        if (MUNSHI_ENABLED) {
            const error = new Error(`Message max retries (${max_retries}) reached, moving to dead letter`);
            eventEmitter.emit('event_router', 'MUNSHI_EVENT', {
                error: error,
                error_code: 'RABBITMQ-RETRY-002',
                error_title: 'RabbitMQ Message Max Retries Reached',
                error_type: 'MQ_ERROR',
                metadata: {
                    queue_name: queue,
                    retry_count: currentRetryCount,
                    max_retries: max_retries,
                    moved_to_dead_letter: true
                },
                other_data: {
                    message_fields: msg.fields || {},
                    message_properties: msg.properties || {},
                    timestamp: Math.floor(Date.now() / 1000)
                },
                ttl: 2592000 // 30 days for dead letter messages
            });
        }
        
        //MAX RETRIES REACHED, NEGATIVELY ACKNOWLEDGE (YOU CAN CONFIGURE DEAD-LETTER EXCHANGE TO HANDLE THESE)
        channelMQ.nack(msg, false, false);  // THE LAST ARGUMENT AS `FALSE` MEANS IT WILL NOT BE RE-QUEUED
    }
}



module.exports = 
{
getChannelMQ,
sendToRabbitMQ,
RetryQMessage
};