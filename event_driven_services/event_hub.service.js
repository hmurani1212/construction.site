/**
 * VT Events HUB - Events Publisher Service - Standardized Event Envelope System
 * 
 * Provides a universal event envelope format that integrates with the existing Event Router.
 * This service standardizes event emission across VT Apps ecosystem.
 * 
 * Built to work with: event_router.service.js and existing event patterns, and rabbitmq.service.js
 * 
 * The Events HUB is specialized and central service for all the events across the VT Apps ecosystem,
 * which can later distribute the events to the relevant services/jobs as needed.
 * The events hub also let you explore all the events configured in your app or other apps, and 
 * it gather all this data through an auto discovery system. 
 *
 **************************************************************/

const eventEmitter = require('../_core_app_connectivities/emitter');
const rabbitmq_ops = require('../_core_app_connectivities/rabbitmq');
const crypto = require('crypto');


/*
*
*   Configurations - Set the following configurations in-order to make this service work.
*   Moreover this service is dependent on the event_router.service.js, so make sure that is setup already.
*
*   app_id - The app_id (As assigned by OneID) of the service that is publishing the event.
*   environment - The environment of the service that is publishing the event. (production, stage, dev)
*   api_version - The version of the API that is publishing the event.
*   envelope_version - The version of the envelope that is publishing the event.
*   event_priority - The priority of the event that is publishing the event.
*   event_ttl - The TTL of the event that is publishing the event.
*   
*   AUTO-DISCOVERY SETTINGS:
*   auto_discovery_enabled - Enable/disable auto-discovery system (true/false)
*   discovery_sampling_rates - Sampling rates per environment for auto-discovery
*   discovery_queue - RabbitMQ queue name for auto-discovery events
*
*
*******************************************************************************/
const events_hub_config = 
{
    // IMPORTANT: Update with your actual OneID assigned app ID
    app_id: 123, // TODO: Replace with actual OneID app ID from your OneID console
    environment: process.env.NODE_ENV || 'development',
    api_version: 'v2.1.0',
    envelope_version: 'v1.0.0',
    event_priority: 'medium',
    event_ttl: 3600,
    
    // Auto-Discovery Configuration
    //Automatically sync the events data with Events Hub for realtime availability of any new events
    //being added by devs across the platforms.
    auto_discovery_enabled: true,
    discovery_sampling_rates: {
        development: 1.0,    // 100% sampling in development
        staging: 0.1,        // 10% sampling in staging  
        production: 0.01     // 1% sampling in production
    },
    discovery_queue: 'VT_EVENTS_HUB_AUTO_DISCOVERY'


    //For category configuration, read the function determine_event_category.
}



class events_hub_service {
    constructor() {
        console.log(`FILE: events_hub.service.js | constructor | Initializing Event Publisher for app_id: ${events_hub_config.app_id}`);
                
        // Auto-discovery schema cache for performance
        this.schema_cache = new Map(); // event_name -> schema_hash
        this.rabbitmq_ready = false;
        
        // Listen for RabbitMQ connection
        if (events_hub_config.auto_discovery_enabled) {
            eventEmitter.on('rabbitMQConnected', () => {
                this.rabbitmq_ready = true;
                console.log(`FILE: events_hub.service.js | constructor | RabbitMQ connected - Auto-discovery ready`);
            });
        }
        
        console.log(`FILE: events_hub.service.js | constructor | Event Publisher initialized successfully (Auto-discovery: ${events_hub_config.auto_discovery_enabled})`);
    }

    /**
     * Publish an event with standardized envelope format
     * Integrates with existing Event Router system
     * 
     * @param {string} event_name - Event name in DOMAIN.ENTITY.ACTION format
     * @param {Object} meta_data - Metadata and configuration options
     * @param {Object} data - Event-specific payload data
     * @returns {string} - Event ID for tracking
     */
    async publish(event_name, meta_data = {}, data) {
        try {
            console.log(`FILE: events_hub.service.js | publish | Publishing event: ${event_name}`);

            // Create standardized event envelope
            const event_envelope = this.create_event_envelope(event_name, data, meta_data);

            // Emit through existing Event Router system
            eventEmitter.emit('event_router', event_name, event_envelope);

            // Auto-discovery processing (async, non-blocking)
            if (events_hub_config.auto_discovery_enabled) {
                setImmediate(() => {
                    this.process_auto_discovery(event_envelope).catch(error => {
                        console.error(`FILE: events_hub.service.js | publish | Auto-discovery error:`, error);
                    });
                });
            }

            console.log(`FILE: events_hub.service.js | publish | Event published successfully: ${event_name} [${event_envelope.event_id}]`);
            
            return event_envelope.event_id;

        } catch (error) {
            console.error(`FILE: events_hub.service.js | publish | Error publishing event: ${event_name}`, error);
            // Don't throw - core functionality must continue
            return null;
        }
    }

