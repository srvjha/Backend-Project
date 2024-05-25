import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudnary} from "../utils/cloudnary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    let{ page, limit , query, sortBy, sortType, userId } = req.query
    // const {userId} = req.query
    //TODO: get all videos based on query, sort, pagination

     // Ensure page and limit are numbers
     page = parseInt(page, 10);
     limit = parseInt(limit, 10);
    if(!userId || !isValidObjectId(userId))
        {
            throw new ApiError(400,"User ID Not Found")
        }

         //Validate query parameters
    if (!['asc', 'desc'].includes(sortType)) {
        throw new ApiError(400, "Invalid sortType, should be 'asc' or 'desc'");
    }

        // Query FIltering
    const match = { owner: new mongoose.Types.ObjectId(userId) };
    console.log("match: ",match.userId)
   
    if (query) {
        match.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ];
    }
   

    

    const videos = await Video.aggregate([
        {
            $match:match
        },
       
        {
            $sort:{
                 [sortBy]: sortType === "asc" ? 1 : -1,
            }
        },
        {
            $skip: (page - 1) * limit

        },
        {
            $limit: limit
        },
        
    ])

    // Total count for pagination
    const totalVideos = await Video.countDocuments(match);
    res.status(200).json(
        new ApiResponse(200, { videos,totalVideos,page,limit }, "Videos fetched successfully")
    );


})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    const videoFileLocalPath = req.files?.videoFile[0].path
    const thumbnailLocalPath = req.files?.thumbnail[0].path
    if(!videoFileLocalPath && !thumbnailLocalPath)
        {
            throw new ApiError(400,"VideoFile & Thumbnail is Required!")
        }
    const videoFile = await uploadOnCloudnary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudnary(thumbnailLocalPath)
    if(!videoFile ||!thumbnail)
        {
            throw new ApiError(400,"VideoFile & Thumbnail Not Uploaded!")
        }
    const video = await Video.create({
        title,
        description,
        videoFile:videoFile?.url,
        thumbnail:thumbnail?.url,
        duration: videoFile?.duration,
        views: 0,
        isPublished: true,
        owner: req.user._id
    })

    if(!video)
        {
            throw new ApiError(400,"Video Didnt Created!!")
        }
    res.status(200).json(
        new ApiResponse(200, video, "Video Published Successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId).select("videoFile")
    if(!video)
        {
            throw new ApiError(400,"No Video Found")
        }
    res.status(200).json(
        new ApiResponse(201,{video},"Video Fetched Successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
