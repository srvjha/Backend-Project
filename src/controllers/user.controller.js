import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudnary} from '../utils/cloudnary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    // 1. Get data from user 
    // 2. make field for name , email, password, confirm password.
    // 3. validation
    // 4.check if user already exists:username,email
    // 5.check for images and check for avatar
    // 6. upload it to cloudnary,avatar
    // 7.create user object - create entry in db
    // 8. remove password and refresh token field from response
    // 9.check for user creation
    // 10.return res

    const {fullName,username,email,password} = req.body
    console.log("email:",email)
    console.log("Request body : ",req.body)

     // now wrting conditions for field check

     if([fullName,username,email,password].some((field)=>
        field?.trim()===""
     ))
     {
        throw new ApiError(400,"All fields are Required!!")
     }

     // Checking if user is already existed or not
    const existedUser =  User.findOne({
        $or:[{ username },{ email }]
     })

      console.log("Existed User: ",existedUser)

     if(existedUser)
     {
        throw new ApiError(409,"User with username or password already existed!")
     }

     const avatarLocalPath = req.files?.avatar[0]?.path;
     const coverImageLocalPath = req.files?.coverImage[0]?.path;

     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Required!")
     }


    const avatar =  await uploadOnCloudnary(avatarLocalPath)
    const coverImage =  await uploadOnCloudnary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Avatar File is Required!")
    }

   const user = await User.create({
      fullName,
      username:username.toLowerCase(),
      email,
      password,
      avatar:avatar.url,
      coverImage:coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )

    if(!createdUser)
    {
      throw new ApiError(500,"Something Went Wrong while registering the user!!")
    }

    return res.status(201).json(
      new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})

 




export {registerUser}