    /**
     * Create standardized event envelope
     * 
     * @param {string} event_name - Event name
     * @param {Object} data - Event data
     * @param {Object} meta_data - Additional metadata
     * @returns {Object} - Standardized event envelope
     */
    create_event_envelope(event_name, data, meta_data = {}) {
        const now = new Date().toISOString();
        const event_id = this.generate_event_id();

        return {
            // Core Event Identity
            event_id: event_id,
            event_name: event_name,
            event_app_id: events_hub_config.app_id,
            event_version: meta_data.event_version || events_hub_config.envelope_version,
            event_category: this.determine_event_category(event_name, meta_data.category),
            
            //Timing (As per ISO timestamp format)
            event_time: now,
            
            // Correlation & Tracing
            event_correlation_id: meta_data.correlation_id || event_id,
            event_trace_id: meta_data.trace_id || event_id,
            
            // Processing Metadata
            event_priority: meta_data.priority || 'medium',
            event_ttl: meta_data.ttl || 3600, // 1 hour default
            
            // Context Metadata
            event_metadata: 
            {
                //The OneID of the user which generated the event.
                oneid: meta_data.user_id || meta_data.oneid,

                //The OneID/Billing ID of the Organization incase of corporate app.
                billing_id: meta_data.billing_id || meta_data.oneid,
                
                //The OneID assigned org_id which relates to the event.
                org_id: meta_data.org_id || 0,

                //The IP address of the machine/server which generated the event.
                machine_ip: meta_data.machine_ip || 0,

                environment: events_hub_config.environment,
                client_info: meta_data.client_info || 
                {
                    //The IP address of the client which generated the event.
                    ip: meta_data.ip_address,

                    //The user agent of the client which generated the event.
                    user_agent: meta_data.user_agent,

                    //This could be session/JWT/Device ID/etc for client identification.
                    session_id: meta_data.session_id,
                }
            },
            
            // Event Data
            payload: data,
        };
    }

    /**
     * Determine event category based on event name and options
     * 
     * @param {string} event_name - Event name
     * @param {string} override_category - Optional category override
     * @returns {string} - Event category
     */
    determine_event_category(event_name, override_category) {
        if (override_category) {
            return override_category;
        }

        // Auto-categorize based on event name patterns
        const category_patterns = {
            general: [
                'USER.', 'BILLING.', 'ORDER.', 'PAYMENT.', 'SUBSCRIPTION.',
                'INVITATION.', 'ENROLLMENT.', 'SERVICE.'
            ],
            system: [
                'SYSTEM.', 'SERVICE.', 'HEALTH.', 'CACHE.', 'DATABASE.',
                'BACKUP.', 'MAINTENANCE.'
            ],
            integration: [
                'WEBHOOK.', 'API.', 'EXTERNAL.', 'SYNC.', 'IMPORT.', 'EXPORT.'
            ],
            audit: [
                'AUTH.', 'LOGIN.', 'PERMISSION.', 'SECURITY.', 'COMPLIANCE.',
                'ACCESS.'
            ]
        };

        for (const [category, patterns] of Object.entries(category_patterns)) {
            if (patterns.some(pattern => event_name.startsWith(pattern))) {
                return category;
            }
        }

        return 'general'; // Default category
    }

    /**
     * Generate unique event ID
     * 
     * @returns {string} - Unique event ID
     */
    generate_event_id() {
        const timestamp = Date.now();
        const random_part = crypto.randomBytes(8).toString('hex');
        return `evt_${timestamp}_${random_part}`;
    }

    /**
     * Process event for auto-discovery system
     * Handles schema hashing and sampling for MIS integration
     * 
     * @param {Object} event_envelope - Complete event envelope
     */
    async process_auto_discovery(event_envelope) {
        try {
            if (!this.rabbitmq_ready) {
                console.log(`FILE: events_hub.service.js | process_auto_discovery | RabbitMQ not ready, skipping auto-discovery`);
                return;
            }

            const event_name = event_envelope.event_name;
            const current_environment = events_hub_config.environment;
            
            // Get sampling rate for current environment
            const sampling_rate = events_hub_config.discovery_sampling_rates[current_environment] || 0.01;

            // Generate schema hash for this event structure
            const schema_hash = this.generate_schema_hash(event_envelope);

            // Check if this is a new event type or schema change
            const cached_hash = this.schema_cache.get(event_name);
            const is_new_event = !cached_hash;
            const is_schema_change = cached_hash && cached_hash !== schema_hash;

            // Decision logic: Always capture new events and schema changes, sample others
            let should_capture = is_new_event || is_schema_change;
            
            if (!should_capture && sampling_rate > 0) {
                // Apply sampling for existing events
                should_capture = Math.random() < sampling_rate;
            }

            if (should_capture) {
                console.log(`FILE: events_hub.service.js | process_auto_discovery | Capturing event for discovery: ${event_name} (${is_new_event ? 'NEW' : is_schema_change ? 'SCHEMA_CHANGE' : 'SAMPLE'})`);

                // Update schema cache
                this.schema_cache.set(event_name, schema_hash);

                // Prepare discovery message
                const discovery_message = {
                    app_id: events_hub_config.app_id,
                    event_name: event_name,
                    event_category: event_envelope.event_category,
                    schema_hash: schema_hash,
                    environment: current_environment,
                    capture_reason: is_new_event ? 'new_event' : is_schema_change ? 'schema_change' : 'sampling',
                    captured_at: new Date().toISOString(),
                    sample_envelope: event_envelope
                };

                // Send to RabbitMQ for processing
                await rabbitmq_ops.sendToRabbitMQ(
                    events_hub_config.discovery_queue,
                    discovery_message
                );

                console.log(`FILE: events_hub.service.js | process_auto_discovery | Discovery message sent for: ${event_name}`);
            }

        } catch (error) {
            console.error(`FILE: events_hub.service.js | process_auto_discovery | Error in auto-discovery:`, error);
            // Don't throw - auto-discovery failures should not affect core functionality
        }
    }

