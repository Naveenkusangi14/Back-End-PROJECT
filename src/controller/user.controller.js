import { asyncHandler } from "../utiles/asynchandler.js";
import { ApiError } from "../utiles/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloundinary } from "../server/cloundary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";
import jwt from "jsonwebtoken";

//generateAccessAndRefereshToken user
const generateAccessAndRefereshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const acccessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { acccessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}
//registerUser
const registerUser = asyncHandler(async (req, res) => {

    // Step-1 get user detail from front-end
    const { fullName, email, username, password } = req.body
    console.log("email:", email);

    // Step-2 valdition
    if ([
        fullName, email, password, username
    ].some((field) => {
        field?.trim() === ""

    })) {
        throw new ApiError(400, "All fields are required")
    }
    //Step-3 user already exist 

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email and username already existed ")
    }
    //Step-4  upload avatarLocalPath &  coverImageLocalPath
    //    console.log(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Localpath Avatar file required")
    }
    //Step-5  upload avataruploadCloundinary&  coverImageuploadCloundinary
    const avatar = await uploadCloundinary(avatarLocalPath)
    const coverImage = await uploadCloundinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "uploadCloundinary Avatar file required")
    }

    //Step-5  upload avataruploadCloundinary&  coverImageuploadCloundinary
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username
    })
    //Step-6  create user object for db
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createUser) {
        throw new ApiError(500, "Something went wrong while register user")
    }
    return res.status(201).json(
        new ApiResponse(200, createUser, "User registerd sussessful")
    )

})
//login user
const loginUser = asyncHandler(async (req, res) => {
    // STEP-1 REQ BODY -> DATA

    const { email, password, username } = req.body
    console.log("email:", email);
    //Step-2 username and email is there or not

    if (!username && !email) {
        throw new ApiError(400, "username or email required")
    }
    //Step-3 find the user

    const user = await User.findOne({ $or: [{ username }, { email }] })

    //Step-4 password check

    const isPasswordVaild = await user.isPasswordCorrect(password)
    if (!isPasswordVaild) {
        throw new ApiError(401, "password in correct")
    }

    //Step-5 acccess and refresh token
    const { acccessToken, refreshToken } = await generateAccessAndRefereshToken(user._id)


    const loggedIn = await User.findById(user._id).select("-password -refreshToken")


    //Step-6 cookies

    const option = {
        httpOnly: true,
        secure: true
    }
    //Step-7 Res 

    return res.status(200)
        .cookie("accessToken", acccessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(
                200,
                {
                    user: loginUser, acccessToken, refreshToken
                },
                "User successful loggedIn"
            )
        )
})

//logout user
const logoutUser = asyncHandler(async (req, res) => {
    // Step-1 Find user
    User.findByIdAndUpdate(
        req.user._id, // auth middleare we create the middle
        {
            $set: {
                refreshToken: undefined
            }
        }, {
        new: true
    }
    )
    //cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logout successful"))
})

//refreshaccesstoken
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    if (incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    //verify
    try {
        const decodedToken = jwt.verify
            (!incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Inavalid incomingRefreshToken ")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "REFRESH TOKEN IS EXPIRED OR USED ")
        }

        const option = {
            httpOnly: true,
            secure: true
        }
        const { acccessToken, newrefreshToken } = await generateAccessAndRefereshToken(user._id)
        return res
            .status(200)
            .cookie("accessToken", acccessToken)
            .cookie("refreshToken", newrefreshToken)
            .json(
                new ApiResponse(
                    200, { acccessToken, refreshToken: newrefreshToken },
                    "ACESS TOKEN REFRESHED"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// Change Current Password 
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body


    const user = await User.findById(req.user?._id) // middle ware
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) //user.model.js
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "New Password Created Successful"))
})

// getCurrentUser 
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current user Fetched successful")
})

//updateAccountDetails User
const updateAccountDetails = asyncHandler(async => {
    const { fullName, username } = req.body

    if (!fullName && !username) {
        throw new ApiError(400, " Required  to change updateAccountDetails")

    }
    const user = User.findByIdAndUpdate(req.user?._id
        , {
            $set: {
                fullName,
                username
            }
        }, { new: true }).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated Successfully"))
});
//updateAvatarDetails User

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Updated  Avatar file is  missing")
    }

    const avatar = await uploadCloundinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading in uploadCloundinary ")
    }
    const user = await User.findByIdAndUpdate(req.user?._id
        , {
            $set: {
                avatar: avatar.url
            }
        }, { new: true }).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "avatar details updated Successfully"))

})



const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Updated  coverImageLocalPath file is  missing")
    }

    const coverImage = await uploadCloundinary(avatarLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while coverImage in uploadCloundinary ")
    }
    const user = await User.findByIdAndUpdate(req.user?._id
        , {
            $set: {
                coverImage: coverImage.url
            }
        }, { new: true }).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage details updated Successfully"))

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}















