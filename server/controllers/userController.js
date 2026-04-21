import mongoose from "mongoose";
import User from "../models/userSchema.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/authToken.js";
import { getCookieOptions } from "../utils/cookieOptions.js";
import { comparePassword as verifyPassword, hashedPassword as generateHash } from "../utils/hashPassword.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import { Deal } from "../models/dealSchema.js";
import { logAction } from "../utils/auditLogger.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { getIO } from "../utils/socket.js";
import { notifyReassignment, sendTieredNotification } from "../services/notificationService.js";
import { uploadToCloudinary } from "../middlewares/uploadMiddleware.js";

const formatRoleName = (role) => {
    if (role === "sales_manager") return "Sales Manager";
    if (role === "sales_rep") return "Sales Representative";
    if (role === "admin") return "Admin";
    return role?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const registerUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role, managerId, phoneNumber, address } = req.body;
        let profilePicture = null;
        if (req.file) {
            const uploadRes = await uploadToCloudinary(req.file, "user_profiles");
            profilePicture = uploadRes.url;
        }

        // Validation: password is NOT required if being created by an authorized user (invitation flow)
        let isInvitation = !!req.user;

        // If not authenticated via middleware, check cookie manually for invitation flow fallback
        if (!isInvitation && req.cookies?.token) {
            try {
                const decoded = (await import("jsonwebtoken")).default.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                const requester = await User.findById(decoded.id);
                if (requester && (requester.role === "admin" || requester.role === "sales_manager")) {
                    isInvitation = true;
                    req.user = requester; // Populate for audit logger
                }
            } catch (e) { /* ignore */ }
        }

        const trimmedEmail = email?.trim().toLowerCase();
        const trimmedFirstName = firstName?.trim();
        const trimmedLastName = lastName?.trim();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !role) {
            return res.status(400).json({
                message: "All required fields (First Name, Last Name, Email, Role) must be filled!"
            })
        }

        if (!isInvitation && !password) {
            return res.status(400).json({
                message: "Password is required for self-registration!"
            })
        }

        const existingUser = await User.findOne({ email: trimmedEmail })
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists!"
            })
        }

        let user;
        let message = ""; // Declare message here so it's accessible in the background send

        if (isInvitation && !password) {
            // Invitation Flow: No password provided by the creator
            const invitationToken = crypto.randomBytes(32).toString("hex");
            const invitationExpiry = Date.now() + 3600000; // 1 hour

            user = await User.create({
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                role,
                managerId: role === "sales_rep" ? (managerId || null) : null,
                isSetupComplete: false,
                invitationToken,
                invitationExpiry,
                phoneNumber,
                address,
                profilePicture
            });

            // Construct invitation link
            const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
            const logoUrl = `${frontendUrl}/Logo.png`;
            const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;

            message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                    </div>
                    <h2 style="color: #e11d48; text-align: center;">Welcome to mbdConsulting</h2>
                    <p>Hello ${firstName},</p>
                    <p>An account has been created for you. Please click the button below to set up your password and access your dashboard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Account</a>
                    </div>
                    <p>This link is valid for 1 hour. If it expires, contact your administrator to resend the invite.</p>
                    <p>Or copy and paste this link:</p>
                    <p style="word-break: break-all; color: #64748b; font-size: 14px;">${setupUrl}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                </div>
            `;

        } else {
            // Self-Registration flow OR Admin-created with direct password
            const hashedPass = await generateHash(password)
            user = await User.create({
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                password: hashedPass,
                role,
                managerId: isInvitation && role === "sales_rep" ? (managerId || null) : null,
                isSetupComplete: true,
                phoneNumber,
                address,
                profilePicture
            })

            // If it's an invite with a password, we still want to notify them they have an account
            if (isInvitation) {
                const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
                const logoUrl = `${frontendUrl}/Logo.png`;
                message = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                        </div>
                        <h2 style="color: #e11d48; text-align: center;">Welcome to mbdConsulting</h2>
                        <p>Hello ${firstName},</p>
                        <p>An account has been created for you by your administrator.</p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 13px;">Login Credentials:</p>
                            <p style="margin: 5px 0; font-family: monospace;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 5px 0; font-family: monospace;"><strong>Password:</strong> ${password}</p>
                        </div>
                        <p>You can now log in to your dashboard using the button below.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${frontendUrl}/login" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                    </div>
                `;
            }

            if (!isInvitation) {
                const token = await generateToken(user._id, user.role);
                res.cookie("token", token, getCookieOptions())
            }
        }

        res.status(201).json({
            message: isInvitation ? "Invitation sent successfully!" : "User registered successfully!",
            data: {
                id: user._id,
                email: user.email,
                role: user.role,
                pendingSetup: !user.isSetupComplete
            }
        })

        if (isInvitation) {
            try {
                console.log(`[registerUser] ATTEMPTING email send to: ${user.email} (Flow: ${user.isSetupComplete ? 'Welcome' : 'Invitation'})`);
                const subject = user.isSetupComplete ? "Welcome to mbdConsulting" : "Account Setup Invitation";
                await sendEmail(user.email, subject, message);
                console.log(`[registerUser] SUCCESS: Email sent to: ${user.email}`);
            } catch (err) {
                console.error("❌ [registerUser] FAILURE: Email Delivery failed but user was created:", err.message);
            }
        }

        // Log registration
        await logAction({
            entityType: "User",
            entityId: user._id,
            action: "CREATE",
            performedBy: req.user?.id || user._id,
            details: { message: isInvitation ? `User invited: ${user.email}` : `New user registered: ${user.email}`, email: user.email },
            req
        });

        // Tiered Notification for User Creation
        await sendTieredNotification({
            actorId: req.user?._id || user._id,
            ownerId: user._id,
            entityId: user._id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "CREATE",
            customMessage: isInvitation 
                ? `New user account created for ${user.firstName} ${user.lastName} (${formatRoleName(user.role)}) by ${req.user?.firstName}.`
                : `New user self-registered: ${user.firstName} ${user.lastName} (${formatRoleName(user.role)}).`
        });
        return;

    } catch (error) {
        console.error("❌ Registration Error:", error);
        return res.status(500).json({
            message: error.message || "Server error"
        })
    }
}

