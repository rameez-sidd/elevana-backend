import {Redis} from "ioredis"
import dotenv from "dotenv"
dotenv.config()

const redisClient = () => {
    if(process.env.REDIS_URL){
        console.log('Redis Connected Successfully');
        return process.env.REDIS_URL;
        
    }

    throw new Error('Redis Connection failed')
}

export const redis = new Redis(redisClient())
