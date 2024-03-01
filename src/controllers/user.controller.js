import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudnary} from '../utils/cloudnary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from  'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId)=>{
   try {
     const user =  await User.findById(userId)
     console.log("User: ",user)

    const accessToken = user.generateAccessToken()
    const refreshToken =  user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave:false})

   return {accessToken,refreshToken}

   } catch (error) {
      throw new ApiError(500,"Something went wrong while generating access and refresh token.")
   }
}

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

    const {firstName,lastName,username,email,password} = req.body
    console.log("email:",email)
    console.log("Request body : ",req.body)

     // now wrting conditions for field check

     if([firstName,lastName,username,email,password].some((field)=>
        field?.trim()===""
     ))
     {
        throw new ApiError(400,"All fields are Required!!")
     }

     // Checking if user is already existed or not
    const existedUser =  await User.findOne({
        $or:[{ username },{ email }]
     })

      console.log("Existed User: ",existedUser)

     if(existedUser)
     {
        throw new ApiError(409,"User with username or password already existed!")
     }


     console.log("Requested Files : ",req.files)
     const avatarLocalPath = req.files?.avatar[0]?.path;
   //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

     let coverImageLocalPath;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
     {
      coverImageLocalPath = req.files.coverImage[0].path
     }

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
      firstName,
      lastName,
      username:username.toLowerCase(),
      email,
      password,
      avatar:avatar.url,
      coverImage:coverImage?.url || ""
    })

    console.log("User : ",user)
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )
    console.log("Created User : ",createdUser)
    if(!createdUser)
    {
      throw new ApiError(500,"Something Went Wrong while registering the user!!")
    }

    return res.status(201).json(
      new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})

const loginUser = asyncHandler(async(req,res)=>{
      //1.get data from req.body
      // 2.username or email
      // 3.find the user
      // 4. password check
      // 5.access and refresh token
      // 6. send cookie

      const {email,username,password} = req.body;
      console.log("email :",email)
      console.log("Requested Data Login: ",req.body)

      if(!username && !email) // ALternative to this----> if(!(username || email))
      {
         throw new ApiError(400,"username or email is Required!")
      }

    const user =  await User.findOne({
         $or:[{email},{username}]
      })

      if(!user)
      {
         throw new ApiError(404,"User does not exist!!!")
      }

      const isPasswordValid = await user.isPasswordCorrect(password);

      if(!isPasswordValid)
      {
         throw new ApiError(401,"Invalid User Credentials.")
      }

      const{accessToken,refreshToken} =  await generateAccessAndRefreshTokens(user._id)

      const loggedInUser = await User.findById(user._id).select(
         "-password -refreshToken"
      )

      const options = {
         httpOnly:true,
         secure:true
      }

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
        new ApiResponse(200,
         {
            user:loggedInUser,accessToken,refreshToken
         },"User Logged In Successfully.")
      )
})

const logoutUser = asyncHandler(async(req,res)=>{
          await User.findByIdAndUpdate(
            req.user._id,
            {
               $set: {
                  refreshToken:undefined
               }
            },
            {
               new:true
            }
          )

          const options = {
            httpOnly:true,
            secure:true
         }

         return res
         .status(200)
         .clearCookie("accessToken",options)
         .clearCookie("refreshToken",options)
         .json(
            new ApiResponse(200,{},"User Logged Out Successfully.")
         )
   })

const refreshAccessToken = asyncHandler(async(req,res)=>{
 try {
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken)
    {
     throw new ApiError(401,"unauthorized request.")
    }
    
   const decodedInfo  =  jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
  
    const user = await User.findById(decodedInfo?._id)
  
    if(!user)
    {
     throw new ApiError(401,"Invalid Refresh Token.")
    }
  
    if(incomingRefreshToken!==user?.refreshToken)
    {
     throw new ApiError(401,"Refresh Token is Expired or Used.")
    }
    console.log("Refresh Token : ",user?.refreshTokenn)
    console.log("Refresh Token env : ",process.env.REFRESH_TOKEN_SECRET)
  
    const options = {
     httpOnly:true,
     secure:true
  }
  
   const{accessToken,newrefreshToken} = generateAccessAndRefreshTokens(user._id)
  
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("RefreshToken",newrefreshToken,options)
   .json(
     new ApiResponse(
        400,
        {accessToken,refreshToken:newrefreshToken},
        "Access Token Refreshed Successfully."
        )
   )
 } catch (error) {
   throw new ApiError(401,error?.message||"Invalid Refresh Token.")
 }
})
 

const changeUserPassword = asyncHandler(async(req,res)=>{
   const{oldPassword,newPassword} = req.body

   const user = await User.findById(req.user?._id)
   console.log("USER ID FOR PASSWORD CHANGE :",user)
   if(!user)
   {
      throw new ApiError(400,"User not Logged In")
   }

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect)
   {
      throw new ApiError(400,"Invalid old Password.")
   }

   user.password = newPassword
  await user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(new ApiResponse(200,{},"Password Changed Succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   const user  = await User.find(req.user)

   // console.log("USER :",user)
   // console.log("REQUESTED BODY :",req.user)
   // console.log("REQUESTED BODY ID :",req.user?._id)
   return res
   .status(200)
   .json(new ApiResponse(200,req.user,"Current user fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const{fullName,email} = req.body

   if(!fullName || !email)
   {
      throw new ApiError(400,"ALls fields are Required.")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullName:fullName,
            email:email   // we can directly email as well becuase both are same and in new version its new update feature
         }
      },
      {
         new:true
      }
      ).select("-password")

      return res
      .status(200)
      .json(new ApiResponse(200,user,"Account Details Updated Succesfully."))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath =  req.file?.path

  if(!avatarLocalPath)
  {
   throw new ApiError(400,"Avatar File is Missing.")
  }

 const avatar = await uploadOnCloudnary(avatarLocalPath)
 console.log("Avatar :",avatar)
 console.log("Avatar URL :",avatar.url)
 if(!avatar.url)
 {
   throw new ApiError(400,"Error while uploading avatar.")
 }

 const userAvatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
         avatar:avatar.url
      }
    },
    {
      new:true
    }
 ).select("-password")

 return res
 .status(200)
 .json(new ApiResponse(200,userAvatar,"Avatar File Successfully Updated."))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const coverImageLocalPath =  req.file?.path
 
   if(!coverImageLocalPath)
   {
    throw new ApiError(400,"CoverImage File is Missing.")
   }
 
  const coverImage = await uploadOnCloudnary(coverImageLocalPath)
  console.log("Avatar :",avatar)
  console.log("Avatar URL :",avatar.url)
  if(!avatar.url)
  {
    throw new ApiError(400,"Error while uploading coverImage.")
  }
 
  const userCoverImage = await User.findByIdAndUpdate(
     req.user?._id,
     {
       $set:{
          coverImage:coverImage.url
       }
     },
     {
       new:true
     }
  ).select("-password")
 
  return res
  .status(200)
  .json(new ApiResponse(200,userCoverImage,"CoverImage File Successfully Updated."))
 })

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeUserPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage
}