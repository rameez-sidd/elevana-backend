import jwt from "jsonwebtoken"
import { ErrorHandler } from "../utils/ErrorHandler.js"
import { CatchAsyncError } from "./catchAsyncErrors.js"
import { redis } from "../utils/redis.js"


// Authenticated User
export const isAuthenticated = CatchAsyncError(async (req, res, next) => {
    const access_token = req.cookies.access_token
    
    if(!access_token){
        return next(new ErrorHandler("Please login to access this resource", 401))
    }
    
    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN)
    
    if(!decoded){
        return next(new ErrorHandler("Access Token is not valid", 401))
    }

    const user = await redis.get(decoded.id)

    if(!user){
        return next(new ErrorHandler("Please login to access this resource", 401))
    }

    req.user = JSON.parse(user)
    next()

})

// validate user role
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role || "")){
            return next(new ErrorHandler(`Role: ${req.user.role} is not allowed to access this resource`, 403))
        }
        next()
    }
}