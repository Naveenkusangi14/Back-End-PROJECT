import { asyncHandler } from "../utiles/asynchandler.js";
import { ApiError } from "../utiles/ApiError.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";
// logout
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authization")?.replace("Bearer", "") // aIn cooike accessstoken will present for there will use access token to logout
        // If accessToken not there in the Cookies
        if (!token) {
            throw new ApiError(401, " Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken")
        if (!user) {
            //frontend next video
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token ")
    }
})