export const loginUser = async (req, res, next) => {
    try {

        const { email, password } = req.body;

        if (!email.trim() || !password) {
            return res.status(400).json({
                message: "All required fields must be filled!"
            })
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password")

        if (!user) {
            return res.status(404).json({
                message: "User does not exist!"
            })
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account has been deactivated. Please contact your administrator.",
                code: "ACCOUNT_DEACTIVATED"
            })
        }

        if (!user.password) {
            return res.status(401).json({
                message: "Account setup pending. Check your email or use 'Forgot Password'.",
                code: "PASSWORD_NOT_SET"
            })
        }

        const isPasswordValid = await verifyPassword(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials!"
            })
        }

        const token = await generateToken(user._id, user.role)

        res.cookie("token", token, getCookieOptions())

        const lastLogin = new Date();
        const updatedUser = await User.findByIdAndUpdate(user._id, { lastLogin, isSetupComplete: true }, { new: true })
            .populate("managerId", "firstName lastName email");

        res.status(200).json({
            message: "User logged in successfully!",
            data: {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                managerId: updatedUser.managerId,
                isActive: updatedUser.isActive,
                lastLogin: updatedUser.lastLogin,
                createdAt: updatedUser.createdAt,
                profilePicture: updatedUser.profilePicture,
                phoneNumber: updatedUser.phoneNumber,
                address: updatedUser.address
            }
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate("managerId", "firstName lastName email");
        if (!user) {
            return res.status(404).json({
                message: "User does not exists!"
            })
        }

        res.status(200).json({
            message: "User profile fetched successfully!",
            data: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                managerId: user.managerId,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                profilePicture: user.profilePicture,
                phoneNumber: user.phoneNumber,
                address: user.address
            }
        })
    } catch (error) {
        return res.status(500).json({
            mesage: error.message || "Server error!"
        })
    }
}

