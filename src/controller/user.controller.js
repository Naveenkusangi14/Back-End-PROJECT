import { asyncHandler } from "../utiles/asynchandler.js";
import { ApiError } from "../utiles/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloundinary } from "../server/cloundary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";


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

const loginUser = asyncHandler(async (req, res) => {
    // STEP-1 REQ BODY -> DATA

    const { email, password, username } = req.body
    console.log("email:", email);
    //Step-2 username and email is there or not

    if (!username || !email) {
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
        .json(new ApiError(200, {}, "User logout successful"))
})

export {
    registerUser,
    loginUser,
    logoutUser

}















