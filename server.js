import { app } from "./app.js";
import dotenv from "dotenv"
import connectDB from "./utils/db.js";
import { v2 as cloudinary } from "cloudinary"
import http from 'http'
import { initSocketServer } from "./socketServer.js";

dotenv.config();

const server = http.createServer(app)

// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY
})

initSocketServer(server)

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    connectDB();
    console.log(`Server running at port ${PORT}`);
})


