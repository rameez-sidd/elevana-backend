import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { courseProgressModel } from "../models/course-progress.model.js"
import { courseModel } from "../models/course.model.js"

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};

export const getCourseProgress = CatchAsyncError(async (req, res, next) => {
    try {
        const {courseId} = req.params
        const userId = req.user?._id

        let courseProgress = await courseProgressModel.findOne({userId, courseId}).populate('courseId')

        const courseDetails = await populateCreator(courseModel.findById(courseId))
         
        if(!courseDetails){
            return next(new ErrorHandler("Course not found", 404))
        }

        if(!courseProgress){
            return res.status(200).json({
                data: {
                    courseDetails,
                    progress: [],
                    completed: false,
                }
            })
        }

        return res.status(200).json({
            data: {
                courseDetails,
                progress: courseProgress.lectureProgress,
                completed: courseProgress.completed,
            }
        })



    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

export const updateLectureProgress = CatchAsyncError(async (req, res, next) => {
    try {
        const {courseId, lectureId} = req.params
        const userId = req.user?._id

        let courseProgress = await courseProgressModel.findOne({userId, courseId})
        if(!courseProgress){
            courseProgress = await courseProgressModel.create({
                userId,
                courseId,
                completed: false,
                lectureProgress: []
            })
        }

        const lectureIndex = courseProgress.lectureProgress.findIndex(lecture => lecture.lectureId === lectureId)

        if(lectureIndex !== -1){
            courseProgress.lectureProgress[lectureIndex].viewed = true
        } else {
            courseProgress.lectureProgress.push({
                lectureId,
                viewed: true
            })
        }

        const lectureProgressLength = courseProgress.lectureProgress.filter((lectureProg) => lectureProg.viewed === true).length

        const course = await courseModel.findById(courseId)

        if(course.courseData.length === lectureProgressLength){
            courseProgress.completed = true
        }

        await courseProgress.save()

        return res.status(200).json({
            message: "Lecture progress updated successfully",
            data: {
                courseProgress
            }
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

export const markAsCompleted = CatchAsyncError(async (req, res, next) => {
    try {
        const {courseId} = req.params
        const userId = req.user?._id

        let courseProgress = await courseProgressModel.findOne({userId, courseId})

        if(!courseProgress){
            return next(new ErrorHandler("Course progress not found", 404))
        }

        courseProgress.lectureProgress.map((lectureProg) => lectureProg.viewed = true)
        courseProgress.completed = true

        await courseProgress.save()

        return res.status(200).json({
            message: "Course marked as completed successfully",
            data: {
                courseProgress
            }
        })  

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

export const markAsIncompleted = CatchAsyncError(async (req, res, next) => {
    try {
        const {courseId} = req.params
        const userId = req.user?._id

        let courseProgress = await courseProgressModel.findOne({userId, courseId})

        if(!courseProgress){
            return next(new ErrorHandler("Course progress not found", 404))
        }

        courseProgress.lectureProgress.map((lectureProg) => lectureProg.viewed = false)
        courseProgress.completed = false

        await courseProgress.save()

        return res.status(200).json({
            message: "Course marked as incompleted successfully",
            data: {
                courseProgress
            }
        })  

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})