import {Server as SocketIOServer} from "socket.io"

export const initSocketServer = (server) => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CLIENT_URL, // your frontend URL
            methods: ["GET", "POST"]
        }
    })

    // Store admin socket mappings
    const adminSockets = new Map();

    io.on("connection", (socket) => {
        console.log('A user connected')

        // When an admin connects, store their socket with their admin ID
        socket.on("adminConnect", (adminId) => {
            adminSockets.set(adminId, socket.id);
            console.log(`Admin ${adminId} connected with socket ${socket.id}`);
        });

        // Listen for 'notification' event from the frontend
        socket.on("notification", (data) => {
            const { adminId, notification } = data;
            
            // If adminId is provided, send notification only to that admin
            if (adminId) {
                const adminSocketId = adminSockets.get(adminId);
                if (adminSocketId) {
                    io.to(adminSocketId).emit("newNotification", data);
                    console.log(`Notification sent to admin ${adminId}`);
                }
            } else {
                // Fallback to broadcasting to all if no adminId provided
                io.emit("newNotification", data);
            }
        });

        socket.on("disconnect", () => {
            // Remove admin from mapping when they disconnect
            for (const [adminId, socketId] of adminSockets.entries()) {
                if (socketId === socket.id) {
                    adminSockets.delete(adminId);
                    console.log(`Admin ${adminId} disconnected`);
                    break;
                }
            }
        });
    });
}