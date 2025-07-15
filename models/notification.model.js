import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    message:{
        type: String,
        required: true
    },
    status:{
        type: String,
        required: true,
        default: "unread"
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
    
}, {timestamps : true})

export const notificationModel = mongoose.model("Notification", notificationSchema)

