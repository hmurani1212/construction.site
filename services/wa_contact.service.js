/**
 * 
 * This service is responsible for handling all the operations related to the contacts of the whatsapp account.
 * It includes the following operations:
 * 1. Check if the contact exists in the database
 * 2. Check if the contact is blocked
 * 3. Create a new contact
 * 4. Get contact by wa_id
 * 
 *****************/

const axios               = require("axios").default;
const retry               = require('async-retry');
const memcached_ops				= require('../_core_app_connectivities/memcache');

class wa_contacts_services 
{


  constructor() 
  {
    this.wa_contact_model = require("../models/wa_contact");
  }


  /**
   * 
   * This function checks if the contact exists in the database. If it does, it returns the contact.
   * If it does not, it creates a new contact and returns it.
   * 
   * The type parameter is used to determine if the contact is being check from incoming as 0 or outgoing as 1 messages,
   * Where this type is then later used in data storage to help in the identification of the contact on how it was added
   * for the first time, either from the incoming (opt-in) or outgoing messages.
   ***********************/
  async check_or_add_contact(wa_id, wa_account, type, name)
  {

    try 
    {
      //Replace starting + in wa_id with empty string, incase exists.
      if(wa_id[0] === "+"){ wa_id = wa_id.replace("+", ""); }


      //Find the contact in the database/cache
      const contact = await this.getContactByWaID(wa_id, wa_account._id);

      if(contact && contact.number !== null) 
      {
        return contact;
      }
      else 
      {
        //If contact does not exist, create a new one and cache it
        const newContact = await this.createContact({
          wa_id: wa_id,
          account_id: wa_account._id,
          number: wa_id,
          name: name,
          first_addition: type,
        });

        return newContact;
        }
    } catch (error) {
      console.error("Error in check_or_add_contact for ", wa_id, ":", error);
      throw error; // Ensure proper error handling or rethrow
    }

    return null;
  }





  async isBlockedContact(wa_id) 
  {
    //Replace starting + in wa_id with empty string, incase exists.
    if(wa_id[0] === "+"){ wa_id = wa_id.replace("+", ""); }

    const isBlocked = await this.wa_contact_model.find({ wa_id: wa_id });
    if (isBlocked.length > 0) {
      return true;
    } else {
      return false;
    }
  }



  

  /**
   * 
   * This function creates a new contact in the database.
   * It also caches the newly created contact in the memcache.
   * 
   * It takes the following parameters:
   * 1. wa_id: The whatsapp id of the contact
   * 2. account_id: The account id of the user
   * 3. number: The phone number of the contact
   * 4. name: The name of the contact
   * 5. first_addition: The type of addition of the contact, either from incoming or outgoing messages 0 or 1
   * 
   * 
   ******************/
  async createContact(body) 
  {

    //Replace starting + in wa_id with empty string, incase exists.
    if(body.wa_id[0] === "+"){ body.wa_id = body.wa_id.replace("+", ""); }

    // Construct a unique cache key using wa_id and account_id
    const cacheKey = `CPAAS-WAE-CONTACT-${body.wa_id}-${body.account_id}`;

    let newContact;
    try
      {
      // Wrap the database query in retry logic, but only retry on certain errors
      newContact = await retry(async () => {
        try 
        {
            const newContactToSave = this.wa_contact_model(body);
            return await newContactToSave.save();
        } catch (error) {
          if (error.name === 'MongoNetworkError' || error.message.includes('timeout')){
            // This type of error might be transient, so it's potentially retriable
            throw error;
          } else {

          }
        }
      }, {
        retries: 5,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (err, attempt) => {
          console.error(`FILE: wa_contact.service.js:163 | createContact | Retrying database operation, attempt ${attempt}:`, err);
        }
      });
      } catch (error) {
        console.error('FILE: wa_contact.service.js:167 | createContact | Error creating contact:', error);
        return operation_response;
      }

      //Contact created successfully, cache it
      if(newContact && newContact.number !== null) 
      {
      await memcached_ops.memcached.set(cacheKey, JSON.stringify(newContact), memcached_ops.CentralcacheTime, (err) => {
        if (err) console.error("FILE: wa_contact.service.js:73 | createContact | Error caching data for ", cacheKey, ":", err);
      });
      }


    return newContact;
  }





/**
 * 
 * This function gets the contact by wa_id and account_id from the database, but first checks if the contact is in the cache.
 * 
 ****************/
async getContactByWaID(wa_id, account_id)
{

  //Replace starting + in wa_id with empty string, incase exists.
  if(wa_id[0] === "+"){ wa_id = wa_id.replace("+", ""); }
  
  // Construct a unique cache key using wa_id and account_id
  const cacheKey = `CPAAS-WAE-CONTACT-${wa_id}-${account_id}`;

  try 
  {
    // Try to retrieve contact from cache
    let cachedContact = await memcached_ops.getJsonFromMemcache(cacheKey);
    if(cachedContact) 
    {
      return cachedContact;
    }

    //If not found in cache, search in the database
    const contact = await this.wa_contact_model.findOne({
      wa_id: wa_id,
      account_id: account_id,
    });

    if(contact && contact.number !== null) 
    {
      // If contact is found, cache it
      await memcached_ops.memcached.set(cacheKey, JSON.stringify(contact), memcached_ops.CentralcacheTime, (err) => {
        if (err) console.error("FILE: wa_contact.service.js:180 | getContactByWaID | Error caching data for ", cacheKey, ":", err);
      });

      return contact;
    }
  } catch (error) {
    console.error("FILE: wa_contact.service.js:183 | getContactByWaID | Error getting contact by wa_id: ", wa_id, "Error:", error);
    throw error; // Ensure proper error handling or rethrow
  }

  return null;
}



}



// Export the service
module.exports = new wa_contacts_services();