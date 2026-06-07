const cloudinary_service = require("../services/cloudinary.service");

class upload_controller {
  /**
   * Upload a single image
   * @route POST /api/v1/upload/image
   * @access Private (Admin)
   */
  async upload_image(req, res) {
    try {
      console.log(`FILE: upload.controller.js | upload_image | Request received`);

      if (!req.file) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01604",
          ERROR_DESCRIPTION: "No image file provided",
        });
      }

      const { folder } = req.body; // Optional folder name (default: construction_materials)
      const upload_folder = folder || "construction_materials";

      // Upload to Cloudinary
      const result = await cloudinary_service.upload_image(
        req.file.buffer,
        upload_folder
      );

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: upload.controller.js | upload_image | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01605",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  /**
   * Upload multiple images
   * @route POST /api/v1/upload/images
   * @access Private (Admin)
   */
  async upload_multiple_images(req, res) {
    try {
      console.log(`FILE: upload.controller.js | upload_multiple_images | Request received`);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01608",
          ERROR_DESCRIPTION: "No image files provided",
        });
      }

      const { folder } = req.body; // Optional folder name (default: construction_materials)
      const upload_folder = folder || "construction_materials";

      // Upload all images to Cloudinary
      const upload_promises = req.files.map((file) =>
        cloudinary_service.upload_image(file.buffer, upload_folder)
      );

      const results = await Promise.all(upload_promises);

      // Check if any upload failed
      const failed_uploads = results.filter((result) => result.STATUS === "ERROR");
      if (failed_uploads.length > 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "TECHNICAL_ISSUE",
          ERROR_CODE: "VTAPP-01609",
          ERROR_DESCRIPTION: `Failed to upload ${failed_uploads.length} image(s)`,
          DB_DATA: {
            successful: results.filter((r) => r.STATUS === "SUCCESSFUL"),
            failed: failed_uploads,
          },
        });
      }

      // Extract image URLs from successful uploads
      const image_urls = results
        .filter((result) => result.STATUS === "SUCCESSFUL")
        .map((result) => result.DB_DATA.secure_url);

      return res.status(200).json({
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          images: image_urls,
          count: image_urls.length,
        },
      });
    } catch (error) {
      console.error(`FILE: upload.controller.js | upload_multiple_images | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01610",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  /**
   * Delete an image from Cloudinary
   * @route DELETE /api/v1/upload/image/:public_id
   * @access Private (Admin)
   */
  async delete_image(req, res) {
    try {
      console.log(`FILE: upload.controller.js | delete_image | Request received`);

      const { public_id } = req.params;

      if (!public_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01606",
          ERROR_DESCRIPTION: "Public ID is required",
        });
      }

      const result = await cloudinary_service.delete_image(public_id);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: upload.controller.js | delete_image | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01607",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new upload_controller();

