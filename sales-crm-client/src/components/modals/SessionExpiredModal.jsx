import React from 'react';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SessionExpiredModal = ({ isOpen }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLoginAgain = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <Modal 
            isOpen={isOpen} 
            // We do not provide an onClose function to make it strictly non-dismissible
            title="Session Expired"
        >
            <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Your session has expired</h3>
                <p className="text-gray-600 text-sm">
                    For security reasons, your session has timed out. Please log in again to continue accessing your dashboard.
                </p>
                <div className="pt-4 pb-2">
                    <button
                        onClick={handleLoginAgain}
                        className="w-full bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700 transition font-medium"
                    >
                        Log In Again
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SessionExpiredModal;
