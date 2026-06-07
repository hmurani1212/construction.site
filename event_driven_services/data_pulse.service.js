/**
 * 
 * This is a central service for reporting analytics to the data pulse service.
 * The following functions are attached to events which can be fired anywhere in the application, and the particular event
 * would be reported to data pulse service accordingly and seamlessly, this approach makes the application maintenance more convenient.
 * Plus it allows to add more reporting/analytics without any hassle, ie without any code changes in the application.
 * Simply emit an event with the data to be reported, the event name should be "report_to_datapulse".
 * 
 * You can either directly call the function report_to_data_pulse() with the required data or emit an event with the data to be reported,
 * the event name should be "report_to_datapulse".
 * Whatever approach you choose, as per your technical requirement, the data will be reported to data pulse service.
 * 
 * Here is the format of the data that needs to be passed to the function or emitted with the event: 
 * 
 * event_data:
 * {
 *  datapulse_app_id: OneID Application int ID,
 *  datapulse_user_id: User ID within the Application or 0 for global analytics,
 *	datapulse_activity_id: Data Pulse Activity Alphanumeric ID,
 * 	datapulse_activity_ref_id: Referenced ID for the Activity as per your Application event/activity,
 * 	datapulse_event_label: Any label that you want to be reported with data, useful when rendering analytics based on this data, ie Users, Comments etc.
 * 	datapulse_adjustment: "add" or "sub" for addition or subtraction of the event count, this is optional and defaults to "add".
 * 	datapulse_event_count: Int value of the event count to be reported ie 1 for a single event, this is optional and defaults to 1.
 * 	datapulse_event_timestamp: Unix timestamp of the event, if not provided, current timestamp will be used, this is optional, defaults to current timestamp.
 * }
 * 
 * For example, if you want to report a events to create analytics, say for "Number of SMS Sent & Delivered cellular network wise", you can emit an event with the following data:
 * 
 * {
 * 	datapulse_app_id: 8586, //OneID Application ID for Data Pulse Service
 * 	datapulse_user_id: 0, //0 for global analytics
 * 	datapulse_activity_id: "sms_sent_network_wise", //Data Pulse Activity ID
 * 	datapulse_activity_ref_id: "Telenor", //Referenced ID for the Activity as per your Application event/activity
 * 	datapulse_event_label: "SMS Sent", //Any label that you want to be reported with data, useful when rendering analytics based on this data, ie Users, Comments etc.
 * }
 * 
 * For delivery analytics, you can emit an event with the following data:
 * 
 * {
 * 	datapulse_app_id: 8586, //OneID Application ID for Data Pulse Service
 * 	datapulse_user_id: 0, //0 for global analytics
 * 	datapulse_activity_id: "sms_delivered_network_wise", //Data Pulse Activity ID
 * 	datapulse_activity_ref_id: "Telenor", //Referenced ID for the Activity as per your Application event/activity
 * 	datapulse_event_label: "SMS Delivered", //Any label that you want to be reported with data, useful when rendering analytics based on this data, ie Users, Comments etc.
 * }
 * 
 * The user_id & datapulse_activity_ref_id can be set to 0, these are just helpful incase you have sub-analytics within an activity,
 * So these values can later help you to filter analytics based on user or activity ID while retrieving data from data pulse service.
 * Since data pulse service is designed to handle large volumes of data, and it doesn't store each record of the event, but only the 
 * aggregated data, so it is always better to set the user_id & datapulse_activity_ref_id incase you are storing analytics that are 
 * unique to a user or activity, the above examples explain this better.
 * 
 * In other words say if you need to create analytics for "Number of users getting registered per day", you can emit an event with the following data:
 * 
 * {
 * 	datapulse_app_id: 8586, //OneID Application ID for Data Pulse Service
 * 	datapulse_user_id: 0, //0 for global analytics
 * 	datapulse_activity_id: "user_registered_per_day", //Data Pulse Activity ID
 * 	datapulse_activity_ref_id: "", 
 * 	datapulse_event_label: "Users Registered", //Any label that you want to be reported with data, useful when rendering analytics based on this data, ie Users, Comments etc.
 * }
 * 
 * As in this case we don't need user_id or activity_ref_id, so we can set them to empty string.
 * 
 * The aggregation configuration:
 * Datapulse manages the aggregation configuration for each activity, so you don't need to worry about it, 
 * When you setup an activity, you can set the aggregation configuration as per your requirement, 
 * and datapulse will handle the rest.
 * Each activity can have different aggregation configuration at the same time, for example:
 * DP offers Custom Number of minutes, Hourly, Daily, Monthly, Yearly & Lifetime aggregation configurations.
 * For example:
 * You want to plot a graph that shows per 5 minutes registered users for the past 24 hours & daily registered users,
 * you can set the aggregation configuration to "Custom Number of minutes" with 5 minutes interval & "Daily" aggregation configuration.
 * 
 * All aggregation configurations supports TTL, so you can set the TTL as per your requirement, 
 * For example in above example where you need to plot graph to show per 5 minutes registered users for the past 24 hours,
 * you can set the TTL to 24 hours, so that the data will be available for the past 24 hours only, and the rest will be 
 * deleted automatically.
 * 
 ************************************************************************/


/**
 * 
 * Importing Basic data/connectivity services.
 * 
 ********************/
const eventEmitter = require('../_core_app_connectivities/emitter');
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');
const moment = require('moment');

/**
 * 
 * Configuring the Data Pulse Service
 * 
 *********************/
const data_pulse_app_id = 8586; //OneID Application ID for Data Pulse Service



