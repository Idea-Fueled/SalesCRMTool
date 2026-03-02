import User from "../models/userSchema.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/authToken.js";
import { comparePassword as verifyPassword, hashedPassword as generateHash } from "../utils/hashPassword.js";
import { Company } from "../models/companySchema.js";
import { Contact } from "../models/contactSchema.js";
import { Deal } from "../models/dealSchema.js";
import { logAction } from "../utils/auditLogger.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

export const registerUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role, managerId } = req.body;

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

        if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !role) {
            return res.status(400).json({
                message: "All required fields (First Name, Last Name, Email, Role) must be filled!"
            })
        }

        if (!isInvitation && !password) {
            return res.status(400).json({
                message: "Password is required for self-registration!"
            })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists!"
            })
        }

        let user;
        if (isInvitation) {
            // Invitation Flow: No password yet
            const invitationToken = crypto.randomBytes(32).toString("hex");
            const invitationExpiry = Date.now() + 3600000; // 1 hour

            user = await User.create({
                firstName,
                lastName,
                email,
                role,
                managerId: role === "sales_rep" ? managerId : null,
                isSetupComplete: false,
                invitationToken,
                invitationExpiry
            });

            // Construct invitation link
            const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
            const logoUrl = `${frontendUrl}/Logo.png`;
            const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;

            const message = `
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

            await sendEmail(email, "Account Setup Invitation", message);

        } else {
            // Self-Registration Flow (Standard)
            const hashedPass = await generateHash(password)
            user = await User.create({
                firstName,
                lastName,
                email,
                password: hashedPass,
                role,
                managerId: null, // Self-registered usually don't have manager assigned immediately
                isSetupComplete: true
            })

            const token = await generateToken(user._id, user.role);
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                partitioned: true,
                maxAge: 15 * 60 * 1000
            })
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

        // Log registration
        await logAction({
            entityType: "User",
            entityId: user._id,
            action: "CREATE",
            performedBy: req.user?.id || user._id,
            details: { message: isInvitation ? `User invited: ${user.email}` : `New user registered: ${user.email}`, email: user.email },
            req
        });
        return;

    } catch (error) {
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

        const isPasswordValid = await verifyPassword(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials!"
            })
        }

        const token = await generateToken(user._id, user.role)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            partitioned: true,
            maxAge: 15 * 60 * 1000
        })

        const lastLogin = new Date();
        await User.findByIdAndUpdate(user._id, { lastLogin });

        res.status(200).json({
            message: "User logged in successfully!",
            data: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                lastLogin
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
        const user = await User.findById(req.user.id);
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
                lastLogin: user.lastLogin
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

export const getTeamUsers = async (req, res, next) => {
    try {

        const id = req.user._id;
        const role = req.user.role;

        if (role === "admin") {
            const users = await User.find({ isDeleted: { $ne: true } }).populate("managerId", "firstName lastName").select("-password").sort({ createdAt: -1 })
            return res.json(users)
        }

        if (role === "sales_manager") {
            const users = await User.find({ $or: [{ _id: id }, { managerId: id }], isDeleted: { $ne: true } }).populate("managerId", "firstName lastName").select("-password").sort({ createdAt: -1 })
            return res.json(users)
        }

        if (role === "sales_rep") {
            const users = await User.find({ _id: id, isDeleted: { $ne: true } }).populate("managerId", "firstName lastName").select("-password");
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
        }

        user.isDeleted = true;
        user.isActive = false;
        user.deletedAt = new Date();
        await user.save();

        const msg = newOwnerId
            ? "User deleted and records reassigned successfully!"
            : "User deleted. Records kept under their ownership.";

        res.status(200).json({ message: msg });

        await logAction({
            entityType: "User",
            entityId: id,
            action: "DELETE",
            performedBy: currentUserId,
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
        const users = await User.find({ isDeleted: true }).populate("managerId", "firstName lastName").select("-password").sort({ deletedAt: -1 });
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

        user.isDeleted = false;
        user.deletedAt = null;
        user.isActive = true;
        await user.save();

        res.status(200).json({ message: `${user.firstName} ${user.lastName} restored successfully!` });

        await logAction({
            entityType: "User",
            entityId: id,
            action: "ACTIVATE",
            performedBy: currentUserId,
            details: { message: `User "${user.firstName} ${user.lastName}" restored from trash.`, targetName: `${user.firstName} ${user.lastName}` },
            req
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Server error!" });
    }
}

export const updateUser = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { firstName, lastName, email, role, managerId } = req.body;
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

        // Log update
        await logAction({
            entityType: "User",
            entityId: id,
            action: "UPDATE",
            performedBy: currentUserId,
            details: { newValues: req.body },
            req
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
        }

        // Deactivate user
        user.isActive = false;
        await user.save();

        const responseMsg = newOwnerId
            ? "User deactivated and records reassigned successfully!"
            : "User deactivated. Records kept under their ownership and will be accessible when reactivated.";

        res.status(200).json({ message: responseMsg });

        // Log the deactivation
        await logAction({
            entityType: "User",
            entityId: id,
            action: "DEACTIVATE",
            performedBy: currentUserId,
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

        await Company.updateMany({ ownerId: id }, { ownerId: newOwnerId });
        await Contact.updateMany(
            { ownerId: id },
            { ownerId: newOwnerId }
        );
        await Deal.updateMany(
            { ownerId: id },
            { ownerId: newOwnerId }
        );

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

        return res.status(200).json({
            message: "All records reassigned successfully!"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server error!"
        })
    }
}
export const logoutUser = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true
    });
    return res.status(200).json({ message: "Logged out successfully!" });
}


export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
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

        console.log("Triggering sendEmail...");
        await sendEmail(user.email, "Password Reset Request", message);
        console.log("sendEmail completed successfully.");

        res.status(200).json({ message: "Reset link sent to your email!" });
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
        if (user.isSetupComplete) return res.status(400).json({ message: "User has already completed setup." });

        const invitationToken = crypto.randomBytes(32).toString("hex");
        const invitationExpiry = Date.now() + 3600000; // 1 hour

        user.invitationToken = invitationToken;
        user.invitationExpiry = invitationExpiry;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
        const logoUrl = `${frontendUrl}/Logo.png`;
        const setupUrl = `${frontendUrl}/setup-password?token=${invitationToken}`;

        const message = `
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

        await sendEmail(user.email, "Complete Your Account Setup", message);

        res.status(200).json({ message: "Invitation link resent successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error resending invitation." });
    }
};