export const adminTest = async (req, res, next) => {
    try {
        return res.status(200).json({
            message: "Admin test successfull!"
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate("managerId", "firstName lastName email").select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }
        res.status(200).json({ data: user });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const getTeamUsers = async (req, res, next) => {
    try {

        const id = req.user._id;
        const role = req.user.role;

        if (role === "admin") {
            const users = await User.find({ isDeleted: { $ne: true } }).populate("managerId", "firstName lastName email").select("-password").sort({ createdAt: -1 })
            return res.json(users)
        }

        if (role === "sales_manager") {
            const users = await User.find({ $or: [{ _id: id }, { managerId: id }], isDeleted: { $ne: true } }).populate("managerId", "firstName lastName email").select("-password").sort({ createdAt: -1 })
            return res.json(users)
        }

        if (role === "sales_rep") {
            const users = await User.find({ _id: id, isDeleted: { $ne: true } }).populate("managerId", "firstName lastName email").select("-password");
            return res.json(users)
        }

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const softDeleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newOwnerId } = req.body; // optional
        const { role: currentUserRole, id: currentUserId } = req.user;

        if (currentUserRole !== "admin") {
            return res.status(403).json({ message: "Only admins can delete users!" });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found!" });
        if (user.role === "admin") return res.status(403).json({ message: "Cannot delete an admin account!" });

        let newOwner = null;
        if (newOwnerId) {
            newOwner = await User.findById(newOwnerId);
            if (!newOwner) return res.status(404).json({ message: "New owner not found!" });
            await Company.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            await Contact.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            await Deal.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            // Reassign subordinates if user is a manager
            await User.updateMany({ managerId: id }, { managerId: newOwnerId });
        } else {
            // If no new owner, clear managerId for subordinates
            await User.updateMany({ managerId: id }, { managerId: null });
        }

        user.isDeleted = true;
        user.isActive = false;
        user.deletedAt = new Date();
        await user.save();

        const responseMsg = newOwner
            ? `User "${user.firstName} ${user.lastName}" soft-deleted. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}.`
            : `User "${user.firstName} ${user.lastName}" soft-deleted. Records kept with original owner.`;

        res.status(200).json({ message: responseMsg });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id,
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "DELETE",
            customMessage: newOwner 
                ? `User "${user.firstName} ${user.lastName}" soft-deleted. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}.`
                : `User "${user.firstName} ${user.lastName}" soft-deleted.`
        });

        await logAction({
            entityType: "User",
            entityId: id,
            action: "DELETE",
            performedBy: currentUserId,
            targetUserId: newOwnerId && newOwnerId.toString() !== currentUserId.toString() ? newOwnerId : id,
            details: newOwnerId
                ? { message: `User "${user.firstName} ${user.lastName}" soft-deleted. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}`, targetName: `${user.firstName} ${user.lastName}`, reassignedToName: `${newOwner.firstName} ${newOwner.lastName}` }
                : { message: `User "${user.firstName} ${user.lastName}" soft-deleted. Records kept with original owner.`, targetName: `${user.firstName} ${user.lastName}`, reassignment: "skipped" },
            req
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const getDeletedUsers = async (req, res, next) => {
    try {
        const { role } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });
        const users = await User.find({ isDeleted: true }).populate("managerId", "firstName lastName email").select("-password").sort({ deletedAt: -1 });
        res.status(200).json({ data: users });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const restoreUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, id: currentUserId } = req.user;
        if (role !== "admin") return res.status(403).json({ message: "Access denied!" });

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        // Restoration Window Check (30 days)
        if (user.deletedAt) {
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const timePassed = Date.now() - new Date(user.deletedAt).getTime();
            if (timePassed > thirtyDaysInMs) {
                return res.status(400).json({ 
                    message: "Restoration window has expired. Users can only be restored within 30 days of deletion." 
                });
            }
        }

        user.isDeleted = false;
        user.deletedAt = null;
        user.isActive = true;
        await user.save();

        res.status(200).json({ message: `${user.firstName} ${user.lastName} restored successfully!` });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id,
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "ACTIVATE",
            customMessage: `User "${user.firstName} ${user.lastName}" restored from trash by ${req.user.firstName}.`
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const updateUser = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { firstName, lastName, email, role, managerId, phoneNumber, address } = req.body;
        const { role: currentUserRole, id: currentUserId } = req.user;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        if (currentUserRole !== "admin") {
            if (currentUserId !== id) {
                return res.status(403).json({
                    message: "Access denied!"
                })
            }

            if (role) {
                return res.status(403).json({
                    message: "You cannot change role!"
                })
            }
        }

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
        user.address = address !== undefined ? address : user.address;

        if (req.body.removeProfilePicture === "true" || req.body.removeProfilePicture === true) {
            user.profilePicture = null;
        } else if (req.file) {
            const uploadRes = await uploadToCloudinary(req.file, "user_profiles");
            user.profilePicture = uploadRes.url;
        }

        if (currentUserRole === "admin") {
            user.role = role || user.role;
            // Only sales_rep has a managerId in this system
            if (user.role !== "sales_rep") {
                user.managerId = null;
            } else if (managerId !== undefined) {
                user.managerId = managerId || null;
            }
        }

        await user.save();

        res.status(200).json({
            message: "User update successfull!",
            data: user
        })

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id,
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "UPDATE",
            customMessage: `User details updated for ${user.firstName} ${user.lastName} by ${req.user.firstName}.`
        });
        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const deactivateUser = async (req, res, next) => {
    try {
        const { id } = req.params; // user to deactivate
        let { newOwnerId } = req.body; // optional - if omitted, records stay with the user
        if (newOwnerId && newOwnerId.trim() === "") newOwnerId = null;

        const { role: currentUserRole, id: currentUserId } = req.user;
        console.log("[deactivateUser] req.body:", req.body, "| newOwnerId:", newOwnerId);

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (currentUserRole === "sales_rep") {
            return res.status(403).json({ message: "Access denied!" });
        }

        if (currentUserRole === "sales_manager") {
            const teamUsers = await User.find({ managerId: currentUserId }).select("_id");
            const teamIds = teamUsers.map(u => u._id.toString());
            // When reassigning, newOwner must be within the team or the manager themselves
            if (!teamIds.includes(id)) {
                return res.status(403).json({
                    message: "You can only deactivate members within your team!"
                });
            }
            if (newOwnerId && !teamIds.includes(newOwnerId) && newOwnerId !== currentUserId) {
                return res.status(403).json({
                    message: "You can only reassign to someone within your team!"
                });
            }
        }

        let newOwner = null;

        // Only reassign if newOwnerId is provided
        if (newOwnerId) {
            newOwner = await User.findById(newOwnerId);
            if (!newOwner) {
                return res.status(404).json({ message: "New owner not found!" });
            }
            // Perform bulk reassignment
            await Company.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            await Contact.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            await Deal.updateMany({ ownerId: id }, { ownerId: newOwnerId });
            // Reassign subordinates if user is a manager
            await User.updateMany({ managerId: id }, { managerId: newOwnerId });
        } else {
            // If no new owner, clear managerId for subordinates
            await User.updateMany({ managerId: id }, { managerId: null });
        }

        // Deactivate user
        user.isActive = false;
        await user.save();

        // Emit real-time force logout to the deactivated user's socket room
        try {
            const io = getIO();
            io.to(`user_${id}`).emit("force_logout", {
                message: "Your account has been deactivated by an administrator."
            });
        } catch (socketErr) {
            console.warn("[deactivateUser] Socket emit failed (non-critical):", socketErr.message);
        }

        const responseMsg = newOwner
            ? `User "${user.firstName} ${user.lastName}" deactivated. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}.`
            : `User "${user.firstName} ${user.lastName}" deactivated. Records kept with original owner.`;

        res.status(200).json({ message: responseMsg });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id,
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "DEACTIVATE",
            customMessage: newOwner 
                ? `User "${user.firstName} ${user.lastName}" deactivated. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}.`
                : `User "${user.firstName} ${user.lastName}" deactivated.`
        });

        // Log the deactivation
        await logAction({
            entityType: "User",
            entityId: id,
            action: "DEACTIVATE",
            performedBy: currentUserId,
            targetUserId: newOwnerId && newOwnerId.toString() !== currentUserId.toString() ? newOwnerId : id,
            details: newOwnerId
                ? {
                    message: `User "${user.firstName} ${user.lastName}" deactivated. Records reassigned to ${newOwner.firstName} ${newOwner.lastName}`,
                    newOwnerId,
                    targetName: `${user.firstName} ${user.lastName}`,
                    reassignedToName: `${newOwner.firstName} ${newOwner.lastName}`
                }
                : {
                    message: `User "${user.firstName} ${user.lastName}" deactivated. Records kept with original owner.`,
                    targetName: `${user.firstName} ${user.lastName}`,
                    reassignment: "skipped"
                },
            req
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
}

export const activateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role: currentUserRole, id: currentUserId } = req.user;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        if (currentUserRole === "sales_rep") {
            return res.status(403).json({
                message: "Access denied!"
            })
        }

        if (currentUserRole === "sales_manager") {
            const teamUsers = await User.find({ managerId: currentUserId }).select("_id");
            const teamIds = teamUsers.map(u => u._id.toString());
            if (!teamIds.includes(id)) {
                return res.status(403).json({
                    message: "You can only activate your team members!"
                })
            }
        }

        user.isActive = true;
        await user.save();

        res.status(200).json({
            message: "User activated successfully!"
        })

        // Log the activation
        await logAction({
            entityType: "User",
            entityId: id,
            action: "ACTIVATE",
            performedBy: currentUserId,
            req
        });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id,
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "ACTIVATE"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const adminResetPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const { role: currentUserRole, id: currentUserId } = req.user;

        if (currentUserRole !== "admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "A valid new password (min 6 characters) is required." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const hashedPass = await generateHash(newPassword);
        user.password = hashedPass;
        user.isSetupComplete = true;
        user.invitationToken = null;
        user.invitationExpiry = null;
        user.isActive = true;
        await user.save();

        res.status(200).json({ message: "User password reset successfully." });

        // Log the action
        await logAction({
            entityType: "User",
            entityId: id,
            action: "UPDATE",
            performedBy: currentUserId,
            details: { message: `Admin reset password for user: ${user.email}` },
            req
        });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id, // User whose password was reset
            entityId: id,
            entityType: "User",
            entityName: `${user.firstName} ${user.lastName}`,
            action: "UPDATE",
            customMessage: `Password for user ${user.email} was reset by ${req.user.firstName}.`
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const changePassword = async (req, res, next) => {
    try {

        const { oldPassword, newPassword } = req.body;
        const { id } = req.user;

        if (!oldPassword || !newPassword) {
            return res.status(403).json({
                message: "Both old and new passwords are required!"
            })
        }

        const user = await User.findById(id).select("+password");
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({
                message: "Old password is incorrect!"
            })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "New password must be at least 6 characters long!"
            })
        }

        const hashedPass = await generateHash(newPassword);
        user.password = hashedPass;
        await user.save();

        return res.status(200).json({
            message: "Password updated successfully!"
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const bulkReassignRecords = async (req, res, next) => {
    try {

        const { id } = req.params; //old user
        const { newOwnerId } = req.body;
        const { role, id: currentUserId } = req.user;

        if (!newOwnerId) {
            return res.status(403).json({
                message: "New owner ID is required!"
            })
        }

        const oldUser = await User.findById(id);
        const newUser = await User.findById(newOwnerId);

        if (!oldUser || !newUser) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        if (role === "sales_rep") {
            return res.status(403).json({
                message: "Access denied!"
            })
        }

        if (role === "sales_manager") {
            const teamUsers = await User.find({ $or: [{ _id: currentUserId }, { managerId: currentUserId }] }).select("_id")

            const teamIds = teamUsers.map(u => u._id.toString());

            if (!teamIds.includes(id) || !teamIds.includes(newOwnerId)) {
                return res.status(403).json({
                    message: "Both users must belong to your team!"
                })
            }
        }

        // Use ObjectIds for consistency in bulk operations
        const oldOid = new mongoose.Types.ObjectId(id);
        const newOid = new mongoose.Types.ObjectId(newOwnerId);

        await Company.updateMany({ ownerId: oldOid }, { ownerId: newOid });
        await Contact.updateMany(
            { ownerId: oldOid },
            { ownerId: newOid }
        );
        await Deal.updateMany(
            { ownerId: oldOid },
            { ownerId: newOid }
        );

        // Reassign subordinates ONLY if the new owner is a Manager or Admin
        if (newUser.role === "sales_manager" || newUser.role === "admin") {
            await User.updateMany({ managerId: oldOid }, { managerId: newOid });
        }

        // Log the bulk reassignment
        await logAction({
            entityType: "User",
            entityId: id,
            action: "REASSIGN",
            performedBy: currentUserId,
            details: {
                message: `Records reassigned from ${oldUser.firstName} ${oldUser.lastName} to ${newUser.firstName} ${newUser.lastName}`,
                fromUserId: id,
                toUserId: newOwnerId,
                fromUserName: `${oldUser.firstName} ${oldUser.lastName}`,
                toUserName: `${newUser.firstName} ${newUser.lastName}`
            },
            req
        });

        res.status(200).json({
            message: "All records reassigned successfully!"
        });

        // Tiered Notification (Admins + Manager)
        await sendTieredNotification({
            actorId: currentUserId,
            ownerId: id, // Original owner being reassigned
            entityId: id,
            entityType: "User",
            entityName: `${oldUser.firstName} ${oldUser.lastName}`,
            action: "REASSIGN",
            customMessage: `Records reassigned from ${oldUser.firstName} ${oldUser.lastName} to ${newUser.firstName} ${newUser.lastName} by ${req.user.firstName}.`
        });

        return;

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}
export const logoutUser = (req, res) => {
    res.clearCookie("token", getCookieOptions(0));
    return res.status(200).json({ message: "Logged out successfully!" });
}


export const forgotPassword = async (req, res, next) => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required!" });
        
        email = email.trim().toLowerCase();
        console.log(`[forgotPassword] Request for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour

        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
        const logoUrl = `${frontendUrl}/Logo.png`;
        console.log("Using FRONTEND_URL for reset link:", frontendUrl);
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                </div>
                <h2 style="color: #e11d48; text-align: center;">Password Reset Request</h2>
                <p>Hello ${user.firstName},</p>
                <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #64748b; font-size: 14px;">${resetUrl}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
            </div>
        `;

        console.log("Constructed Reset URL:", resetUrl);

        // Respond immediately so the UI never gets stuck
        res.status(200).json({ message: "Reset link sent to your email!" });

        // Fire-and-forget: send email in the background
        sendEmail(user.email, "Password Reset Request", message)
            .then(() => {
                console.log(`[forgotPassword] ✅ Email sent to ${user.email}`);
            })
            .catch(err => {
                console.error(`[forgotPassword] ❌ Background email failed for ${user.email}:`, err.message);
            });

        return;
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}

export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired token!"
            });
        }

        user.password = await generateHash(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        user.isSetupComplete = true;

        await user.save();

        res.status(200).json({ message: "Password reset successful! You can now login." });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        });
    }
}

