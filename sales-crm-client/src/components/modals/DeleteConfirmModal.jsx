import React from "react";
import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message, itemName }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || "Confirm Delete"}>
            <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-red-800 font-semibold">Notice: This item will be archived.</p>
                        <p className="text-xs text-red-600">You are about to move <span className="font-bold">{itemName}</span> to the archive. You can restore it within 30 days.</p>
                    </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed px-1">
                    {message || "Are you sure you want to delete this record? It will be moved to the Archive tab and can be restored for up to 30 days before permanent archival."}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                        Cancel, keep it
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md shadow-red-200 transition"
                    >
                        Yes, delete now
                    </button>
                </div>
            </div>
        </Modal>
    );
}








