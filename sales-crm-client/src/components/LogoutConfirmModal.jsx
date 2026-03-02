import React from "react";
import { LogOut } from "lucide-react";

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: "rgba(15,15,25,0.45)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <LogOut size={26} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Log Out?</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    Are you sure you want to log out? You will need to sign in again to access your account.
                </p>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
                    >
                        Yes, Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