// ─── Invitation Flow Controllers ────────────────────────────────

export const setupPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: "Token and password are required." });
        }

        const user = await User.findOne({
            invitationToken: token,
            invitationExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired invitation link." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        user.password = await generateHash(password);
        user.invitationToken = null;
        user.invitationExpiry = null;
        user.isSetupComplete = true;
        user.isActive = true;
        await user.save();

        res.status(200).json({ message: "Account setup successful! You can now login." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error during account setup." });
    }
};

export const resendInvitation = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.lastLogin) return res.status(400).json({ message: "User has already logged in and activated their account." });

        const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
        const logoUrl = `${frontendUrl}/Logo.png`;
        let message = "";
        let subject = "";

        if (!user.isSetupComplete) {
            const invitationToken = crypto.randomBytes(32).toString("hex");
            const invitationExpiry = Date.now() + 3600000; // 1 hour

            user.invitationToken = invitationToken;
            user.invitationExpiry = invitationExpiry;
            await user.save();

            const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;
            subject = "Complete Your Account Setup";
            message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                    </div>
                    <h2 style="color: #e11d48; text-align: center;">Account Setup Invitation</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>An account invitation link has been generated for you. Please click below to set your password.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Account</a>
                    </div>
                    <p>This link is valid for 1 hour.</p>
                    <p style="word-break: break-all; color: #64748b; font-size: 14px;">${setupUrl}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                </div>
            `;
        } else {
            // Already has a password but hasn't logged in
            subject = "Welcome to mbdConsulting";
            message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                    </div>
                    <h2 style="color: #e11d48; text-align: center;">Welcome to mbdConsulting</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>This is a reminder that an account has been created for you by your administrator.</p>
                    <p>You can log in to your dashboard using the button below. If you've forgotten your password, please use the "Forgot Password" link on the login page.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${frontendUrl}/login" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                </div>
            `;
        }

        await sendEmail(user.email, subject, message);
        res.status(200).json({ message: "Reminder email sent successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error resending invitation." });
    }
};

