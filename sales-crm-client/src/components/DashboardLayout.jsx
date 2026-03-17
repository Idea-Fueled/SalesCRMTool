import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Briefcase, Building2, Users, ContactRound,
    Bell, Search, Menu, LogOut, ChevronDown, History, Trash2, Archive
} from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";
import GlobalSearch from "./GlobalSearch";
import LogoutConfirmModal from "./LogoutConfirmModal";
import NotificationDropdown from "./NotificationDropdown";
import MyProfileModal from "./modals/MyProfileModal";


const SidebarLink = ({ to, icon: IconComp, label, badge, onClick, end }) => (
    <NavLink to={to}
        end={end}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
      ${isActive ? "bg-red-600 text-white shadow-md shadow-red-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`
        }>
        {({ isActive }) => (
            <>
                <span className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}>
                    <IconComp size={18} />
                </span>
                <span className="flex-1">{label}</span>
                {badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-white text-red-600" : "bg-red-100 text-red-600"}`}>
                        {badge}
                    </span>
                )}
            </>
        )}
    </NavLink>
);

const DashboardLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [searchOpen, setSearchOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.slice(-1) || ""}`.toUpperCase() : "A";

    // Initial load: set sidebar based on screen width
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const closeSidebarOnMobile = () => {
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    // Ctrl+K / Cmd+K to open search
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-[70] lg:relative
                ${sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-0 lg:overflow-hidden"}
                bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
            `}>

                {/* Brand */}
                <div className="h-16 flex items-center px-5 border-b border-gray-100">
                    <Logo className="flex items-center" />
                </div>

                {/* Role badge */}
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 transition-all">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Administrator</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-5">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Main Menu</p>
                        <div className="space-y-1">
                            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={closeSidebarOnMobile} end={true} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">CRM</p>
                        <div className="space-y-1">
                            <SidebarLink to="/dashboard/deals" icon={Briefcase} label="Deals" onClick={closeSidebarOnMobile} />
                            <SidebarLink to="/dashboard/companies" icon={Building2} label="Companies" onClick={closeSidebarOnMobile} />
                            <SidebarLink to="/dashboard/contacts" icon={ContactRound} label="Contacts" onClick={closeSidebarOnMobile} />
                            <SidebarLink to="/dashboard/users" icon={Users} label="Users" onClick={closeSidebarOnMobile} />
                            <SidebarLink to="/dashboard/archive" icon={Archive} label="Archive" onClick={closeSidebarOnMobile} />
                            <SidebarLink to="/dashboard/trash" icon={Trash2} label="Trash" onClick={closeSidebarOnMobile} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Technical</p>
                        <div className="space-y-1">
                            <SidebarLink to="/dashboard/audit-logs" icon={History} label="Audit History" onClick={closeSidebarOnMobile} />
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100 pb-20 lg:pb-4">
                    <button
                        onClick={() => setShowLogout(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Log Out</span>
                    </button>
                </div>

            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(p => !p)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition lg:hidden">
                        <Menu size={20} />
                    </button>
                    <button onClick={() => setSidebarOpen(p => !p)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition hidden lg:block">
                        <Menu size={18} />
                    </button>
                    {/* Search trigger */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 flex-1 max-w-[160px] sm:max-w-xs pl-3 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:bg-red-50/30 transition text-left group"
                    >
                        <Search size={15} className="group-hover:text-red-500 transition-colors" />
                        <span className="flex-1 truncate">Search...</span>
                        <kbd className="hidden lg:block text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                        <NotificationDropdown />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 sm:pl-3 sm:border-l border-gray-100">
                        <button 
                            onClick={() => setProfileModalOpen(true)}
                            className="relative flex-shrink-0 cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
                        >
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt="Profile" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-sm border-2 border-transparent hover:border-red-200 transition-colors" />
                            ) : (
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">{initials}</div>
                            )}
                            <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 border-2 border-white rounded-full" />
                        </button>
                        <div className="hidden sm:block min-w-0">
                            <p className="text-sm font-bold text-gray-800">{user ? `${user.firstName} ${user.lastName}` : "ADMIN"}</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                                {user?.role === "admin" ? "ADMIN" :
                                    user?.role === "sales_manager" ? "SALES MANAGER" :
                                        user?.role === "sales_rep" ? "SALES REPRESENTATIVE" :
                                            (user?.role?.replace("_", " ")?.toUpperCase() || "ADMINISTRATOR")}
                            </p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto"><Outlet /></main>

                <footer className="h-auto py-4 sm:h-10 sm:py-0 bg-white border-t border-gray-100 flex items-center justify-center px-6 text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
                    <span>Copyright &copy; <span className="text-red-500 font-medium">mbdConsulting</span></span>
                </footer>
            </div>

            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <LogoutConfirmModal
                isOpen={showLogout}
                onClose={() => setShowLogout(false)}
                onConfirm={() => { logout(); navigate("/login"); }}
            />
            <MyProfileModal 
                isOpen={profileModalOpen} 
                onClose={() => setProfileModalOpen(false)} 
            />
        </div>
    );
}

export default DashboardLayout;
