const express = require('express');
const router = express.Router();
const moment = require('moment');
const reqMiddleware = require('../middleware/wa.middleware');


/*
 *  
 * This route is for recieving messages from whatsapp, it supports text, image, audio, video, document and template messages.
 * We are keeping & generating below mentioned data in the request body during the request lifecycle:
 * req.account which holds the account details of the user
 * 
 * *********************************************************/
router.post(
  '/webhook/:id',
  reqMiddleware.get_wa_account_data_by_id,
  reqMiddleware.transform_body,
  reqMiddleware.validate_inward_message,
  reqMiddleware.identify_traffic('inward'),
  reqMiddleware.identify_country,
  reqMiddleware.check_or_add_contact_from_webhook,
  reqMiddleware.pass_through_rules_engine,
  reqMiddleware.manage_conv_session_from_webhook,
  whatsappController.push_to_bg_service
);

module.exports = router; 