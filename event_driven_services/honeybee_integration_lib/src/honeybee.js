/**
 * Honeybee Integration Library
 * A lightweight client for interacting with the Honeybee job scheduling service
 */

const axios = require('axios');

class HoneybeeClient {
  /**
   * Create a new Honeybee client
   * @param {Object} config - Configuration options
   * @param {string} config.baseUrl - Base URL of the Honeybee service (default: http://172.18.0.34:3005/honeybee/api)
   * @param {Object} config.headers - Default headers to include with each request
   */
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://172.18.0.34:3005/honeybee/api';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + '9e107d9d372bb6826bd81d3542a419d6',
      ...(config.headers || {})
    };
  }

  /**
   * Enqueue a job for immediate or delayed processing
   * @param {Object} jobData - Job configuration
   * @param {string} jobData.queueName - Name of the target queue
   * @param {string} jobData.jobName - Logical identifier for the job type
   * @param {Object} jobData.data - Arbitrary JSON payload passed to the worker
   * @param {Object} [jobData.options] - Job options
   * @param {number} [jobData.options.priority=5] - Priority (1 = highest, larger = lower)
   * @param {number} [jobData.options.attempts=3] - Number of retry attempts on failure
   * @param {Object} [jobData.options.backoff] - Backoff strategy: {type: exponential, delay: ms}
   * @param {number} [jobData.options.delay] - Delay in milliseconds before execution
   * @param {Object} [jobData.options.repeat] - Configuration for recurring jobs
   * @param {string} [jobData.jobId] - Custom identifier for idempotency
   * @param {Object} [jobData.metadata] - Arbitrary metadata for tracking or logging
   * @returns {Promise<Object>} - Job enqueue result
   */
  async enqueue(jobData) {
    try {
      const response = await axios.post(`${this.baseUrl}/enqueue`, {
        queue_name: jobData.queueName,
        job_name: jobData.jobName,
        data: jobData.data || {},
        options: jobData.options || {},
        job_id: jobData.jobId,
        metadata: jobData.metadata
      }, { headers: this.headers });
      
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Delete a job by ID
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - ID of the job to delete
   * @returns {Promise<Object>} - Delete operation result
   */
  async deleteJob(queueName, jobId) {
    try {
      console.log(this.headers);
      const response = await axios.post(`${this.baseUrl}/delete_job`, {
        queue_name: queueName,
        job_id: jobId
      }, { headers: this.headers });
      
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Update an existing job
   * @param {Object} updateData - Job update configuration
   * @param {string} updateData.queue_name - Name of the queue
   * @param {string} updateData.job_id - ID of the job to update
   * @param {Object} [updateData.data] - New job data (will be merged with existing)
   * @param {Object} [updateData.options] - New job options (will be merged with existing)
   * @returns {Promise<Object>} - Update operation result
   */
  async updateJob(updateData) {
    try {
      updateData.queue_name = updateData.queueName;
      updateData.job_id = updateData.jobId;
      const response = await axios.post(`${this.baseUrl}/update_job`, updateData, { 
        headers: this.headers 
      });
      
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Schedule a job to run at a specific time
   * Note: API doesn't support direct timestamp parameter, converts to delay
   * @param {Object} jobData - Job configuration (same as enqueue)
   * @param {string} timestamp - ISO timestamp for when the job should run
   * @returns {Promise<Object>} - Job schedule result
   */
  async scheduleAt(jobData, timestamp) {
    // Convert timestamp to delay in milliseconds
    const now = new Date();
    const targetTime = new Date(timestamp);
    const delayMs = Math.max(0, targetTime.getTime() - now.getTime());
    
    return this.scheduleIn(jobData, delayMs);
  }

  /**
   * Schedule a job to run after a delay
   * @param {Object} jobData - Job configuration (same as enqueue)
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise<Object>} - Job schedule result
   */
  async scheduleIn(jobData, delayMs) {
    jobData.options = jobData.options || {};
    jobData.options.delay = delayMs;
    return this.enqueue(jobData);
  }

  /**
   * Create a recurring job using cron syntax
   * Note: API doesn't support timezone parameter directly
   * @param {Object} jobData - Job configuration (same as enqueue)
   * @param {string} cronExpression - Cron expression (e.g., '0 8 * * *')
   * @param {Object} [options] - Additional options for recurring jobs
   * @param {number} [options.limit] - Maximum number of executions
   * @returns {Promise<Object>} - Recurring job setup result
   */
  async recurring(jobData, cronExpression, options = {}) {
    jobData.options = jobData.options || {};
    jobData.options.repeat = {
      cron: cronExpression,
      limit: options.limit
    };
    return this.enqueue(jobData);
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      throw new Error(`Honeybee API Error: ${status} - ${JSON.stringify(data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`Honeybee Connection Error: No response received`);
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Honeybee Client Error: ${error.message}`);
    }
  }
}

module.exports = HoneybeeClient; 