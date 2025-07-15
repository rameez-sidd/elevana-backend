import { ErrorHandler } from "../utils/ErrorHandler.js";

export const ErrorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.message = err.message || 'Internal Server Error'

    // Wrong mongoDB error
    if(err.name === 'CastError'){
        const message = `Resource not found. Invalid: ${err.path}`
        err = new ErrorHandler(message, 400)
    }

    // Duplicate key error
    if(err.statusCode === 11000){
        const message =  `Duplicate ${Object.keys(err.keyValue)} entered`
        err = new ErrorHandler(message, 400)
    }

    // wrong jwt error
    if(err.name === 'JsonWebTokenError'){
        const message = `Json Web Token is invalid, try again`
        err = new ErrorHandler(message, 400)
    }

    // JWT expired error
    if(err.name === 'TokenExpiredError'){
        const message = `Json Web Token is expired, try again`
        err = new ErrorHandler(message, 401)
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}