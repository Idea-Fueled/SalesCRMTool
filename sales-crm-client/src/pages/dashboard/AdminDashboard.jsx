import React, { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, Building2, Briefcase, Zap,
    TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
    Calendar, DollarSign, ArrowLeft, ChevronRight
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

    const fetchStats = async () => {
        try {
            const [dealsRes, companiesRes, contactsRes, usersRes] = await Promise.all([
                getDeals({ limit: 1000 }),
                getCompanies({ limit: 1000 }),
                getContacts({ limit: 1 }),
                getTeamUsers()
            ]);

            const dealsData = dealsRes.data.data || [];
            const totalValue = dealsData.reduce((sum, d) => sum + (d.value || 0), 0);

            // Group by month for chart (last 6 months)
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
                deals: dealsRes.data.total || 0,
                companies: companiesRes.data.total || 0,
                contacts: contactsRes.data.total || 0,
                users: usersRes.data?.length || 0,
                totalValue,
                revenueChart: months,
                pendingUsers: usersRes.data?.filter(u => !u.isSetupComplete)?.length || 0,
                stagnantDeals: dealsData.filter(d => d.stage === 'Negotiation' && new Date(d.updatedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
                dealList: dealsData,
                companyList: companiesRes.data.data || [],
                userList: usersRes.data || []
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
    }, []);

    const maxChartValue = Math.max(...stats.revenueChart.map(m => m.value), 1000);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Admin Overview</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Global sales performance and activity overview</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm">
                    <Calendar size={16} className="text-red-500" />
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                        </ul>
                        <div className="mt-auto pt-6 border-t border-gray-50 bg-gray-50/30 -mx-6 -mb-6 p-6 rounded-b-2xl">
                            <div className="flex items-center justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Health</span>
                                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase">Operational</span>
                            </div>
                        </div>
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
