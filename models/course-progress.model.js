import mongoose from "mongoose";

const lectureProgressSchema = new mongoose.Schema({
    lectureId: {
        type: String,
    },
    viewed:{
        type: Boolean,
    }
    
})

const courseProgressSchema = new mongoose.Schema({
    userId: {
        type: String,
    },
    courseId: {
        type: String,
    },
    completed: {
        type: Boolean,
    },
    lectureProgress: [lectureProgressSchema],
}, {timestamps: true});


export const courseProgressModel = mongoose.model("CourseProgress", courseProgressSchema);