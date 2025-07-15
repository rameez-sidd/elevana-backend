import express from "express"
import { authorizeRoles, isAuthenticated } from "../middlewares/auth.js";
import { addAnswer, addQuestion, addReplyToReview, addReview, deleteCourse, editCourse, getAllCourses, getAllCoursesAdmin, getCourseByUser, getCourseForEdit, getEnrolledCourses, getSingleCourse, uploadCourse, uploadVideo } from "../controllers/course.controller.js";
import { updateAccessToken } from "../controllers/user.controller.js"

const courseRouter = express.Router();

courseRouter.post('/create-course', updateAccessToken, isAuthenticated, authorizeRoles("admin"), uploadCourse)
courseRouter.put('/edit-course/:id', updateAccessToken, isAuthenticated, authorizeRoles("admin"), editCourse)
courseRouter.get('/get-course/:id', getSingleCourse)
courseRouter.get('/get-course-for-edit/:id', updateAccessToken, isAuthenticated, authorizeRoles("admin"), getCourseForEdit)
courseRouter.get('/get-courses', getAllCourses)
courseRouter.get('/get-course-content/:id', updateAccessToken, isAuthenticated, getCourseByUser)
courseRouter.put('/add-question', updateAccessToken, isAuthenticated, addQuestion)
courseRouter.put('/add-answer', updateAccessToken, isAuthenticated, addAnswer)
courseRouter.put('/add-review/:id', updateAccessToken, isAuthenticated, addReview)
courseRouter.put('/add-reply', updateAccessToken, isAuthenticated, authorizeRoles("admin"), addReplyToReview)
courseRouter.get('/get-all-courses', updateAccessToken, isAuthenticated, authorizeRoles("admin"), getAllCoursesAdmin)
courseRouter.delete('/delete-course/:id', updateAccessToken, isAuthenticated, authorizeRoles("admin"), deleteCourse)
courseRouter.post('/upload-video', uploadVideo);
courseRouter.get('/get-enrolled-courses', updateAccessToken, isAuthenticated, getEnrolledCourses)

export default courseRouter
