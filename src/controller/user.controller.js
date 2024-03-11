import { asyncHandler } from "../utiles/asynchandler.js";
import { ApiError } from "../utiles/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloundinary } from "../server/cloundary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";
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

const  loginUser = asyncHandler(async(req , res) =>{
    // STEP-1 REQ BODY -> DATA
   const{email , password , username} = req.body
    console.log(email);
})

export { registerUser ,
    loginUser

}