import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controller/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// POST /api/v1/users/register
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

//Login route
router.route("/login").post(loginUser)

//Logout 
//SECURED ROUTES
router.route("/logout").post(verifyJWT, logoutUser)
//refreshAccessToken
router.route("/refresh-token").post(refreshAccessToken)

export default router;
