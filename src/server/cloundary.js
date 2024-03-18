import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload the file to Cloudinary
const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // Delete the local file after successful upload
        fs.unlinkSync(localFilePath);

        return uploadResponse;
    } catch (error) {
        // Handle errors and ensure local file cleanup
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        throw error;
    }
};

// Delete the file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        // Delete the file from Cloudinary
        const deletionResponse = await cloudinary.uploader.destroy(publicId);

        return deletionResponse;
    } catch (error) {
        throw error;
    }
};

export { uploadCloudinary, deleteFromCloudinary };
