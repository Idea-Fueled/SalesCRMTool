import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL,
                "https://sales-crm-ui-qxyy.vercel.app",
                "http://localhost:5173"
            ].filter(Boolean),
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("join", (data) => {
            const { userId, role, managerId } = data;

            // Join personal room
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined personal room`);

            // Join team room if manager or team member
            if (role === "sales_manager") {
                socket.join(`team_${userId}`);
                console.log(`Manager ${userId} joined their team room`);
            } else if (role === "sales_rep" && managerId) {
                socket.join(`team_${managerId}`);
                console.log(`Rep ${userId} joined team room of ${managerId}`);
            }

            // Join global room if admin
            if (role === "admin") {
                socket.join("global");
                console.log(`Admin ${userId} joined global room`);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Emit notification based on visibility rules
 * @param {Object} notification - The notification object from DB
 * @param {Object} data - Metadata for emission (role, managerId, etc)
 */
export const emitNotification = (notification) => {
    if (!io) return;

    // 1. Emit to global (Admins)
    io.to("global").emit("new_notification", notification);

    // 2. Emit to specific team (Manager + Team Members)
    if (notification.teamId) {
        io.to(`team_${notification.teamId}`).emit("new_notification", notification);
    }

    // 3. Emit to recipient specifically (if not already covered)
    io.to(`user_${notification.recipientId.toString()}`).emit("new_notification", notification);
};