/*** 
*
*	Listen to events related to report_to_datapulse which actually process
*	the event data and reports it to data pulse service.
*
*	Make sure to add event_id to any unique event ID so that you can process
*	& customize event data in effortless way.
*
**********/
eventEmitter.on('report_to_datapulse', async (event_data) => {
    try {
        console.log(`FILE: data_pulse.service.js | report_to_datapulse event | Received event data`);

        /**
         * Start - Let's handle events to customize the data/event reporting to data pulse, if required.
         ***/

        //Any customization to the event data can be done here.
        //if(event_data.event_id == "message_sent"){event_data.datapulse_event_label = "Custom Label";}

        /**
         * Let's pass the modified event data to the data pulse function to be reported to data pulse service.
         ***/
        report_to_data_pulse(event_data);
        
    } catch (error) {
        console.error(`FILE: data_pulse.service.js | report_to_datapulse event | Error processing event data:`, error);
    }
});





/**
 * 
 * This function reports the data to data pulse service.
 * 
 * It accepts the following parameter in event_data array:
 * 
 * event_data:
 * {
 *     datapulse_app_id: OneID Application ID,
 *     datapulse_user_id: User ID within the Application or 0 for global analytics,
 *     datapulse_activity_id: Data Pulse Activity ID,
 *     datapulse_activity_ref_id: Reference ID for the Activity as per Application event/activity,
 *     datapulse_event_label: Any label that you want to be reported with data, useful when rendering analytics based on this data.
 *     datapulse_adjustment: "add" or "sub" for addition or subtraction of the event count,
 *     datapulse_event_count: Int value to be reported as event count ie 1,
 *     datapulse_event_timestamp: Unix timestamp of the event, if not provided, current timestamp will be used.
 * }
 * 
 * @param {array} event_data - It takes the data as explained above.
 * 
 **********/
async function report_to_data_pulse(event_data)
{
    try {
        console.log(`FILE: data_pulse.service.js | report_to_data_pulse | Processing event data for activity: ${event_data.datapulse_activity_id}`);
        
        /**
         * 	Setup body as per Data Pulse Requirements
         ******/
        const queue_name = "data_pulse_queue";

        //Set undefined required fields.
        if (!event_data.datapulse_app_id) { event_data.datapulse_app_id = data_pulse_app_id; }
        if (!event_data.datapulse_adjustment) { event_data.datapulse_adjustment = "add"; }
        if (!event_data.datapulse_event_count) { event_data.datapulse_event_count = 1; }
        if (!event_data.datapulse_event_timestamp) { event_data.datapulse_event_timestamp = moment().unix(); }
        if (!event_data.datapulse_activity_ref_id) { event_data.datapulse_activity_ref_id = ""; }

        //Prepare Request body for Data Pulse, it expects array of objects.
        const q_msg_body =
            [
                {
                    app_id: event_data.datapulse_app_id,
                    user_id: event_data.datapulse_user_id,
                    name: event_data.datapulse_activity_id,
                    activity_ref_id: event_data.datapulse_activity_ref_id,
                    event_label: event_data.datapulse_event_label,
                    adjustment: event_data.datapulse_adjustment,
                    event_count: event_data.datapulse_event_count,
                    event_timestamp: event_data.datapulse_event_timestamp
                }
            ];


        //Publish to RabbitMQ
        try 
        {
            await rabbitmq_ops.sendToRabbitMQ(queue_name, q_msg_body);
            console.log(`FILE: data_pulse.service.js | report_to_data_pulse | Data Pulse Event Reported for activity: ${event_data.datapulse_activity_id}`);

        } catch (error) {
            console.error(`FILE: data_pulse.service.js | report_to_data_pulse | Failed to report data pulse event, will retry: `, error);
            
            // Start the retry process with 60 max attempts
            retry_rabbitmq_send(queue_name, q_msg_body, event_data, 60);
        }
    } catch (error) {
        console.error(`FILE: data_pulse.service.js | report_to_data_pulse | Error processing event data:`, error);
    }
}

/**
 * Retry sending a message to RabbitMQ with exponential backoff
 * Will only retry if the previous attempt failed
 * 
 * @param {string} queue_name - The RabbitMQ queue name
 * @param {array} msg_body - The message body to send
 * @param {object} event_data - The original event data for logging
 * @param {number} retries_left - Number of retry attempts remaining
 */
function retry_rabbitmq_send(queue_name, msg_body, event_data, retries_left) {
    // Stop if no more retries left
    if (retries_left <= 0) {
        console.error(`FILE: data_pulse.service.js | retry_rabbitmq_send | Max retries reached for activity: ${event_data.datapulse_activity_id}`);
        return;
    }
    
    // Calculate a random delay between 5-10 seconds
    const random_delay = Math.floor(Math.random() * 5000) + 5000;
    
    setTimeout(() => {
        try {
            // Attempt to send the message
            rabbitmq_ops.sendToRabbitMQ(queue_name, msg_body);
            console.log(`FILE: data_pulse.service.js | retry_rabbitmq_send | Retry successful for activity: ${event_data.datapulse_activity_id} (${retries_left} attempts remaining)`);
            // Success - no more retries needed
        } catch (retry_error) {
            console.error(`FILE: data_pulse.service.js | retry_rabbitmq_send | Retry failed for activity ${event_data.datapulse_activity_id}, ${retries_left-1} attempts remaining:`, retry_error);
            // Only schedule next retry if this one failed
            retry_rabbitmq_send(queue_name, msg_body, event_data, retries_left - 1);
        }
    }, random_delay);
}

// Export the function for direct calling
module.exports = {
    report_to_data_pulse
};


