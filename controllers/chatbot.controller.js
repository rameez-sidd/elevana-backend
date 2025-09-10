import OpenAI from 'openai';
import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { userModel } from "../models/user.model.js";
import { redis } from '../utils/redis.js';

const openai = new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.GEMINI_API_KEY,
})

// gemini API
// const ai = new GoogleGenAI({});


export const chat = CatchAsyncError(async (req, res) => {
    const { message } = req.body;

    let reply = "Something went wrong."; // default fallback reply

    try {

        const response = await openai.chat.completions.create({
            model: "gemini-2.5-flash",
            messages: [
                { 
                    role: "system", 
                    content: "You are a chatbot.Your name is Elva.You are here to help the learners with their doubts. Reply like a normal assistant. You don't need to mention who you are everytime." },
                {
                    role: "user",
                    content: message,
                },
            ],
        })

        if (response && response?.choices) {
            reply = response.choices[0].message.content;
        }

    } catch (error) {
        console.error("Chatbot error:", error.message);
    }

    try {
        const user = await userModel.findById(req.user._id);

        user.chatHistory.push({
            doubt: message,
            reply,
        });

        await user.save();
        await redis.set(user._id.toString(), JSON.stringify(user));

        res.status(200).json({
            success: true,
            reply,
            user,
        });

    } catch (dbError) {
        console.error("User save/cache error:", dbError.message);
        res.status(200).json({
            success: false,
            reply: "Something went wrong while saving your chat.",
        });
    }
});

