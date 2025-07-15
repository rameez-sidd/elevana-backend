import express from "express"
import { authorizeRoles, isAuthenticated } from "../middlewares/auth.js";
import { getNotifications, updateNotification } from "../controllers/notification.controller.js";
import { updateAccessToken } from "../controllers/user.controller.js";

const notificationRouter = express.Router();

notificationRouter.get('/get-all-notifications', updateAccessToken, isAuthenticated, authorizeRoles("admin"), getNotifications)
notificationRouter.put('/update-notification/:id', updateAccessToken, isAuthenticated, authorizeRoles("admin"), updateNotification)

export default notificationRouter
