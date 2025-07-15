import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { orderModel } from "../models/order.model.js"
import { courseModel } from "../models/course.model.js"
import { userModel } from "../models/user.model.js"


const populateCreator = (query) => {
    return query.populate('createdBy', 'name email avatar');
};





// create new order
export const newOrder = CatchAsyncError(async (data, res, next) => {
    const order = await orderModel.create(data)
    const user = await userModel.findById(data.userId).select('-password')
    res.status(201).json({
        success: true,
        order,
        user
    })
})

 
// get all orders
export const getAllOrdersService = async(res, adminId) => {
    try {
        // First get all courses created by this admin
        const courses = await populateCreator(courseModel.find({ createdBy: adminId }).select('_id name price'));
        const courseIds = courses.map(course => course._id.toString());
        
        // Create a map of course details for quick lookup
        const courseMap = {};
        courses.forEach(course => {
            courseMap[course._id.toString()] = {
                name: course.name,
                price: course.price
            };
        });

        // Get all orders for these courses
        const orders = await orderModel.find({ 
            courseId: { $in: courseIds }
        }).sort({createdAt: -1});

        // Get unique user IDs from orders
        const userIds = [...new Set(orders.map(order => order.userId))];
        
        // Get user details
        const users = await userModel.find({ _id: { $in: userIds } }).select('name email');
        
        // Create a map of user details for quick lookup
        const userMap = {};
        users.forEach(user => {
            userMap[user._id.toString()] = {
                name: user.name,
                email: user.email
            };
        });

        // Combine all the data
        const ordersWithDetails = orders.map(order => ({
            _id: order._id,
            createdAt: order.createdAt,
            paymentInfo: order.paymentInfo,
            course: {
                _id: order.courseId,
                name: courseMap[order.courseId]?.name || 'Course not found',
                price: courseMap[order.courseId]?.price || 0
            },
            user: {
                _id: order.userId,
                name: userMap[order.userId]?.name || 'User not found',
                email: userMap[order.userId]?.email || 'Email not found'
            }
        }));

        res.status(200).json({
            success: true,
            orders: ordersWithDetails,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
