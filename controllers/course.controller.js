import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { courseModel } from "../models/course.model.js"
import { createCourse, getAllCoursesService } from "../services/course.service.js"
import { ErrorHandler } from "../utils/ErrorHandler.js"
import cloudinary from "cloudinary"
import { redis } from "../utils/redis.js"
import mongoose from "mongoose"
import ejs, { Template } from "ejs"
import path from "path"
import sendMail from "../utils/sendMail.js";
import { reverse } from "dns/promises"
import { title } from "process"
import { notificationModel } from "../models/notification.model.js"
import { log } from "console"


const _dirname = path.resolve()

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};

// upload course
export const uploadCourse = CatchAsyncError(async (req, res, next) => {
    try {
        const data = {
            ...req.body,
            createdBy: req.user._id
        }
        const thumbnail = data.thumbnail
        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            })
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        createCourse(data, res, next)
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// edit course
export const editCourse = CatchAsyncError(async (req, res, next) => {
    try {
        const data = req.body
        const thumbnail = data.thumbnail;

        const courseId = req.params.id;

        const courseData = await populateCreator(courseModel.findById(courseId));

        if (thumbnail && !thumbnail.startsWith("https")) {
            await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }

        if (thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url,
            };
        }

        const course = await populateCreator(courseModel.findByIdAndUpdate(
            courseId,
            {
                $set: data,
            },
            { new: true }
        ))
        await redis.set(courseId, JSON.stringify(course)); // update course in redis

        const courses = await populateCreator(courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 })

        await redis.set("allCourses", JSON.stringify(courses))
        res.status(201).json({
            success: true,
            course,
        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get single course
export const getCourseForEdit = CatchAsyncError(async (req, res, next) => {
    try {
        const courseId = req.params.id

        const course = await populateCreator(courseModel.findById(courseId))

        res.status(200).json({
            success: true,
            course,
        })


    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get single course
export const getSingleCourse = CatchAsyncError(async (req, res, next) => {
    try {
        const courseId = req.params.id

        const isCacheExist = await redis.get(courseId)

        if (isCacheExist) {
            const course = JSON.parse(isCacheExist)
            res.status(200).json({
                success: true,
                course
            })
        } else {
            const course = await courseModel.findById(courseId)
                .populate('createdBy', 'name email avatar') // Populate user details
                .lean(); // .lean() returns a plain JS object

            // Remove unwanted fields from courseData
            if (course?.courseData) {
                course.courseData = course.courseData.map(({ videoUrl, suggestion, questions, links, ...rest }) => rest);
            }

            await redis.set(courseId, JSON.stringify(course), "EX", 604800)  // 7 days

            res.status(200).json({
                success: true,
                course,
            })
        }

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get all courses
export const getAllCourses = CatchAsyncError(async (req, res, next) => {
    try {
        const isCacheExist = await redis.get("allCourses")

        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist)
            res.status(200).json({
                success: true,
                courses,
            })
        } else {
            const courses = await populateCreator(courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 })

            await redis.set("allCourses", JSON.stringify(courses))

            res.status(200).json({
                success: true,
                courses,
            })
        }

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get enrolled courses -- only for user who purchases
export const getEnrolledCourses = CatchAsyncError(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const isCacheExist = await redis.get(`enrolledCourses:${userId}`);

        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                courses,
            });
        } else {
            // Get course IDs from user's courses array
            const userCourseIds = req.user.courses.map(course => course._id);

            const courses = await populateCreator(courseModel.find({
                _id: { $in: userCourseIds }
            }).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 });

            await redis.set(`enrolledCourses:${userId}`, JSON.stringify(courses), "EX", 604800); // Cache for 7 days

            res.status(200).json({
                success: true,
                courses,
            });
        }
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// get course content -- only for valid user
export const getCourseByUser = CatchAsyncError(async (req, res, next) => {
    try {
        const courseId = req.params.id
        const course = await courseModel.findById(courseId)

        if (req.user?.role === 'admin') {
            if (course && course?.createdBy.toString() !== req.user?._id) {
                return next(new ErrorHandler("You are not eligible to access this course", 400))
            }
        }

        if (req.user?.role !== 'admin') {
            if (course?.price > 0) {
                const userCourseList = req.user?.courses

                const courseExist = userCourseList?.find((course) => course._id.toString() === courseId)

                if (!courseExist) {
                    return next(new ErrorHandler("You are not eligible to access this course", 400))

                }
            }


        }



        const content = course?.courseData

        res.status(200).json({
            success: true,
            content
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// add questions in course
export const addQuestion = CatchAsyncError(async (req, res, next) => {
    try {
        const { question, courseId, contentId } = req.body
        const course = await populateCreator(courseModel.findById(courseId))

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid Content ID", 400))
        }

        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId))

        if (!courseContent) {
            return next(new ErrorHandler("Invalid Content ID", 400))
        }

        // create a new question object
        const newQuestion = {
            user: req.user,
            question,
            questionReplies: [],
        }

        // add this question to our course content
        courseContent.questions.push(newQuestion)

        await notificationModel.create({
            user: req.user?._id,
            title: "New Question Received",
            message: `You have a new message in ${courseContent.title}`,
            adminId: course.createdBy
        })

        // save the updated COurse
        await course?.save()
        await redis.set(courseId, JSON.stringify(course), "EX", 604800)  // 7 days

        res.status(200).json({
            success: true,
            course,
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// add answer in course question
export const addAnswer = CatchAsyncError(async (req, res, next) => {
    try {
        const { answer, courseId, contentId, questionId } = req.body

        const course = await populateCreator(courseModel.findById(courseId))

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid Content ID", 400))
        }

        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId))

        if (!courseContent) {
            return next(new ErrorHandler("Invalid Content ID", 400))
        }

        const question = courseContent?.questions?.find((item) => item._id.equals(questionId))

        if (!question) {
            return next(new ErrorHandler("Invalid Question ID", 400))

        }

        // create a new answer object
        const newAnswer = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        // add this answer to our course content
        question.questionReplies.push(newAnswer)

        // save the updated COurse
        await course?.save()
        await redis.set(courseId, JSON.stringify(course), "EX", 604800)  // 7 days

        if (req.user?._id === question.user._id) {
            // create a notification
            await notificationModel.create({
                user: req.user?._id,
                title: "New Question Reply Received",
                message: `You have a new question reply in ${courseContent.title}`,
                adminId: course.createdBy
            })
        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title
            }

            const html = await ejs.renderFile(path.join(_dirname, "./mails/question-reply.ejs"), data)

            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "question-reply.ejs",
                    data,
                })
            } catch (error) {
                return next(new ErrorHandler(error.message, 500))
            }
        }

        res.status(200).json({
            success: true,
            course,
        })



    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// add review in course
export const addReview = CatchAsyncError(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses

        const courseId = req.params.id

        // check if courseId exists in user Course List

        const course = await populateCreator(courseModel.findById(courseId))
        const courseExists = userCourseList?.some((course) => course._id.toString() === courseId.toString())

        if (course?.price > 0) {
            if (!courseExists) {
                return next(new ErrorHandler("You are not eligible to access this course", 400))
            }

        }


        const { review, rating } = req.body

        const reviewData = {
            user: req.user,
            comment: review,
            rating

        }

        course?.reviews.push(reviewData)

        let avg = 0

        course?.reviews.forEach((rev) => {
            avg += rev.rating
        })

        if (course) {
            course.ratings = avg / course.reviews.length
        }

        await course?.save()
        await redis.set(courseId, JSON.stringify(course), "EX", 604800)  // 7 days

        const courses = await populateCreator(courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 })

        await redis.set("allCourses", JSON.stringify(courses))

        const notification = {
            title: "New Review Recieved",
            message: `${req.user?.name} has given a review in ${course?.name}`
        }

        // create notification

        await notificationModel.create({
            user: req.user?._id,
            title: "New Review Received",
            message: `${req.user?.name} has given a review in ${course?.name}`,
            adminId: course.createdBy
        })

        res.status(200).json({
            success: true,
            course
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// add reply in review
export const addReplyToReview = CatchAsyncError(async (req, res, next) => {
    try {
        const { comment, courseId, reviewId } = req.body

        const course = await courseModel.findById(courseId)

        if (!course) {
            return next(new ErrorHandler("Course not found", 404))
        }

        const review = course?.reviews?.find((rev) => rev._id.toString() === reviewId)

        if (!review) {
            return next(new ErrorHandler("Review not found", 404))
        }

        const replyData = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        if (!review.commentReplies) {
            review.commentReplies = []
        }

        review.commentReplies?.push(replyData)

        await course?.save()
        await redis.set(courseId, JSON.stringify(course), "EX", 604800)  // 7 days

        res.status(200).json({
            success: true,
            course
        })



    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get all courses - only for admin

export const getAllCoursesAdmin = CatchAsyncError(async (req, res, next) => {
    try {
        const userId = req.user._id
        getAllCoursesService(res, userId)
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// delete course -- only for admin
export const deleteCourse = CatchAsyncError(async (req, res, next) => {
    try {
        const { id } = req.params
        const course = await populateCreator(courseModel.findById(id))

        if (!course) {
            return next(new ErrorHandler("Course not found", 404))
        }

        await course.deleteOne({ id })



        await redis.del(id)

        const courses = await populateCreator(courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 })

        await redis.set("allCourses", JSON.stringify(courses))

        res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})
// upload video
export const uploadVideo = CatchAsyncError(async (req, res, next) => {
    try {
        const video = req.files.video;
        if (!video) {
            return next(new ErrorHandler("Please upload a video", 400));
        }

        const myCloud = await cloudinary.v2.uploader.upload(video.tempFilePath, {
            resource_type: "video",
            folder: "course-videos",
        });

        res.status(200).json({
            success: true,
            videoUrl: myCloud.secure_url,
            videoId: myCloud.public_id,
            videoLength: myCloud.duration,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});
