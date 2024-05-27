import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required.");
    }

    try {
        // Create playlist
        const playlist = await Playlist.create({
            name,
            description,
            video: [], // empty array rkha hai kyuki start mein koi videos nhi hai
            owner: req.user._id,
        });

        res.status(200).json(new ApiResponse(200, { playlist }, "Playlist Created Successfully!"));
    } catch (error) {
       
        throw new ApiError(500, "Failed to create playlist.");
    }
});


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

   
    if (!userId) {
        throw new ApiError(400, "User ID is required.");
    }

    try {
       
        const userPlaylists = await Playlist.find(
            { 
                owner: new mongoose.Types.ObjectId(userId) 
            });
       // agr playlist nhi hai toh edge case
        if (!userPlaylists || userPlaylists.length === 0) {
            throw new ApiError(404, "No playlists found for this user.");
        }

        
        const userPlaylistDetails = userPlaylists.map(data => ({
            _id: data._id,
            name: data.name,
            description: data.description,
            videoCount: data.video.length,
            videos: data.video.length===0?"No Videos Added.":data.video, //agr video nhi hai toh msg show krdo


        }));

        // Send the response
        res.status(200).json(new ApiResponse(200, { userPlaylistDetails }, "Playlists fetched successfully!"));
    } catch (error) {
        // Handle any errors
        throw new ApiError(500, "An error occurred while fetching the playlists.");
    }
});


const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
