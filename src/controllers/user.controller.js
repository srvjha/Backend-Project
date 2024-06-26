import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudnary,deleteOnCloudnary} from '../utils/cloudnary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from  'jsonwebtoken'
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{
   try {
     const user =  await User.findById(userId)
     //console.log("User: ",user)

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
      // console.log("email :",email)
      // console.log("Requested Data Login: ",req.body)
      // console.log("Request Files: ",req.files)
      // console.log("Request File: ",req.file)

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
      console.log("Login Successfully!")

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
   console.log("req_user",req.user)
   console.log("req",req)
          await User.findByIdAndUpdate(
            req.user?._id,
            {
               $unset: {
                  refreshToken:1
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
    console.log("Incoming Token: ",incomingRefreshToken)
    if(!incomingRefreshToken)
    {
     throw new ApiError(401,"unauthorized request.")
    }
    
   const decodedInfo  =  jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
   console.log("DecodedInfo: ",decodedInfo)
    
  
    const user = await User.findById(decodedInfo?._id)
    console.log("USER: ",user)
  
    if(!user)
    {
     throw new ApiError(401,"Invalid Refresh Token.")
    }
  
    if(incomingRefreshToken!==user?.refreshToken)
    {
     throw new ApiError(401,"Refresh Token is Expired or Used.")
    }
   //  console.log("Refresh Token : ",user?.refreshTokenn)
   //  console.log("Refresh Token env : ",process.env.REFRESH_TOKEN_SECRET)
  
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
   // const user  =  User.find(req.user)
   // if(!user)
   // {
   //    throw new ApiError(400,"Error While Fetching Data!!")
   // }
   //  console.log("USER :",user)
    console.log("REQUESTED BODY :",req?.user)
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
  console.log("REQUEST: ",req.user)
  console.log("REQUEST file: ",req.file)
  const oldImage = req.user?.avatar
  const avatarFile = req.file

  if(!avatarLocalPath)
  {
   throw new ApiError(400,"Avatar File is Missing.")
  }
  if(avatarFile===oldImage)
   {
      throw new ApiError(400,"Avatar File is already exists.")
   }

 const avatar = await uploadOnCloudnary(avatarLocalPath)
 console.log("Avatar :",avatar)
//  console.log("Avatar URL :",avatar.url)
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
  
 await deleteOnCloudnary(oldImage)

   // const options = {
   //    httpOnly:true,
   //    secure:true
   // }
 
 return res
 .status(200)
 .json(new ApiResponse(200,userAvatar,"New Avatar File Successfully Updated."))
 
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const coverImageLocalPath =  req.file?.path
   const oldImage = req.user?.coverImage
 
   if(!coverImageLocalPath)
   {
    throw new ApiError(400,"CoverImage File is Missing.")
   }
 
  const coverImage = await uploadOnCloudnary(coverImageLocalPath)
  console.log("coverImage :",coverImage)
  console.log("coverImage URL :",coverImage)
  if(!coverImage.url)
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
  await deleteOnCloudnary(oldImage)
 
  return res
  .status(200)
  .json(new ApiResponse(200,userCoverImage,"CoverImage File Successfully Updated"))
 })

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const{username} = req.params
    //console.log("req:",req.user)
    //console.log("Username: ",username)
    if(!username?.trim())
    {
        throw new ApiError(400,"Username is Missing!!")
    }
      const channel =  await User.aggregate([
         {
            $match:{
               username:username?.toLowerCase()
            }
         },
         {
            $lookup:{
               from:"subscriptions", // Subscription model mein naam change ho jata hai
               localField:"_id",
               foreignField:"channel",
               as:"subscribers"
            }
         },
         {
            $lookup:{
               from:"subscriptions",
               localField:"_id",
               foreignField:"subscriber",
               as:"subscribedTo"
            }
         },
         {
            $addFields:{
               subscribersCount:{
                  $size:"$subscribers"
               },
               channelsSubscibedToCount:{
                  $size:"$subscribedTo"
               },
               isSubscibed:{
                  $cond:{
                     if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    
                     then:true,
                     else:false
                  }
               }
            }
         },
         {
            $project:{
               firstName:1,
               lastName:1,
               username:1,
               subscribersCount:1,
               channelsSubscibedToCount:1,
               isSubscibed:1,
               avatar:1,
               coverImage:1,
               email:1

            }
         }
      ])

      if(!channel?.length)
      {
         throw new ApiError(400,"Channel Doesn't Exist.")
      }
      //console.log("Channel:",channel)
      return res
      .status(200)
      .json(new ApiResponse(200,channel[0],"User channel Fetched Successfully!"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
   console.log({_id:new mongoose.Types.ObjectId.createFromBase64(req.user._id)})
   const user  = await User.aggregate([
      {
         $match:{
            _id:new mongoose.Types.ObjectId.createFromBase64(req.user._id)
         }
      },
      {
         $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField:"owner",
                     foreignField:"_id",
                     as:"owner",
                     pipeline:[
                        {
                           $project:{
                              firstName:1,
                              lastName:1,
                              username:1,
                              avatar:1
                           }
                        },
                        {
                           $addFields:{
                              owner:{
                                 $first:"$owner"
                              }
                           }
                        }
                     ]
                  }
               }
            ]
         }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user[0].watchHistory,
         "Watch History Fetched Successfully!"
      )
   )
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
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
}