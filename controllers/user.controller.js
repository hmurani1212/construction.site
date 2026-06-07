const user_service = require("../services/user.service");
const { requiresPasswordLogin } = require("../global_config/auth.config");

class user_controller {
  async register(req, res) {
    try {
      console.log(`FILE: user.controller.js | register | Request received`);

      const { name, email, phone, address } = req.body;

      // Validation - name, phone, and address are required, email is optional
      if (!name || !phone || !address) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00103",
          ERROR_DESCRIPTION: "Name, phone, and address are required",
        });
      }

      // Validate phone format (Pakistani format: 11 digits starting with 03)
      const phone_regex = /^03\d{9}$/;
      const normalized_phone = phone.trim().replace(/[\s-]/g, '');
      if (!phone_regex.test(normalized_phone)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00105",
          ERROR_DESCRIPTION: "Phone number must be in Pakistani format: 11 digits starting with 03 (e.g., 030xxxxxxxxxxx)",
        });
      }

      // Validate email format if provided
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00104",
          ERROR_DESCRIPTION: "Invalid email format",
        });
      }

      const result = await user_service.register_user({
        name,
        email: email || null, // Email is optional
        phone: normalized_phone, // Use normalized phone
        address,
      });

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | register | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00105",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async login(req, res) {
    try {
      console.log(`FILE: user.controller.js | login | Request received`);

      const { phone, password } = req.body;

      // Validation - only phone is required
      if (!phone || !phone.trim()) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00205",
          ERROR_DESCRIPTION: "Phone number is required",
        });
      }

      // Validate phone format (Pakistani format: 11 digits starting with 03)
      const phone_regex = /^03\d{9}$/;
      const normalized_phone = phone.trim().replace(/[\s-]/g, '');
      if (!phone_regex.test(normalized_phone)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00206",
          ERROR_DESCRIPTION: "Phone number must be in Pakistani format: 11 digits starting with 03 (e.g., 030xxxxxxxxxxx)",
        });
      }

      // For protected accounts, password is required
      if (requiresPasswordLogin(normalized_phone)) {
        if (!password || !password.trim()) {
          return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-00207",
            ERROR_DESCRIPTION: "Password is required for this account",
          });
        }
      }

      const result = await user_service.login_user(normalized_phone, password);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | login | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00206",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_profile(req, res) {
    try {
      console.log(`FILE: user.controller.js | get_profile | Request received`);

      const user = req.user; // From auth middleware
      const result = await user_service.get_user_profile(user.user_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | get_profile | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00403",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_profile(req, res) {
    try {
      console.log(`FILE: user.controller.js | update_profile | Request received`);

      const user = req.user; // From auth middleware
      const { name, email, phone, address } = req.body;

      // Validation
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00505",
          ERROR_DESCRIPTION: "Invalid email format",
        });
      }

      const update_data = {};
      if (name !== undefined) update_data.name = name;
      if (email !== undefined) update_data.email = email;
      if (phone !== undefined) update_data.phone = phone;
      if (address !== undefined) update_data.address = address;

      if (Object.keys(update_data).length === 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00506",
          ERROR_DESCRIPTION: "No fields to update",
        });
      }

      const result = await user_service.update_user_profile(user.user_id, update_data);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | update_profile | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00507",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_users_list(req, res) {
    try {
      console.log(`FILE: user.controller.js | get_all_users_list | Request received`);

      const result = await user_service.get_all_users_list();

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | get_all_users_list | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00602",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async add_to_favorites(req, res) {
    try {
      console.log(`FILE: user.controller.js | add_to_favorites | Request received`);

      const user = req.user; // From auth middleware
      const user_id = user?.user_id || user?._id || user?.id;
      const { product_id } = req.body;

      if (!user_id) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHENTICATION_REQUIRED",
          ERROR_CODE: "VTAPP-00411",
          ERROR_DESCRIPTION: "Authentication required",
        });
      }

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00412",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      const result = await user_service.add_to_favorites(user_id, product_id);

      if (result.STATUS === "ERROR") {
        const status_code = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(status_code).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | add_to_favorites | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00413",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async remove_from_favorites(req, res) {
    try {
      console.log(`FILE: user.controller.js | remove_from_favorites | Request received`);

      const user = req.user; // From auth middleware
      const user_id = user?.user_id || user?._id || user?.id;
      const { product_id } = req.params;

      if (!user_id) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHENTICATION_REQUIRED",
          ERROR_CODE: "VTAPP-00414",
          ERROR_DESCRIPTION: "Authentication required",
        });
      }

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00415",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      const result = await user_service.remove_from_favorites(user_id, product_id);

      if (result.STATUS === "ERROR") {
        const status_code = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(status_code).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | remove_from_favorites | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00416",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_favorites(req, res) {
    try {
      console.log(`FILE: user.controller.js | get_favorites | Request received`);

      const user = req.user; // From auth middleware
      const user_id = user?.user_id || user?._id || user?.id;

      if (!user_id) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHENTICATION_REQUIRED",
          ERROR_CODE: "VTAPP-00417",
          ERROR_DESCRIPTION: "Authentication required",
        });
      }

      const result = await user_service.get_favorites(user_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | get_favorites | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00418",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async forgot_password(req, res) {
    try {
      console.log(`FILE: user.controller.js | forgot_password | Request received`);

      const { email } = req.body;

      // Validation
      if (!email || !email.trim()) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00702",
          ERROR_DESCRIPTION: "Email is required",
        });
      }

      // Basic email validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00703",
          ERROR_DESCRIPTION: "Invalid email format",
        });
      }

      const result = await user_service.forgot_password(email.trim().toLowerCase());

      if (result.STATUS === "ERROR") {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: user.controller.js | forgot_password | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00704",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new user_controller();

