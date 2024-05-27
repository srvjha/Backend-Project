import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudnary, deleteVideoOnCloudnary, uploadOnCloudnary} from "../utils/cloudnary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const{ page, limit , query, sortBy, sortType, userId } = req.query
    // const {userId} = req.query
    //TODO: get all videos based on query, sort, pagination

     // Ensure page and limit are numbers
    const  newPage = parseInt(page, 10); // (string,matrix)
    const  newLimit = parseInt(limit, 10);
   
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
    console.log("match: ",match)
   
    if (query) {
        match.$or = [
            { title: { $regex: query, $options: 'i' } }, 
            { description: { $regex: query, $options: 'i' } }
        ];
    }
  // $regex is a MongoDB operator that allows you to perform regular expression searches.
    // This will match documents where the title or description contains the query string as a substring.
    // $options: 'i' makes the regex case-insensitive, so it will match the query regardless of its case.
    // For example, in our case the video is abput Clever Man so i put a query of "clever"
    // will match titles or descriptions containing "Clever", "CLEVER", or "clever".

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
            $skip: (newPage - 1) * newLimit

        },
        {
            $limit:newLimit
        },
        
    ])
    console.log("Videos: ",videos.length)
    if(videos.length<1)
        {
            throw new ApiError(400,"Videos Not Found")
        }
    else
    {
         // Total count for pagination
    const totalVideos = await Video.countDocuments(match);
    res.status(200).json(
        new ApiResponse(200, { videos,totalVideos,newPage,newLimit }, "Videos fetched successfully")
    );
    }

   


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
        owner: req.user?._id
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
   
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: { views: 1 },  // jbhi video koi get krega toh views increment kr denge            
        },
        {
            new: true,
        }
    )
    if(!video)
        {
            throw new ApiError(400,"No Video Found")
        }
    res.status(200).json(
        new ApiResponse(200,{video},"Video Fetched Successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
   
    //TODO: update video details like title, description, thumbnail
    
    const {title,description} = req.body
    const thumbnailLocalPath = req.file?.path
    const videoDetails = await Video.findById(videoId)
    if(!videoDetails)
        {
            throw new ApiError(400,"No Video Found")
        }
    const oldThumbnail = videoDetails?.thumbnail
    if(!thumbnailLocalPath)
        {
         throw new ApiError(400,"Avatar File is Missing.")
        }
    const thumbnail = await uploadOnCloudnary(thumbnailLocalPath)

    const video = await Video.findByIdAndUpdate(
    videoId,
     {
        $set:{
            title,
            description,
            thumbnail:thumbnail?.url,
                       
        },
        
     },
     {
        new:true // idhr yeh operator isliye use kr rhe kyuki jb video json me bheje toh update wala jaye
    }
    )
    deleteOnCloudnary(oldThumbnail)
    

    res.status(200).json(new ApiResponse(201,{video},"Updated Details Sucessfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const videoDetails = await Video.findById(videoId)

    if (!videoDetails) {
        throw new ApiError(404, "Video not found");
    }

    const videoFile = videoDetails.videoFile
    console.log("VideoFile: ",videoFile)
     try {
        await deleteVideoOnCloudnary(videoFile); // delete on cloudinary
        await Video.findByIdAndDelete(videoId);  // delete on db
    } catch (error) {
        console.error("Error deleting video file from Cloudinary:", error);
        throw new ApiError(500, "Error deleting video file from Cloudinary");
    }

    res.status(200).json(new ApiResponse(200,"Video Deleted Sucessfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle publish status
    const videoDetails = await Video.findById(videoId)
    if (!videoDetails) {
        throw new ApiError(404, "Video not found");

    }
    // console.log("1st Here")

    const statusOfPublish = videoDetails.isPublished // true || false
    const toggleStatus = !statusOfPublish
    // console.log("Status: ",toggleStatus)
    // console.log("2nd Here")
   

    const video  = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: toggleStatus
            }
        },
        {
            new: true
        }
    )
    // console.log("3rd Here")
    if(!video)
        {
            throw new ApiError(400,"No Video Found")
        }
        // console.log("4th Here")
        //console.log("Video: ",video)

    res.status(200).json(new ApiResponse(200,{video},"toggle status updated"))
    // console.log("5th Here")

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
