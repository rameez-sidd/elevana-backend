import { userModel } from "../models/user.model.js";
import { ErrorHandler } from "../utils/ErrorHandler.js"
import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import jwt from "jsonwebtoken";
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail.js";
import { sendToken, accessTokenOptions, refreshTokenOptions } from "../utils/jwt.js";
import { redis } from "../utils/redis.js";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service.js";
import cloudinary from "cloudinary"
import { courseModel } from "../models/course.model.js";
import Stripe from 'stripe'
import { populate } from "dotenv";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const _dirname = path.resolve()

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};



export const registrationUser = CatchAsyncError(async (req, res, next) => {
    try {

        const { name, email, password } = req.body

        const isEmailExist = await userModel.findOne({ email })
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exist", 400))
        }

        const user = {
            name,
            email,
            password,
        }

        const activationToken = createActivationToken(user)

        const activationCode = activationToken.activationCode

        const data = {
            user: {
                name: user.name,
            },
            activationCode
        }

        const html = await ejs.renderFile(path.join(_dirname, "./mails/activation-mail.ejs"), data)

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            })

            res.status(201).json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account`,
                activationToken: activationToken.token,
            })
        } catch (error) {
            return next(new ErrorHandler(error.message, 500))
        }


    }
    catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

export const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString()

    const token = jwt.sign({ user, activationCode }, process.env.ACTIVATION_SECRET, { expiresIn: "5m" })

    return { token, activationCode }
}

// activate user
export const activateUser = CatchAsyncError(async (req, res, next) => {
    try {
        const { activation_code, activation_token } = req.body

        const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET)
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400))
        }

        const { name, email, password } = newUser.user

        const existUser = await userModel.findOne({ email })

        if (existUser) {
            return next(new ErrorHandler("Email already exist", 400))
        }

        const user = await userModel.create({
            name,
            email,
            password
        })

        res.status(201).json({
            success: true,

        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// Login User
export const loginUser = CatchAsyncError(async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({ email }).select("+password")

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        const isPasswordMatch = await user.comparePassword(password)
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        sendToken(user, 200, res)

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// logout user
export const logoutUser = CatchAsyncError(async (req, res, next) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 })
        res.cookie("refresh_token", "", { maxAge: 1 })

        redis.del(req.user._id || "")

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// update access token
export const updateAccessToken = CatchAsyncError(async (req, res, next) => {
    try {
        const refresh_token = req.cookies.refresh_token
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN)

        if (!decoded) {
            return next(new ErrorHandler("Could not refresh token", 401))
        }


        const session = await redis.get(decoded.id)
        if (!session) {
            return next(new ErrorHandler("Please login to access this resource", 401))
        }
        const user = JSON.parse(session)

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN, { expiresIn: "15m" })

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN, { expiresIn: "30d" })

        req.user = user

        res.cookie("access_token", accessToken, accessTokenOptions)
        res.cookie("refresh_token", refreshToken, refreshTokenOptions)

        req.cookies.access_token = accessToken;
        req.cookies.refresh_token = refreshToken;


        await redis.set(user._id, JSON.stringify(user), "EX", 604800) // 7 days

        next()

    } catch (error) {

        return next(new ErrorHandler(error.message, 500))
    }
})


// get user info
export const getUserInfo = CatchAsyncError(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        getUserById(userId, res)

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// social auth
export const socialAuth = CatchAsyncError(async (req, res, next) => {
    try {
        const { email, name, avatar } = req.body
        const user = await userModel.findOne({ email })

        if (!user) {
            const newUser = await userModel.create({ email, name, avatar, password: email.split('@')[0] })
            const data = {
                name: name,
                password: email.split('@')[0],
            }

            const html = await ejs.renderFile(path.join(_dirname, "./mails/social-login-mail.ejs"), data)
            try {
                await sendMail({
                    email: email,
                    subject: "Thanks for Registering with Elevana",
                    template: "social-login-mail.ejs",
                    data,
                })
            } catch (error) {
                return next(new ErrorHandler(error.message, 500))
            }
            sendToken(newUser, 200, res)
        }
        else {
            sendToken(user, 200, res)
        }

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// update user info
export const updateUserInfo = CatchAsyncError(async (req, res, next) => {
    try {
        const { name } = req.body
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if (name && user) {
            user.name = name

            // Update user info in all courses using MongoDB update operators
            const updateResult = await populateCreator(courseModel.updateMany(
                {
                    $or: [
                        { "reviews.user._id": userId },
                        { "courseData.questions.user._id": userId },
                        { "courseData.questions.questionReplies.user._id": userId }
                    ]
                },
                {
                    $set: {
                        "reviews.$[review].user.name": name,
                        "courseData.$[].questions.$[question].user.name": name,
                        "courseData.$[].questions.$[].questionReplies.$[reply].user.name": name
                    }
                },
                {
                    arrayFilters: [
                        { "review.user._id": userId },
                        { "question.user._id": userId },
                        { "reply.user._id": userId }
                    ]
                }
            ))


            // Clear Redis cache for all courses
            const courses = await populateCreator(courseModel.find())
            for (const course of courses) {
                await redis.del(course._id)
            }
            await redis.del("allCourses")
        }

        await user?.save()
        await redis.set(userId, JSON.stringify(user))

        res.status(201).json({
            success: true,
            user,
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// update user password
export const updatePassword = CatchAsyncError(async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Please enter old and new password", 400))

        }

        const user = await userModel.findById(req.user?._id).select("+password")


        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid user", 400))
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword)

        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid Old Password", 400))
        }

        user.password = newPassword

        await user.save()

        await redis.set(req.user?._id, JSON.stringify(user))

        res.status(201).json({
            success: true,
            user,
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

//update profile picture
export const updateProfilePicture = CatchAsyncError(async (req, res, next) => {
    try {
        const { avatar } = req.body
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if (avatar && user) {
            let avatarData = null

            // if we have one avatar 
            if (user?.avatar?.public_id) {
                // first delete the old image
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id)
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                })

                avatarData = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
                user.avatar = avatarData
            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                })

                avatarData = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
                user.avatar = avatarData
            }

            // Update avatar in all courses using MongoDB update operators
            const updateResult = await populateCreator(courseModel.updateMany(
                {
                    $or: [
                        { "reviews.user._id": userId },
                        { "courseData.questions.user._id": userId },
                        { "courseData.questions.questionReplies.user._id": userId }
                    ]
                },
                {
                    $set: {
                        "reviews.$[review].user.avatar": avatarData,
                        "courseData.$[].questions.$[question].user.avatar": avatarData,
                        "courseData.$[].questions.$[].questionReplies.$[reply].user.avatar": avatarData
                    }
                },
                {
                    arrayFilters: [
                        { "review.user._id": userId },
                        { "question.user._id": userId },
                        { "reply.user._id": userId }
                    ]
                }
            ))


            // Clear Redis cache for all courses
            const courses = await populateCreator(courseModel.find())
            for (const course of courses) {
                await redis.del(course._id)
            }
            await redis.del("allCourses")
        }

        await user?.save()
        await redis.set(userId, JSON.stringify(user))

        res.status(200).json({
            success: true,
            user,
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// get all users - only for admin

export const getAllUSers = CatchAsyncError(async (req, res, next) => {
    try {
        const adminId = req.user._id;
        getAllUsersService(res, adminId)
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// update user role -- only for admin
export const updateUserRole = CatchAsyncError(async (req, res, next) => {
    try {
        const { id, role } = req.body
        updateUserRoleService(res, id, role)

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// delete user -- only for admin
export const deleteUser = CatchAsyncError(async (req, res, next) => {
    try {
        const { id } = req.params
        const user = await userModel.findById(id)

        if (!user) {
            return next(new ErrorHandler("User not found", 404))
        }

        await user.deleteOne({ id })

        await redis.del(id)

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

