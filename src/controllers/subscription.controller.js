import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
       // console.log("Req: ",req)
    // TODO: toggle subscription
    if(!channelId)
        {
            throw new ApiError(400,"No Channel Found!")
        }

    if(channelId==req.user?._id)
        {
            throw new ApiError(400,"You cannot subscribe to your own channel!")
        }
    console.log("Channel ID: ",channelId)
    console.log("REQ ID: ",req.user?._id)
       // first mene check kiya ki subscribed hai ki nhi
    const subscription = await Subscription.findOne(
        {
           
                channel:channelId,
                subscriber:req.user?._id
            
        }
       
    )

   // console.log("UserDetails: ",subscription)
   // us ke hisaab se conditon lagaya
    if (!subscription) {
        // Create new subscription
        await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        });
        res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscription added successfully"));
    } else {
        // Delete existing subscription
        await Subscription.deleteOne({
            subscriber: req.user._id,
            channel: channelId
        });
        res.status(200).json(new ApiResponse(200, { subscribed: false }, "Subscription removed successfully"));
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}