import { userModel } from "../models/user.model.js";
import { courseModel } from "../models/course.model.js";

import { redis } from "../utils/redis.js"

const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};


// get user by id
export const getUserById = async (id, res) => {
    const userJson = await redis.get(id)

    if(userJson){
        const user = JSON.parse(userJson)
        res.status(201).json({
            success: true,
            user,
        })
    }
    
}

// get all users
export const getAllUsersService = async(res, adminId) => {
    // Get all courses created by the admin
    const courses = await populateCreator(courseModel.find({ createdBy: adminId }).select('_id purchasedBy'));
    
    // Get unique user IDs from purchasedBy arrays
    const uniqueUserIds = [...new Set(courses.flatMap(course => course.purchasedBy))];

    // Get users who have purchased the courses
    const users = await userModel.find({ _id: { $in: uniqueUserIds } }).sort({createdAt: -1});

    // Map users with their purchased courses (only from this admin)
    const usersWithCourses = await Promise.all(users.map(async (user) => {
        // Get courses purchased by this user that were created by this admin
        const purchasedCourses = await populateCreator(courseModel.find({ 
            createdBy: adminId,
            purchasedBy: user._id
        }).select('name price thumbnail'));

        // Create a new user object without the courses field
        const userWithoutCourses = { ...user.toObject() };
        delete userWithoutCourses.courses;

        return {
            ...userWithoutCourses,
            purchasedCourses
        };
    }));

    res.status(200).json({
        success: true,
        users: usersWithCourses,
    });
}

// update user role
export const updateUserRoleService = async(res, id, role) => {
    const user = await userModel.findByIdAndUpdate(id, {role}, {new: true})
    
    res.status(201).json({
        success: true,
        user,
    })
}