const user_data_repository = require("../data_repositories/user.data_repository");
const { requiresPasswordLogin } = require("../global_config/auth.config");
const email_service = require("./email.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const moment = require("moment");

const JWT_SECRET = "A9F7K2M8ZQ4R6X5B";
const JWT_EXPIRES_IN = "7d";

class user_service {
  constructor() {
    console.log("FILE: user.service.js | constructor | Service initialized");
  }

  async register_user(user_data) {
    try {
      console.log(`FILE: user.service.js | register_user | Registering user: ${user_data.name || user_data.phone || 'no phone'}`);

      // Validate required fields
      if (!user_data.name || !user_data.phone || !user_data.address) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00101",
          ERROR_DESCRIPTION: "Name, phone, and address are required",
        };
      }

      // Validate phone format (Pakistani format: 11 digits starting with 03)
      const phone_regex = /^03\d{9}$/;
      const normalized_phone = user_data.phone.trim().replace(/[\s-]/g, '');
      if (!phone_regex.test(normalized_phone)) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00103",
          ERROR_DESCRIPTION: "Phone number must be in Pakistani format: 11 digits starting with 03 (e.g., 030xxxxxxxxxxx)",
        };
      }

      // Check if phone number already exists
      const existing_user_by_phone = await user_data_repository.get_user_by_phone(normalized_phone);
      if (existing_user_by_phone) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00104",
          ERROR_DESCRIPTION: "User with this phone number already exists",
        };
      }

      // If email is provided, check if user already exists with that email
      if (user_data.email) {
        const existing_user_by_email = await user_data_repository.get_user_by_email(user_data.email);
        if (existing_user_by_email) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "USER_END_VIOLATION",
            ERROR_CODE: "VTAPP-00102",
            ERROR_DESCRIPTION: "User with this email already exists",
          };
        }
      }

      // Create user (password is optional, email is optional)
      const new_user = await user_data_repository.create_user({
        name: user_data.name,
        email: user_data.email || null,
        password: user_data.password || null, // Password is optional
        phone: normalized_phone, // Use normalized phone
        address: user_data.address,
        role: user_data.role || "user",
      });

      // Generate token (email can be null, use empty string or phone as fallback)
      const token = this.generate_token(new_user._id, new_user.email || new_user.phone || '', new_user.role);

      // Remove password from response
      const user_response = {
        _id: new_user._id,
        name: new_user.name,
        email: new_user.email,
        phone: new_user.phone,
        address: new_user.address,
        role: new_user.role,
        created_at: new_user.created_at,
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          user: user_response,
          token: token,
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | register_user | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00102",
        ERROR_DESCRIPTION: error.message || "Failed to register user",
      };
    }
  }

  async login_user(phone, password = null) {
    try {
      console.log(`FILE: user.service.js | login_user | Logging in user: ${phone}`);

      // Validate phone is provided
      if (!phone || !phone.trim()) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00201",
          ERROR_DESCRIPTION: "Phone number is required",
        };
      }

      // Validate phone format (Pakistani format: 11 digits starting with 03)
      const phone_regex = /^03\d{9}$/;
      const normalized_phone = phone.trim().replace(/[\s-]/g, '');
      if (!phone_regex.test(normalized_phone)) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00202",
          ERROR_DESCRIPTION: "Phone number must be in Pakistani format: 11 digits starting with 03 (e.g., 030xxxxxxxxxxx)",
        };
      }

      // Get user by phone
      const user = await user_data_repository.get_user_by_phone(normalized_phone);
      if (!user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00203",
          ERROR_DESCRIPTION: "User with this phone number not found",
        };
      }

      // Check if user is active
      if (user.is_active === 0) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00204",
          ERROR_DESCRIPTION: "Your account has been deactivated",
        };
      }

      // For protected accounts, verify password
      if (requiresPasswordLogin(normalized_phone)) {
        if (!password || !password.trim()) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-00207",
            ERROR_DESCRIPTION: "Password is required for this account",
          };
        }

        // Check if user has a password in database
        if (!user.password) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "AUTHENTICATION_FAILED",
            ERROR_CODE: "VTAPP-00209",
            ERROR_DESCRIPTION: "Password not set for this account. Please contact administrator.",
          };
        }

        // Verify password using bcrypt - compare provided password with stored hash
        const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
        
        if (!isPasswordValid) {
          console.log(`FILE: user.service.js | login_user | Password verification failed for phone: ${normalized_phone}`);
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "AUTHENTICATION_FAILED",
            ERROR_CODE: "VTAPP-00208",
            ERROR_DESCRIPTION: "Invalid password. Please try again.",
          };
        }
        
        console.log(`FILE: user.service.js | login_user | Password verified successfully for phone: ${normalized_phone}`);
      }

      // Generate token
      const token = this.generate_token(user._id, user.phone || user.email || '', user.role);

      // Remove password from response
      const user_response = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        created_at: user.created_at,
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          user: user_response,
          token: token,
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | login_user | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00204",
        ERROR_DESCRIPTION: error.message || "Failed to login user",
      };
    }
  }

  generate_token(user_id, email_or_identifier, role) {
    try {
      const payload = {
        user_id: user_id.toString(),
        email: email_or_identifier || '', // Can be email or phone if email not provided
        role: role,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      return token;
    } catch (error) {
      console.error(`FILE: user.service.js | generate_token | Error:`, error);
      throw error;
    }
  }

  verify_token(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        STATUS: "SUCCESSFUL",
        DB_DATA: decoded,
      };
    } catch (error) {
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "USER_END_VIOLATION",
        ERROR_CODE: "VTAPP-00301",
        ERROR_DESCRIPTION: "Invalid or expired token",
      };
    }
  }

  async get_user_profile(user_id) {
    try {
      console.log(`FILE: user.service.js | get_user_profile | Fetching profile for user: ${user_id}`);

      const user = await user_data_repository.get_user_by_id(user_id);
      if (!user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00401",
          ERROR_DESCRIPTION: "User not found",
        };
      }

      // Remove password from response
      const user_response = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          user: user_response,
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | get_user_profile | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00402",
        ERROR_DESCRIPTION: error.message || "Failed to fetch user profile",
      };
    }
  }

  async update_user_profile(user_id, update_data) {
    try {
      console.log(`FILE: user.service.js | update_user_profile | Updating profile for user: ${user_id}`);

      // Check if user exists
      const existing_user = await user_data_repository.get_user_by_id(user_id);
      if (!existing_user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00501",
          ERROR_DESCRIPTION: "User not found",
        };
      }

      // If email is being updated, check if new email already exists
      if (update_data.email && update_data.email !== existing_user.email) {
        const email_exists = await user_data_repository.get_user_by_email(update_data.email);
        if (email_exists) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "USER_END_VIOLATION",
            ERROR_CODE: "VTAPP-00502",
            ERROR_DESCRIPTION: "Email already in use",
          };
        }
      }

      // Prepare update data (only allow name, email, phone, address)
      const allowed_fields = ["name", "email", "phone", "address"];
      const filtered_update = {};
      for (const field of allowed_fields) {
        if (update_data[field] !== undefined) {
          filtered_update[field] = update_data[field];
        }
      }

      // Update user
      const updated_user = await user_data_repository.update_user(user_id, filtered_update);
      if (!updated_user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "TECHNICAL_ISSUE",
          ERROR_CODE: "VTAPP-00503",
          ERROR_DESCRIPTION: "Failed to update user profile",
        };
      }

      // Remove password from response
      const user_response = {
        _id: updated_user._id,
        name: updated_user.name,
        email: updated_user.email,
        phone: updated_user.phone,
        address: updated_user.address,
        role: updated_user.role,
        created_at: updated_user.created_at,
        updated_at: updated_user.updated_at,
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          user: user_response,
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | update_user_profile | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00504",
        ERROR_DESCRIPTION: error.message || "Failed to update user profile",
      };
    }
  }

  async get_all_users_list() {
    try {
      console.log(`FILE: user.service.js | get_all_users_list | Fetching all users list`);
      
      const users = await user_data_repository.get_all_users_list();
      
      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          users: users,
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | get_all_users_list | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00601",
        ERROR_DESCRIPTION: error.message || "Failed to fetch users list",
        DB_DATA: null,
      };
    }
  }

  async forgot_password(email) {
    try {
      console.log(`FILE: user.service.js | forgot_password | Processing password reset for: ${email}`);

      // Check if user exists
      const user = await user_data_repository.get_user_by_email(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          STATUS: "SUCCESSFUL",
          ERROR_CODE: "",
          ERROR_FILTER: "",
          ERROR_DESCRIPTION: "",
          DB_DATA: {
            message: "New updated password sent on your email, please check email and log in with new password",
          },
        };
      }

      // Generate random password (8 digits)
      const randomPassword = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

      // Hash the password manually (since findByIdAndUpdate bypasses pre-save hook)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      // Update user password with hashed password
      await user_data_repository.update_user(user._id, {
        password: hashedPassword,
      });

      // Send email with new password
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h2 style="margin: 0 0 10px;">Reset your password</h2>
          <p>We received a request to reset your password for <b>BuildMart</b>.</p>
          <p style="margin: 16px 0;">
            Here is your new password: <b>${randomPassword}</b>
          </p>
          <p style="margin-top: 20px; color: #666;">
            Please login with this password and change it to a secure password of your choice.
          </p>
        </div>
      `;

      await email_service.sendEmail({
        to: email,
        subject: 'BuildMart Business - Password Reset',
        html: emailHtml,
      });

      console.log(`FILE: user.service.js | forgot_password | Password reset email sent to: ${email}`);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          message: "New updated password sent on your email, please check email and log in with new password",
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | forgot_password | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00701",
        ERROR_DESCRIPTION: error.message || "Failed to process password reset",
      };
    }
  }

  async add_to_favorites(user_id, product_id) {
    try {
      console.log(`FILE: user.service.js | add_to_favorites | Adding product ${product_id} to favorites for user ${user_id}`);

      const user = await user_data_repository.get_user_by_id(user_id);
      if (!user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00404",
          ERROR_DESCRIPTION: "User not found",
        };
      }

      // Check if product is already in favorites
      const productObjectId = new mongoose.Types.ObjectId(product_id);
      if (user.favorites && user.favorites.some(fav => fav.toString() === productObjectId.toString())) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00405",
          ERROR_DESCRIPTION: "Product is already in favorites",
        };
      }

      // Verify product exists
      const product_model = require("../models/product.model");
      const product = await product_model.findById(product_id);
      if (!product) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00517",
          ERROR_DESCRIPTION: "Product not found",
        };
      }

      // Add product to favorites using $addToSet operator
      const user_model = require("../models/user.model");
      const updated_user = await user_model.findByIdAndUpdate(
        user_id,
        { 
          $addToSet: { favorites: productObjectId },
          $set: { updated_at: moment().unix() }
        },
        { new: true, runValidators: true }
      );

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated_user,
      };
    } catch (error) {
      console.error(`FILE: user.service.js | add_to_favorites | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00406",
        ERROR_DESCRIPTION: error.message || "Failed to add product to favorites",
      };
    }
  }

  async remove_from_favorites(user_id, product_id) {
    try {
      console.log(`FILE: user.service.js | remove_from_favorites | Removing product ${product_id} from favorites for user ${user_id}`);

      const user = await user_data_repository.get_user_by_id(user_id);
      if (!user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00407",
          ERROR_DESCRIPTION: "User not found",
        };
      }

      // Remove product from favorites using $pull operator
      const productObjectId = new mongoose.Types.ObjectId(product_id);
      const user_model = require("../models/user.model");
      const updated_user = await user_model.findByIdAndUpdate(
        user_id,
        { 
          $pull: { favorites: productObjectId },
          $set: { updated_at: moment().unix() }
        },
        { new: true, runValidators: true }
      );

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated_user,
      };
    } catch (error) {
      console.error(`FILE: user.service.js | remove_from_favorites | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00408",
        ERROR_DESCRIPTION: error.message || "Failed to remove product from favorites",
      };
    }
  }

  async get_favorites(user_id) {
    try {
      console.log(`FILE: user.service.js | get_favorites | Fetching favorites for user ${user_id}`);

      const user = await user_data_repository.get_user_by_id(user_id);
      if (!user) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00409",
          ERROR_DESCRIPTION: "User not found",
        };
      }

      // Populate favorites with product details
      const user_model = require("../models/user.model");
      const user_with_favorites = await user_model.findById(user_id).populate('favorites');

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          favorites: user_with_favorites.favorites || [],
        },
      };
    } catch (error) {
      console.error(`FILE: user.service.js | get_favorites | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00410",
        ERROR_DESCRIPTION: error.message || "Failed to fetch favorites",
      };
    }
  }
}

module.exports = new user_service();

