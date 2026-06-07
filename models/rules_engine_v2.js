const mongoose   = require("mongoose");
const { Schema } = mongoose;
const moment     = require("moment");

const whatsapp_engine = mongoose.connection.useDb("whatsapp_engine");

const rules_engine = new Schema({
  _id: {type: mongoose.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), },
  rule_name: {type: String, default: "General Rule",},
  account_id: {type: Number, ref: "wa_accounts", default: 0,},
  segment_type: {
    type: String,
    default: "general", //Should always be in small letters for easier matching
  },
  //Ref ID of respective segment, suppose if segment is 'webhooks', then this field will contain the webhook ID from the webhook manager
  segment_ref_id: {
    type: String,
    default: null, 
  },  
  rule_conditions: {
    type: Array,
    required: true,
  },
  rule_events: {
    type: Array,
    required: true,
  },
  rule_priority: {
    type: Number,
    min: 1,
    max: 99,
    default: 1,
  },
  active_status: {
    type: Number,
    enum: [0, 1], //Rule enforcement status 0:Inactive, 1:Active
    default: 1,
  },
  rule_description: {
    type: String,
    default: null,
  },
  entry_time: {
    type: Number,
    default: () => moment().unix(),
  },
});

module.exports = whatsapp_engine.model("rules_engine_v2", rules_engine);