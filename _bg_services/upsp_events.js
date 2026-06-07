/**
*
*	This service is responsible for handling events received directly from Up stream partner
*   ie Meta, these events could be related to new whatsapp messages or general other notifications
*   ie related to account, number quality etc.
*
*   These events are processed, and segregated to forward them to relevant endpoints within the WhatsApp engine.
*
*
*********************/
const moment     = require('moment');
const axios      = require('axios');
const mongoose   = require("mongoose");
const handlebars = require('handlebars');



/**
 * 
 * Importing Basic data/connectivity services.
 * 
 ********************/
const eventEmitter            = require('../_core_app_connectivities/emitter');
mongoose.connection           = require('../_core_app_connectivities/db_mongo_mongoose');
const memcached_ops           = require('../_core_app_connectivities/memcache');
const rabbitmq_ops            = require('../_core_app_connectivities/rabbitmq');
const global_app_config       = require('../global_config/app_config');


const webhooks_service        = require('../services/webhooks.service');
const inward_message_service  = require('../classes/Inward.message');
const inward_message_model    = require("../models/inward.model");
const wa_account_services     = require("../services/wa_accounts.service");

const rules_engine_v2_service = require("../services/rules_engine_v2.service");

const template_service        = require("../services/template.service");


//Initiate RabbitMQ channel
let channelMQ = null;




/*
*
*	START consuming the Q: CPAAS_WAE_UPSP_EVENTS
*   This service is processing the events received directly from up stream partner ie Meta
*   These events are processed, and segregated to forward them to relevant endpoints within the WhatsApp engine.
*
*   Each event is evaluated to retrieve the receiptent WA ID/Mobile number, get it's account ID and then forward 
*   it to it's relevant webhook.
*
**********/
async function startConsumingInwardEvents(channelMQ)
{
	//QUEUE THAT NEEDS TO BE CONSUMED
    const queue = 'CPAAS_WAE_UPSP_EVENTS';

    console.log('FILE: upsp_events.js | startConsumingInwardEvents | [*] Waiting for messages in %s. To exit press CTRL+C', queue);
	
    //Set the prefetch count here, it limits the number of messages that can be consumed at a time.
    channelMQ.prefetch(30);

    channelMQ.consume(queue, async (msg) => 
	{
        //Let's set it to false, you can set it to true if you want to acknowledge the message
        //anywhere in the code if the process is completed and further loop needs not to be executed.
        let message_ack_status = false;

        try 
        {
            if(msg !== null)
			{
		        let event_body			    = JSON.parse(msg.content.toString());
                console.log('FILE: upsp_events.js | startConsumingInwardEvents | New event received:', JSON.stringify(event_body, null, 4));

                //Loop through all the entries in the messages, since meta can send multiple entries
                //aggregated in one message.

                //Check if the message is a WhatsApp Business Account, then process accordingly
                if (event_body.object === 'whatsapp_business_account' && event_body.entry){
                    //Iterate through each entry
                    for (const entry of event_body.entry) {

                        //Iterate through each change
                        for (const change of entry.changes) {

                            //Let's prepare the single event message body to be processed/or send further.
                            let event_body_single = 
                            {
                                object: event_body.object,
                                entry: 
                                [
                                    {
                                        id: entry.id,
                                        changes: [change]
                                    }
                                ]
                            };                        



                            //Let's process the single event now
                            
                            //Forward it to template handling function incase its related to template Quality Score
                            if(change.field && change.field === 'message_template_quality_update')
                            {

                                await template_service.update_template_quality(0, change.value.message_template_id, change.value.new_quality_score);
                                
                                console.log('FILE: upsp_events.js | startConsumingInwardEvents | Template#'+change.value.message_template_id+' Quality Score:'+change.value.new_quality_score+' received.');
                                
                                //Break the loop iteration, since the message is processed
                                message_ack_status = true;
                            }



                            //Forward it to template handling function incase its related to template Category Update
                            if(change.field && change.field === 'template_category_update')
                            {
                                await template_service.update_template_quality(0, change.value.message_template_id, '', change.value.new_category);
                                
                                console.log('FILE: upsp_events.js | startConsumingInwardEvents | Template#'+change.value.message_template_id+' Category Updated to '+change.value.new_category);
                                
                                //Break the loop iteration, since the message is processed
                                message_ack_status = true;
                            }




                            //Incase the loop needs to be marked as complated and message needs to be Acknowledged
                            if(message_ack_status === true)
                            {
                                channelMQ.ack(msg);
                                continue;
                            }


                            //Forward the event to WhatsApp Engine Webhooks Processor /webhhok/account_id
                            //Get the receiver WA ID account details from the database
                            let receipt_wa_id = change.value.metadata?.display_phone_number;

                            //Adds a leading '+' to a phone number if it's missing.
                            if (receipt_wa_id !== '+')
                            {
                                receipt_wa_id = `+${receipt_wa_id}`;
                            }

                            let account = await wa_account_services.get_wa_account_data_by_waid(receipt_wa_id);
                            account = account[0];   //Pick the first record only.
                            console.log('FILE: upsp_events.js | startConsumingInwardEvents | Account:', account);

                            //If the account details are found, it sets the account object in the request and proceeds to the next middleware
                            if(account?.wa_id?.length > 1)
                            {
                                //Prepare the webhook URL to push the event to the respective account webhook
                                const webhook_url = "http://"+global_app_config.gc_local_machine_ip+":"+global_app_config.gc_consumer_endpoint_port+"/wa/webhook/"+account._id;
                                console.log('FILE: upsp_events.js | startConsumingInwardEvents | Forwarding to webhook:', webhook_url, ' | Event:', JSON.stringify(event_body_single, null, 4));


                                const webhook_response = await webhooks_service.push_request_to_webhook(webhook_url, event_body_single);
                                if(webhook_response.STATUS === "SUCCESSFUL")
                                {
                                    //Do something if required

                                    //Acknowledge the message since processing successful
                                    channelMQ.ack(msg);
                                }
                                else
                                {
                                    throw new Error('Webhook push failed for WhatsApp ID '+receipt_wa_id);
                                }

                            }
                            else
                            {
                                throw new Error('Account not found against the WhatsApp ID '+receipt_wa_id);
                            }

                    }
                }
            }
            else
            {
                console.error('FILE: upsp_events.js | startConsumingInwardEvents | Message body not found, discarding the message.', JSON.stringify(event_body, null, 4));
                channelMQ.ack(msg);

            }

            }

        } catch (error) {
            console.log('FILE: upsp_events.js | startConsumingInwardEvents | Caught an error:', error.message);
            console.error('FILE: upsp_events.js | startConsumingInwardEvents | Error:', error);
            //Seems to have some issues with RabbitMQ, so requeing the message
            rabbitmq_ops.RetryQMessage(msg, 10, queue);
        }
    }, {
        noAck: false
    });
}



/*
*
*	Event fired, initialize Q consumption.
*
**********/
eventEmitter.on('rabbitMQConnected', () => 
{
	channelMQ = rabbitmq_ops.getChannelMQ();

    //Start Inward Message Processor
	startConsumingInwardEvents(channelMQ);

    console.log(`Listening for messages on Q`);
    
	//Add error handling on the RabbitMQ connection
	channelMQ.on('error', (err) => 
	{
	    console.error(' [!] RabbitMQ Channel Error:', err.message);
	});
    
});