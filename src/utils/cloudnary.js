import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
import { ApiError } from './ApiError.js';

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudnary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null
        // upload file on cloudnary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file has been uploded successfully
        console.log("File is Uploaded Succesfully on CLoudnary!!!",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        
    }
}

const deleteOnCloudnary  = async(localFileURL)=>{
    const public_id = localFileURL.slice(localFileURL.lastIndexOf("/") + 1, localFileURL.lastIndexOf(".png"));
   
    try {
        if(!public_id) return null
        // delete file 
        console.log("Public ID:",public_id)
        const response  = await cloudinary.uploader.destroy(public_id)
        console.log("File is Successfully Deleted",response)
        return response
        
    } catch (error) {
        throw new ApiError(400,"File not Deleted.")
    }
}

const deleteVideoOnCloudnary  = async(localFileURL)=>{
    const public_id = localFileURL.slice(localFileURL.lastIndexOf("/") + 1, localFileURL.lastIndexOf(".webm"));
    
    try {
        if(!public_id) return null
        // delete file 
        console.log("Public ID:",public_id)
        const response = await cloudinary.uploader.destroy(public_id,{
            resource_type:"video"
            
        })
        console.log("File is Successfully Deleted",response)
        return response
        
    } catch (error) {
        throw new ApiError(400,"File not Deleted.")
    }
}



// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });

export {uploadOnCloudnary,deleteOnCloudnary,deleteVideoOnCloudnary}