    /**
     * Generate schema hash for event structure
     * Used to detect schema changes over time
     * 
     * @param {Object} event_envelope - Event envelope to hash
     * @returns {string} - SHA256 hash of event structure
     */
    generate_schema_hash(event_envelope) {
        try {
            // Extract structure (keys and types) without values for hashing
            const structure = this.extract_event_structure(event_envelope);
            const structure_string = JSON.stringify(structure, Object.keys(structure).sort());
            
            return crypto.createHash('sha256').update(structure_string).digest('hex');
        } catch (error) {
            console.error(`FILE: events_hub.service.js | generate_schema_hash | Error generating schema hash:`, error);
            return 'hash_error_' + Date.now();
        }
    }

    /**
     * Extract event structure for schema comparison
     * Creates a simplified structure representation
     * 
     * @param {Object} obj - Object to analyze
     * @returns {Object} - Simplified structure representation
     */
    extract_event_structure(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        
        const type = typeof obj;
        
        if (type === 'object') {
            if (Array.isArray(obj)) {
                return {
                    type: 'array',
                    length: obj.length,
                    element_type: obj.length > 0 ? this.extract_event_structure(obj[0]) : 'empty'
                };
            } else {
                const structure = { type: 'object', fields: {} };
                for (const key in obj) {
                    structure.fields[key] = this.extract_event_structure(obj[key]);
                }
                return structure;
            }
        }
        
        return { type: type };
    }

    /**
     * Publish multiple events in batch
     * 
     * @param {Array} events - Array of event objects {event_name, meta_data, data}
     * @returns {Array} - Array of event IDs
     */
    async publish_batch(events) {
        console.log(`FILE: events_hub.service.js | publish_batch | Publishing ${events.length} events in batch`);
        
        const event_ids = [];
        
        for (const event of events) {
            const event_id = await this.publish(event.event_name, event.meta_data || {}, event.data);
            if (event_id) {
                event_ids.push(event_id);
            }
        }
        
        console.log(`FILE: events_hub.service.js | publish_batch | Batch published: ${event_ids.length}/${events.length} events successful`);
        
        return event_ids;
    }

    /**
     * Create a scoped publisher for specific context
     * Useful for request-scoped or user-scoped events
     * 
     * @param {Object} context - Default context for all events
     * @returns {Object} - Scoped publisher methods
     */
    create_scoped_publisher(context = {}) 
    {
        console.log(`FILE: events_hub.service.js | create_scoped_publisher | Creating scoped publisher with context:`, context);
        
        const scoped_options = {
            user_id: context.user_id || context.oneid,
            org_id: context.org_id,
            app_id: context.app_id,
            correlation_id: context.correlation_id,
            trace_id: context.trace_id,
            client_info: context.client_info
        };

        return {
            publish: (event_name, additional_meta_data = {}, data) => {
                const merged_meta_data = { ...scoped_options, ...additional_meta_data };
                return this.publish(event_name, merged_meta_data, data);
            },
            
            publish_batch: (events) => {
                const scoped_events = events.map(event => ({
                    ...event,
                    meta_data: { ...scoped_options, ...(event.meta_data || {}) }
                }));
                return this.publish_batch(scoped_events);
            }
        };
    }



    /**
     * Get event statistics (for monitoring)
     * 
     * @returns {Object} - Event publishing statistics
     */
    get_statistics() {
        return {
            service_name: this.service_name,
            environment: this.environment,
            envelope_version: this.envelope_version,
            uptime: process.uptime(),
            events_published: this._events_published || 0
        };
    }
}

module.exports = new events_hub_service();
