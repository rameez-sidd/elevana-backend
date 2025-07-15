import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { generateLast12MonthsData } from "../utils/analytics.generator.js"
import { ErrorHandler } from "../utils/ErrorHandler.js"
import { userModel } from "../models/user.model.js";
import { courseModel } from "../models/course.model.js";
import { orderModel } from "../models/order.model.js";

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};


// get user analytics -- only for admin

export const getUsersAnalytics = CatchAsyncError(async (req, res, next) => {
    try {
        // Get all courses created by the admin
        const adminCourses = await populateCreator(courseModel.find({ createdBy: req.user._id }).select('_id'));
        const courseIds = adminCourses.map(course => course._id);

        // Get all orders for these courses
        const orders = await orderModel.find({ courseId: { $in: courseIds } }).select('userId');
        const userIds = [...new Set(orders.map(order => order.userId))];

        // Get analytics for these users
        const users = await generateLast12MonthsData(userModel, { _id: { $in: userIds } });
        
        res.status(200).json({
            success: true,
            users
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// get courses analytics -- only for admin
export const getCoursesAnalytics = CatchAsyncError(async (req, res, next) => {
    try {
        const courses = await generateLast12MonthsData(courseModel, { createdBy: req.user._id })
        res.status(200).json({
            success: true,
            courses
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// get orders analytics -- only for admin
export const getOrdersAnalytics = CatchAsyncError(async (req, res, next) => {
    try {
        // Get all courses created by the admin
        const adminCourses = await populateCreator(courseModel.find({ createdBy: req.user._id }).select('_id'));
        const courseIds = adminCourses.map(course => course._id);

        // Get analytics for orders of these courses
        const orders = await generateLast12MonthsData(orderModel, { courseId: { $in: courseIds } })
        
        res.status(200).json({
            success: true,
            orders
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})