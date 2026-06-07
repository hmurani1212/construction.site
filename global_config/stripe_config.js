// Stripe Configuration
// Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in your .env file
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || "";
const STRIPE_WEBHOOK_SECRET = ""; // Add webhook secret if using webhooks

// Currency conversion rate (PKR to USD)
// Update this rate as needed - current approximate rate: 1 USD = 280 PKR
const USD_TO_PKR_RATE = 280;

// JazzCash Configuration
// Test/Dummy credentials for development - Replace with actual credentials for production
const JAZZCASH_MERCHANT_ID = "123456"; // 6-digit merchant ID from JazzCash (dummy for testing)
const JAZZCASH_PASSWORD = "test123456"; // Password provided by JazzCash (dummy for testing)
const JAZZCASH_INTEGRITY_SALT = "test_salt_key_12345"; // Integrity Salt from JazzCash (dummy for testing)
const JAZZCASH_RETURN_URL = process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL}/api/v1/jazzcash/callback`
  : "http://localhost:6160/api/v1/jazzcash/callback"; // Backend callback URL
const JAZZCASH_PAYMENT_URL = process.env.NODE_ENV === "production"
  ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
  : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"; // Sandbox URL for testing

// Easy Paisa Configuration
// TODO: Replace these with your actual Easy Paisa credentials from merchant account
// Get these from: https://easypaystg.easypaisa.com.pk/ (for testing) or https://easypay.easypaisa.com.pk/ (for production)
const EASYPAISA_STORE_ID = ""; // Store ID (Merchant ID) from Easy Paisa (e.g., "12345")
const EASYPAISA_HASH_KEY = ""; // Hash Key (Secret Key) from Easy Paisa merchant dashboard
const EASYPAISA_RETURN_URL = process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL}/api/v1/easypaisa/callback`
  : "http://localhost:6160/api/v1/easypaisa/callback"; // Backend callback URL
const EASYPAISA_PAYMENT_URL = process.env.NODE_ENV === "production"
  ? "https://easypay.easypaisa.com.pk/easypay/Index.jsf"
  : "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf"; // Sandbox URL for testing

module.exports = {
  STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET,
  USD_TO_PKR_RATE,
  // JazzCash config
  JAZZCASH_MERCHANT_ID,
  JAZZCASH_PASSWORD,
  JAZZCASH_INTEGRITY_SALT,
  JAZZCASH_RETURN_URL,
  JAZZCASH_PAYMENT_URL,
  // Easy Paisa config
  EASYPAISA_STORE_ID,
  EASYPAISA_HASH_KEY,
  EASYPAISA_RETURN_URL,
  EASYPAISA_PAYMENT_URL,
};

