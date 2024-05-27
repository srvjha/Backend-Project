import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    if(!content)
        {
            throw new ApiError(400, "Content is required")
        }
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if(!tweet)
        {
            throw new ApiError(400,"Tweet Didnt Created!!")
        }
    res.status(200).json(new ApiResponse(200,{tweet},"Tweet Created SuccessFully!"))

    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
     //User Id = 66533ca3a059c185d5f984d6
     const {userId} = req.params
     let myTweets = []
    
     const userTweets = await Tweet.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $unwind:"$owner"
        },
       
        {
            $group:{
                  _id:"$owner._id",
                  tweets:{$push:"$content"},
                  username:{$first:"$owner.username"}

                  
                  
            }
        },
        {
            $project:{
                _id:0,
                username:1,
                tweets:1
            }
        }
       
     ])
    

     if(!userTweets)
        {
              throw new ApiError(400,"Tweet Fetched Failed.")
        }
    userTweets.forEach((data)=>myTweets.push(data.content))
    console.log("Tweet: ",myTweets)
    console.log("Tweet: ",userTweets)

   res.status(200)
   .json(new ApiResponse(
    200,  
    userTweets,
    "Tweet Fetched Successfully",
   ))
     
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body
    if(!tweetId)
        {
            throw new ApiError(400,"Tweet not Found")
        }
    const tweet= await Tweet.findByIdAndUpdate(
    tweetId,
    {
        $set:{
            content
        },      
    },
    {
        
            new:true
        
    }
)
    if(!tweet)
        {
            throw new ApiError(400,"Tweet Not Updated!")
        }

    res
    .status(200)
    .json(new ApiResponse(201,{tweet},"Tweet Updated Successfully!"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!tweetId)
        {
            throw new ApiError(400,"Tweet not Found")
        }
    const tweet = await Tweet.findByIdAndDelete(
        tweetId,
        {
            new:true
        }
    )

    if(!tweet)
        {
            throw new ApiError(400,"Tweet Not Deleted!")
        }

    res
    .status(200)
    .json(new ApiResponse(201,{tweet},"Tweet Deleted Successfully!"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
