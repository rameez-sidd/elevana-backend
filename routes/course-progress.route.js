import express from "express"
import { authorizeRoles, isAuthenticated } from "../middlewares/auth.js";
import { updateAccessToken } from "../controllers/user.controller.js";
import { getCourseProgress, markAsCompleted, markAsIncompleted, updateLectureProgress } from "../controllers/course-progress.controller.js";

const courseProgressRouter = express.Router();

courseProgressRouter.get('/:courseId', updateAccessToken, isAuthenticated, getCourseProgress)
courseProgressRouter.post('/:courseId/lecture/:lectureId/view', updateAccessToken, isAuthenticated, updateLectureProgress)
courseProgressRouter.post('/:courseId/complete', updateAccessToken, isAuthenticated, markAsCompleted)
courseProgressRouter.post('/:courseId/incomplete', updateAccessToken, isAuthenticated, markAsIncompleted)

export default courseProgressRouter
