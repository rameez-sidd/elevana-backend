import express from "express";
import { chat } from "../controllers/chatbot.controller.js";
import { updateAccessToken } from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/auth.js";

const chatbotRouter = express.Router();

chatbotRouter.post('/chat', updateAccessToken, isAuthenticated, chat)

export default chatbotRouter;