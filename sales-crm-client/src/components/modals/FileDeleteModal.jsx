import React from "react";

export default function FileDeleteModal({ isOpen, onClose, onConfirm, message, title }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1.5px] animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[340px] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-7">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {title || "Confirm Delete"}
                    </h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed mb-8 font-medium">
                        {message || "Are you sure you want to proceed? This action cannot be undone."}
                    </p>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-[12px] font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 text-[12px] font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 rounded-2xl transition-all active:scale-95"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}