export const resendVerificationByEmail = async (req, res) => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        email = email.trim().toLowerCase();
        console.log(`[resendVerificationByEmail] Request received for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.warn(`[resendVerificationByEmail] No user found for: ${email}`);
            return res.status(404).json({ message: "No account found with this email." });
        }

        const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
        const logoUrl = `${frontendUrl}/Logo.png`;
        let subject = "";
        let message = "";

        if (!user.isSetupComplete && !user.lastLogin) {
            console.log(`[resendVerificationByEmail] Path: Invitation Flow for ${email}`);
            // Flow A: Resend Account Setup Invitation
            const invitationToken = crypto.randomBytes(32).toString("hex");
            const invitationExpiry = Date.now() + 3600000; // 1 hour

            user.invitationToken = invitationToken;
            user.invitationExpiry = invitationExpiry;
            await user.save();

            const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;
            subject = "Complete Your Account Setup (Resend)";
            message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                    </div>
                    <h2 style="color: #e11d48; text-align: center;">Account Setup Invitation</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>As requested, here is your account invitation link. Please click below to set your password and complete your registration.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Account</a>
                    </div>
                    <p>This link is valid for 1 hour.</p>
                    <p style="word-break: break-all; color: #64748b; font-size: 14px;">${setupUrl}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                </div>
            `;
        } else {
            console.log(`[resendVerificationByEmail] Path: Password Reset Flow for ${email}`);
            // Flow B: Resend Password Reset Link (Account is already verified/setup)
            const resetToken = crypto.randomBytes(32).toString("hex");
            const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

            user.resetPasswordToken = hashedToken;
            user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
            await user.save();

            const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
            subject = "Password Reset Request (Resend)";
            message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="mbdConsulting Logo" style="height: 50px; width: auto;" />
                    </div>
                    <h2 style="color: #e11d48; text-align: center;">Password Reset Request</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>As requested, here is the link to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>This link is valid for 1 hour.</p>
                    <p style="word-break: break-all; color: #64748b; font-size: 14px;">${resetUrl}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} mbdConsulting. All rights reserved.</p>
                </div>
            `;
        }

        console.log(`[resendVerificationByEmail] Dispatching email to: ${user.email} with subject: ${subject}`);
        
        // Return success immediately to the client to avoid UI hangs
        res.status(200).json({ message: "Link resent successfully! Please check your email." });

        // Background the email delivery without 'await'
        sendEmail(user.email, subject, message)
            .then(() => {
                console.log(`[resendVerificationByEmail] SUCCESS: Email sent to ${user.email} (Background)`);
            })
            .catch(err => {
                console.error(`[resendVerificationByEmail] FAILURE: Background Send for ${user.email}:`, err.message);
            });

        return;
    } catch (error) {
        console.error("❌ Error resending link:", error);
        res.status(500).json({ message: error.message || "Server error resending link." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { id } = req.user;
        const { firstName, lastName, phoneNumber, address } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // Update only basic profile details
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
        user.address = address !== undefined ? address : user.address;

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully!",
            data: user
        });

        // Log the action
        await logAction({
            userId: id,
            action: "UPDATE",
            entityType: "User",
            entityId: id,
            entityName: `${user.firstName} ${user.lastName}`,
            details: "User updated their own basic profile details."
        });

    } catch (error) {
        console.error("❌ Error updating profile:", error);
        res.status(500).json({ message: error.message || "Server error updating profile." });
    }
};

export const uploadProfilePicture = async (req, res) => {
    try {
        const { id } = req.user;
        const file = req.file;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (req.body.removeProfilePicture === "true" || req.body.removeProfilePicture === true) {
            user.profilePicture = null; 
            await user.save();
            return res.status(200).json({
                message: "Profile picture removed successfully!",
                data: { profilePicture: null }
            });
        }

        if (!file) {
            return res.status(400).json({ message: "No image file provided." });
        }

        // Use our existing Cloudinary upload service since Multer is using memoryStorage
        const uploadResult = await uploadToCloudinary(file, "profiles");

        user.profilePicture = uploadResult.url; 
        await user.save();

        res.status(200).json({
            message: "Profile picture updated successfully!",
            data: {
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error("❌ Error uploading profile picture:", error);
        res.status(500).json({ message: error.message || "Server error uploading picture." });
    }
};