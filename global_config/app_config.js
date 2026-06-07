/**
 * We are storing different global configurations here for ease of access and modification.
 * All variables starts with gc_ to indicate that they are global configurations.
 * 
 */


//Consumer app endpoint port
var gc_consumer_endpoint_port 		= "50XX";


//Admin app endpoint port
var gc_admin_endpoint_port 			= "50XX";


//App local machine IP, on which the app is running.
var gc_local_machine_ip 			= "172.18.0.35";


// API Security Key - 20 random words for enhanced security
// This key must be included in all API requests via 'x-api-key' header
// Frontend will automatically include this key in all requests
// DO NOT expose this key in client-side code or network logs
var gc_api_security_key = process.env.API_SECURITY_KEY || "quantum thunderbolt majestic fortress crystal dragonfire shadowstorm phoenix eclipse nebula stardust cosmic infinity guardian prismatic vortex celestial aurora radiant";


module.exports = 
{
    gc_consumer_endpoint_port,
    gc_admin_endpoint_port,
    gc_local_machine_ip,
    gc_api_security_key
}