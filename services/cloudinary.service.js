const { cloudinary } = require("../global_config/cloudinary_config");

class cloudinary_service {
  constructor() {
    console.log("FILE: cloudinary.service.js | constructor | Service initialized");
  }

  /**
   * Upload image to Cloudinary
   * @param {Buffer|String} file - Image file buffer or base64 string
   * @param {String} folder - Folder name in Cloudinary (e.g., 'products', 'categories')
   * @param {String} public_id - Optional public ID for the image
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async upload_image(file, folder = "grocery_store", public_id = null) {
    try {
      console.log(`FILE: cloudinary.service.js | upload_image | Uploading image to folder: ${folder}`);

      const upload_options = {
        folder: folder,
        resource_type: "image",
        overwrite: true,
        transformation: [
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      };

      // If public_id is provided, add it to options
      if (public_id) {
        upload_options.public_id = public_id;
      }

      let upload_result;

      // Check if file is a buffer (from multer) or base64 string
      if (Buffer.isBuffer(file)) {
        // Upload from buffer using Promise wrapper
        upload_result = await new Promise((resolve, reject) => {
          const upload_stream = cloudinary.uploader.upload_stream(
            upload_options,
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          upload_stream.end(file);
        });
      } else if (typeof file === "string") {
        // Upload from base64 string or URL
        upload_result = await cloudinary.uploader.upload(file, upload_options);
      } else {
        throw new Error("Invalid file format. Expected Buffer or String.");
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          url: upload_result.secure_url,
          public_id: upload_result.public_id,
          width: upload_result.width,
          height: upload_result.height,
          format: upload_result.format,
          bytes: upload_result.bytes,
        },
      };
    } catch (error) {
      console.error(`FILE: cloudinary.service.js | upload_image | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01601",
        ERROR_DESCRIPTION: error.message || "Failed to upload image to Cloudinary",
      };
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {String} public_id - Public ID of the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async delete_image(public_id) {
    try {
      console.log(`FILE: cloudinary.service.js | delete_image | Deleting image: ${public_id}`);

      const result = await cloudinary.uploader.destroy(public_id);

      if (result.result === "ok") {
        return {
          STATUS: "SUCCESSFUL",
          ERROR_CODE: "",
          ERROR_FILTER: "",
          ERROR_DESCRIPTION: "",
          DB_DATA: {
            deleted: true,
            public_id: public_id,
          },
        };
      } else {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01602",
          ERROR_DESCRIPTION: "Image not found in Cloudinary",
        };
      }
    } catch (error) {
      console.error(`FILE: cloudinary.service.js | delete_image | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01603",
        ERROR_DESCRIPTION: error.message || "Failed to delete image from Cloudinary",
      };
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   * @param {String} url - Cloudinary image URL
   * @returns {String|null} Public ID or null if invalid URL
   */
  extract_public_id(url) {
    try {
      if (!url || typeof url !== "string") {
        return null;
      }

      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (match && match[1]) {
        return match[1];
      }

      return null;
    } catch (error) {
      console.error(`FILE: cloudinary.service.js | extract_public_id | Error:`, error);
      return null;
    }
  }
}

module.exports = new cloudinary_service();

