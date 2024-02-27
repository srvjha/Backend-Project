//require('dotenv').config({path:'./env'})
import connectDB from "./db/index.js";
import dotenv from 'dotenv'
import { app } from "./app.js";

dotenv.config({
    path:'./env'
})



connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`Server is running at PORT: ${process.env.PORT}`)
  })
  app.on("error",(error)=>{
    console.log("Something went wrong bhai !!! ",error)
  })
})
.catch((err)=>{
  console.log("MONGO db connection failed !!! ",err)
})






















/*
import express from "express";

const app = express()
//using IIFE function that we learnt in javascript
( async()=>{
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("error",(error)=>{
        console.log("ERROR: ",error)
        throw error
    })

    app.listen(process.env.PORT,()=>{
        console.log(`App is listening on PORT: ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("ERROR :",error)
    throw error
  }
})() */