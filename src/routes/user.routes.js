import { Router } from "express";
import { registerUser, loginUser } from "../controller/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js"

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
router.route("/login").post(

    loginUser)


export default router;
