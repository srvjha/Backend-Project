import { Router } from "express";
import { 
    getCurrentUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    changeUserPassword,
    updateUserAvatar, 
    updateAccountDetails,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
 } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router  = Router();

router.route("/register").post(
    upload.fields([
        {
            name:'avatar',
            maxCount:1
        },
        {
            name:'coverImage',
            maxCount:1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

// secured Routes

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeUserPassword)
router.route("/currentuser").post(verifyJWT,getCurrentUser)
router.route("/update-account-details").patch(updateAccountDetails)
router.route("/update-avatar").post(verifyJWT,upload.single('avatar'),updateUserAvatar)
router.route("/update-coverimage").post(verifyJWT,upload.single('coverImage'),updateUserCoverImage)
router.route("/get-user-channel-profile/:username").get(getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)


export default router;