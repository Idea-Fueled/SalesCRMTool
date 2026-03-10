import React, { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, Building2, Briefcase, Zap,
    TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
    Calendar, DollarSign, ArrowLeft, ChevronRight, Trash2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getDeals } from "../../../API/services/dealService";
import { getCompanies } from "../../../API/services/companyService";
import { getContacts } from "../../../API/services/contactService";
import { getTeamUsers } from "../../../API/services/userService";
import { toast } from "react-hot-toast";
import DashboardDetailModal from "../../components/modals/DashboardDetailModal";

const OverviewStat = ({ label, value, trend, icon: IconComp, color, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 group"
    >
        <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                <IconComp size={20} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                    {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-500 transition-colors">{value}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
        </div>
    </div>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        deals: 0,
        companies: 0,
        contacts: 0,
        users: 0,
        totalValue: 0,
        revenueChart: [
            { name: 'Jan', value: 0 },
            { name: 'Feb', value: 0 },
            { name: 'Mar', value: 0 },
            { name: 'Apr', value: 0 },
            { name: 'May', value: 0 },
            { name: 'Jun', value: 0 }
        ],
        pendingUsers: 0,
        stagnantDeals: 0,
        dealList: [],
        companyList: [],
        userList: []
    });
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, category: null, data: [] });
    const [selectedMonth, setSelectedMonth] = useState("");
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const fetchStats = async () => {
        try {
            const [dealsRes, companiesRes, contactsRes, usersRes] = await Promise.all([
                getDeals({ limit: 1000 }),
                getCompanies({ limit: 1000 }),
                getContacts({ limit: 1 }),
                getTeamUsers()
            ]);

            const dealsData = dealsRes.data.data || [];
            const companyData = companiesRes.data.data || [];
            const userData = usersRes.data || [];

            // Filter logic based on selectedMonth (YYYY-MM)
            const isMatch = (dateStr) => {
                if (!selectedMonth) return true;
                if (!dateStr) return false;
                const d = new Date(dateStr);
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${yyyy}-${mm}` === selectedMonth;
            };

            const filteredDeals = dealsData.filter(d => isMatch(d.createdAt));
            const filteredCompanies = companyData.filter(c => isMatch(c.createdAt));
            const filteredUsers = userData.filter(u => isMatch(u.createdAt));

            const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            // Group by month for chart (last 6 months, always un-filtered)
            const months = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push({
                    name: date.toLocaleString('default', { month: 'short' }),
                    value: 0
                });
            }

            dealsData.forEach(d => {
                const dDate = new Date(d.createdAt);
                const monthName = dDate.toLocaleString('default', { month: 'short' });
                const mIndex = months.findIndex(m => m.name === monthName);
                if (mIndex !== -1) {
                    months[mIndex].value += (d.value || 0);
                }
            });

            setStats({
                deals: filteredDeals.length,
                companies: filteredCompanies.length,
                contacts: contactsRes.data.total || 0, // contacts not explicitly filtered here yet per plan but fine
                users: filteredUsers.length,
                totalValue,
                revenueChart: months,
                pendingUsers: userData.filter(u => !u.isSetupComplete)?.length || 0,
                stagnantDeals: dealsData.filter(d => d.stage === 'Negotiation' && new Date(d.updatedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
                dealList: filteredDeals,
                companyList: filteredCompanies,
                userList: filteredUsers
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load dashboard statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedMonth]);

    const maxChartValue = Math.max(...stats.revenueChart.map(m => m.value), 1000);

    const getMonthString = (offsetMonths) => {
        const d = new Date();
        d.setMonth(d.getMonth() + offsetMonths);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Click outside overlay for dropdown */}
            {isDatePickerOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDatePickerOpen(false)} 
                />
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Global sales performance and activity overview</p>
                </div>
                <div className="flex items-center gap-2 relative z-50">
                    <button
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-all hover:border-red-200 ${selectedMonth ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-700'}`}
                    >
                        <Calendar size={16} className={selectedMonth ? "text-red-600" : "text-gray-400"} />
                        {selectedMonth 
                            ? new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
                            : "All Time"}
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isDatePickerOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={() => { setSelectedMonth(""); setIsDatePickerOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${!selectedMonth ? "text-red-600 bg-red-50/50" : "text-gray-700"}`}
                            >
                                All Time
                            </button>
                            <button
                                onClick={() => { setSelectedMonth(getMonthString(0)); setIsDatePickerOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${selectedMonth === getMonthString(0) ? "text-red-600 bg-red-50/50" : "text-gray-700"}`}
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => { setSelectedMonth(getMonthString(-1)); setIsDatePickerOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${selectedMonth === getMonthString(-1) ? "text-red-600 bg-red-50/50" : "text-gray-700"}`}
                            >
                                Last Month
                            </button>
                            <div className="h-px bg-gray-100 my-1 mx-2" />
                            <div className="px-3 py-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block px-1">Custom Month</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => { setSelectedMonth(e.target.value); setIsDatePickerOpen(false); }}
                                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OverviewStat
                    label="Total Revenue"
                    value={`$${(stats.totalValue / (stats.totalValue >= 1000000 ? 1000000 : 1000)).toFixed(1)}${stats.totalValue >= 1000000 ? 'M' : 'K'}`}
                    trend={12}
                    icon={DollarSign}
                    color="bg-red-50 text-red-600"
                    onClick={() => setModalConfig({ isOpen: true, category: 'revenue', data: stats.dealList })}
                />
                <OverviewStat
                    label="Active Deals"
                    value={stats.deals}
                    trend={8}
                    icon={Briefcase}
                    color="bg-orange-50 text-orange-600"
                    onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => !d.stage.startsWith('Closed')) })}
                />
                <OverviewStat
                    label="Total Companies"
                    value={stats.companies}
                    trend={-2}
                    icon={Building2}
                    color="bg-rose-50 text-rose-600"
                    onClick={() => setModalConfig({ isOpen: true, category: 'companies', data: stats.companyList })}
                />
                <OverviewStat
                    label="System Users"
                    value={stats.users}
                    trend={5}
                    icon={Users}
                    color="bg-gray-100 text-gray-700"
                    onClick={() => setModalConfig({ isOpen: true, category: 'users', data: stats.userList })}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-gray-900">Revenue Analytics</h2>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue by Month</div>
                    </div>
                    <div className="h-64 flex items-end gap-3 px-2">
                        {stats.revenueChart.map((m, i) => {
                            const h = (m.value / maxChartValue) * 100;
                            return (
                                <div key={i} className="flex-1 h-full flex flex-col items-center gap-3 group">
                                    <div className="flex-1 w-full flex items-end">
                                        <div
                                            className="w-full bg-red-500/10 group-hover:bg-red-500 transition-all duration-300 rounded-t-lg relative"
                                            style={{ height: `${Math.max(h, 5)}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                ${m.value.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        {m.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-red-500" />
                        Action Items
                    </h2>
                    <div className="flex-1 space-y-6">
                        <ul className="space-y-4">
                            <li
                                onClick={() => setModalConfig({ isOpen: true, category: 'users', data: stats.userList.filter(u => !u.isSetupComplete) })}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-red-500 transition-colors">{stats.pendingUsers} Pending Invites</p>
                                    <p className="text-xs text-gray-500">Users who haven't set password</p>
                                </div>
                            </li>
                            <li
                                onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => d.stage === 'Negotiation' && new Date(d.updatedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) })}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
                            >
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-orange-500 transition-colors">{stats.stagnantDeals} Stagnant Deals</p>
                                    <p className="text-xs text-gray-500">Inactive in Negotiation for 7+ days</p>
                                </div>
                            </li>
                            <li
                                onClick={() => navigate("/dashboard/archive")}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <Trash2 size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-red-500 transition-colors">Archived Records</p>
                                    <p className="text-xs text-gray-500">Restore deleted deals, companies & contacts</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <DashboardDetailModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                category={modalConfig.category}
                data={modalConfig.data}
            />
        </div>
    );
}
