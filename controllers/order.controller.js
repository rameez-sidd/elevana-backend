import { ErrorHandler } from "../utils/ErrorHandler.js"
import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { userModel } from "../models/user.model.js";
import { courseModel } from "../models/course.model.js"
import { notificationModel } from "../models/notification.model.js"
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail.js"; 
import { getAllOrdersService, newOrder } from "../services/order.service.js";
import Stripe from "stripe";
import { redis } from "../utils/redis.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const _dirname = path.resolve()

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};



export const createOrder = CatchAsyncError(async (req, res, next) => {
    try {
        const {courseId, paymentInfo} = req.body

        if(paymentInfo){
            if("id" in paymentInfo){
                const paymentIntentId = paymentInfo.id
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

                if(paymentIntent.status !== "succeeded"){
                    return next(new ErrorHandler("Payment not authorized", 400))
                }
            }
        }

        const user = await userModel.findById(req.user?._id)

        const courseExistInUser = user?.courses.some((course) => course._id.toString() === courseId)

        if(courseExistInUser){
            return next(new ErrorHandler("You have already purchased this course", 400))
        }
        
        const course = await populateCreator(courseModel.findById(courseId))
        
        if(!course){
            return next(new ErrorHandler("Course not found", 404))
            
        }

        const data = {
            courseId: course._id,
            userId: user?._id,
            paymentInfo,
        }

        
        const mailData = {
            order: {
                _id: course._id.toString().slice(0,6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
            }
        }
        
        const html = await ejs.renderFile(path.join(_dirname, './mails/order-confirmation.ejs'), {order: mailData})
        
        try {
            if(user){
                await sendMail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                })
            }
            
        } catch (error) {
            return next(new ErrorHandler(error.message, 500))
            
        }
        
        user?.courses.push(course?._id)

        await redis.set(req.user?._id, JSON.stringify(user))
        
        await user?.save()
        
        const notification = await notificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`,
            adminId: course.createdBy
        })
        
        course.purchased = course.purchased ? course.purchased + 1 : 1;
        
        
        course.purchasedBy.push(user._id);
        await redis.set(courseId, JSON.stringify(course))
        await course.save()

        const courses = await populateCreator(courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 })
        
        await redis.set("allCourses", JSON.stringify(courses))
        
        // Update enrolled courses cache for the user
        const enrolledCourses = await populateCreator(courseModel.find({
            _id: { $in: user.courses }
        }).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")).sort({ createdAt: -1 });
        
        await redis.set(`enrolledCourses:${user._id}`, JSON.stringify(enrolledCourses), "EX", 604800); // Cache for 7 days

        newOrder(data, res, next)


       
        
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get all orders only for admin
export const getAllOrders = CatchAsyncError(async (req, res, next) => {
    try {
        getAllOrdersService(res, req.user._id)
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// send stripe publishable key
export const sendStripePublishableKey = CatchAsyncError(async (req, res, next) => {
    res.status(200).json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    })
})

// new payment 
export const newPayment = CatchAsyncError(async (req, res, next) => {
    try {
        const { amount, courseId } = req.body;
        
        // Fetch course details
        const course = await populateCreator(courseModel.findById(courseId));
        if (!course) {
            return next(new ErrorHandler("Course not found", 404));
        }

        const myPayment = await stripe.paymentIntents.create({
            amount: amount,
            currency: "USD",
            receipt_email: req.user?.email,
            metadata: {
                company: "Elevana",
                courseId: course._id.toString(),
                courseName: course.name,
                coursePrice: course.price.toString(),
                courseThumbnail: course.thumbnail?.url || "",
            },
            automatic_payment_methods: {
                enabled: true,
            }
        })

        res.status(201).json({
            success: true,
            clientSecret: myPayment.client_secret
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})