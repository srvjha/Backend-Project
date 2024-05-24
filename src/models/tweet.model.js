import mongoose from "mongoose";


const tweetSchema = new mongoose.Schema({
     owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    content:{
        type:String,
        required:true,
        trim:true
    
    },
    
},{
    timestamps:true
})

export const Tweet = new mongoose.model("Tweet",tweetSchema)