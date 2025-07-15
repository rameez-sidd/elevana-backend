import { redis } from "./redis.js"

// parse environment variables to integrate with fallback 
export const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE)
export const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE)

// options for cookies
export const accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
}

export const refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60* 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
}




export const sendToken = (user, statusCode, res) => {
    const accessToken = user.signAccessToken()
    const refreshToken = user.signRefreshToken()
    
    // upload session to redis
    redis.set(user._id, JSON.stringify(user))

    

    // only set secure to true in production
    if(process.env.NODE_ENV === 'production'){
        accessTokenOptions.secure = true
    }

    res.cookie("access_token", accessToken, accessTokenOptions)
    res.cookie("refresh_token", refreshToken, refreshTokenOptions)

    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    })
}