// Import required modules and utilities
import { asyncHandler } from "../utiles/asynchandler.js";
import { ApiError } from "../utiles/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary, deleteFromCloudinary } from "../server/cloundary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";
import jwt from "jsonwebtoken";

// Function to generate access and refresh tokens for a user
const generateAccessAndRefereshToken = async (userId) => {
    try {
        // Find the user by ID
        const user = await User.findById(userId);
        // Generate access and refresh tokens for the user
        const acccessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // Update user's refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { acccessToken, refreshToken };
    } catch (error) {
        // Handle any errors
        throw new ApiError(500, "Something went wrong");
    }
};

// Handler to register a new user
const registerUser = asyncHandler(async (req, res) => {
    // Step 1: Get user details from the request body
    const { fullName, email, username, password } = req.body;

    // Step 2: Validate required fields
    if ([fullName, email, password, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Step 3: Check if user with the same email or username already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Step 4: Upload avatar and cover image if available
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Local path for Avatar file is required");
    }

    // Step 5: Upload avatar and cover image to Cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Error uploading Avatar file to Cloudinary");
    }

    // Step 6: Create a new user with the provided details
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username
    });

    // Step 7: Return the newly registered user
    const createUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createUser) {
        throw new ApiError(500, "Error while registering user");
    }

    return res.status(201).json(new ApiResponse(200, createUser, "User registered successfully"));
});

// Handler to log in a user
const loginUser = asyncHandler(async (req, res) => {
    // Step 1: Get login credentials from request body
    const { email, password, username } = req.body;

    // Step 2: Check if either username or email is provided
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Step 3: Find the user by username or email
    const user = await User.findOne({ $or: [{ username }, { email }] });

    // Step 4: Check if the provided password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    // Step 5: Generate access and refresh tokens for the user
    const { acccessToken, refreshToken } = await generateAccessAndRefereshToken(user._id);

    // Step 6: Get user details without sensitive information
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Step 7: Set cookies with access and refresh tokens
    const options = {
        httpOnly: true,
        secure: true
    };

    // Step 8: Respond with user details and tokens
    return res.status(200)
        .cookie("accessToken", acccessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, acccessToken, refreshToken }, "User logged in successfully"));
});

// Handler to log out a user
const logoutUser = asyncHandler(async (req, res) => {
    // Step 1: Find the user and remove the refresh token
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    // Step 2: Clear cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    // Step 3: Respond with success message
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Handler to refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        // Verify the incoming refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if (!user || incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Generate new access and refresh tokens
        const { acccessToken, newRefreshToken } = await generateAccessAndRefereshToken(user._id);

        // Set new cookies with the updated tokens
        const options = {
            httpOnly: true,
            secure: true
        };

        // Respond with new tokens
        return res.status(200)
            .cookie("accessToken", acccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { acccessToken, refreshToken: newRefreshToken }, "Access token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// Handler to change the current user's password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Find the user by ID
    const user = await User.findById(req.user?._id);

    // Check if the old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    // Update the password and save
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Respond with success message
    return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"));
});

// Handler to get the current user's details
const getCurrentUser = asyncHandler(async (req, res) => {
    // Return the current user's details
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Handler to update the current user's account details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username } = req.body;

    // Check if either full name or username is provided
    if (!fullName && !username) {
        throw new ApiError(400, "Full name or username is required to update account details");
    }

    // Update the user's details
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, username } },
        { new: true }
    ).select("-password");

    // Respond with updated user details
    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Handler to update the current user's avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Updated avatar file is missing");
    }

    // Upload new avatar to Cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error uploading avatar to Cloudinary");
    }

    // Update user's avatar URL
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    // Respond with updated user details
    return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

// Handler to delete the current user's avatar
const deleteUserAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("avatar");
    const oldAvatarPublicId = user.avatar && user.avatar.split('/').pop().split('.')[0];

    if (!oldAvatarPublicId) {
        return res.status(400).json(new ApiResponse(400, null, "User does not have an avatar to delete"));
    }

    // Delete old avatar from Cloudinary
    await deleteFromCloudinary(oldAvatarPublicId);

    // Update user's document to remove avatar URL
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $unset: { avatar: 1 } },
        { new: true }
    ).select("-password");

    // Respond with success message
    return res.status(200).json(new ApiResponse(200, updatedUser, "Old avatar deleted successfully"));
});

// Handler to update the current user's cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Updated cover image file is missing");
    }

    // Upload new cover image to Cloudinary
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error uploading cover image to Cloudinary");
    }

    // Update user's cover image URL
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password");

    // Respond with updated user details
    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
});



// Export all the handlers
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    deleteUserAvatar
};






