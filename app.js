import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import { ErrorMiddleware } from "./middlewares/error.js"
import userRouter from "./routes/user.routes.js"
import courseRouter from "./routes/course.routes.js"
import orderRouter from "./routes/order.routes.js"
import notificationRouter from "./routes/notification.routes.js"
import analyticsRouter from "./routes/analytics.routes.js"
import layoutRouter from "./routes/layout.routes.js"
import fileUpload from "express-fileupload"
import chatbotRouter from "./routes/chatbot.routes.js"
dotenv.config();


export const app = express();

// body parser
app.use(express.json({limit: "50mb"}));

// cookie-parser
app.use(cookieParser());

// file upload middleware
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

// cors
const corsOptions = {
    origin: [process.env.CLIENT_URL],
    credentials: true
}
app.use(cors(corsOptions))


// routes
app.use('/api/v1', userRouter)
app.use('/api/v1', courseRouter)
app.use('/api/v1', orderRouter)
app.use('/api/v1', notificationRouter)
app.use('/api/v1', analyticsRouter)
app.use('/api/v1', layoutRouter)
app.use('/api/v1', chatbotRouter)

app.get('/test', (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "API is working"
    })
})

app.all('*', (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
})

app.use(ErrorMiddleware)