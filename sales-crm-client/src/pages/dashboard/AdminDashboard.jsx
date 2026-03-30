import React, { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, Building2, Briefcase, Zap,
    TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
    Calendar, DollarSign, ArrowLeft, ChevronRight, Trash2,
    CircleDashed, CheckCircle2, XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getDeals } from "../../API/services/dealService";
import { getCompanies } from "../../API/services/companyService";
import { getContacts } from "../../API/services/contactService";
import { getTeamUsers } from "../../API/services/userService";
import { toast } from "react-hot-toast";
import DashboardDetailModal from "../../components/modals/DashboardDetailModal";
import { truncateName } from "../../utils/stringUtils";
import useDashboardRefresh from "../../hooks/useDashboardRefresh";

const OverviewStat = ({ label, value, icon: IconComp, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 group"
    >
        <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-red-600 text-white shadow-md shadow-red-100 group-hover:scale-110 transition-transform duration-300">
                <IconComp size={20} />
            </div>
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
        activeDealList: [],
        companyList: [],
        userList: []
    });
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, category: null, data: [] });
    const [selectedMonth, setSelectedMonth] = useState("");
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [activeBar, setActiveBar] = useState(null);
    const [activePipelineBar, setActivePipelineBar] = useState(null);
    const [activePickerView, setActivePickerView] = useState("years"); // "years" | "months"
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const navigate = useNavigate();

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

            // Only deals that are not closed count as active
            const activeDeals = filteredDeals.filter(d => !d.stage?.startsWith('Closed'));

            const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            // Group by month for chart (last 6 months trailing from selected month or today)
            const months = [];
            const baseDate = selectedMonth ? new Date(selectedMonth + "-01T12:00:00") : new Date();
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(baseDate);
                date.setMonth(date.getMonth() - i);
                months.push({
                    name: date.toLocaleString('default', { month: 'short' }),
                    monthStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                    value: 0
                });
            }

            dealsData.forEach(d => {
                const dDate = new Date(d.createdAt);
                const dMonthStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                
                const mIndex = months.findIndex(m => m.monthStr === dMonthStr);
                if (mIndex !== -1) {
                    months[mIndex].value += (d.value || 0);
                }
            });

            setStats({
                deals: activeDeals.length,
                companies: filteredCompanies.length,
                contacts: contactsRes.data.total || 0, // contacts not explicitly filtered here yet per plan but fine
                users: filteredUsers.length,
                totalValue,
                revenueChart: months,
                pendingUsers: userData.filter(u => !u.isSetupComplete)?.length || 0,
                stagnantDeals: dealsData.filter(d => d.stage === 'Negotiation' && new Date(d.updatedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
                dealList: filteredDeals,
                activeDealList: activeDeals,
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

    // Set up auto-refresh (every 1 minute + focus events)
    useDashboardRefresh(fetchStats);

    const maxChartValue = Math.max(...stats.revenueChart.map(m => m.value), 1000);

    const getMonthString = (offsetMonths) => {
        const d = new Date();
        d.setMonth(d.getMonth() + offsetMonths);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // Computations for Detail Widgets
    const topDeals = [...stats.dealList].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);

    const getDealOwnerFullName = (deal) =>
        `${deal?.ownerId?.firstName || ""} ${deal?.ownerId?.lastName || ""}`.trim();

    const getDealDisplayName = (deal) => {
        const raw = (deal?.name || "").trim();
        const ownerFullName = getDealOwnerFullName(deal);
        if (/^assigned deal to\b/i.test(raw) && ownerFullName) {
            return `Assigned deal to ${ownerFullName}`;
        }
        return raw;
    };
    
    const pipelineStages = [
        { name: 'Lead', color: 'bg-red-500' },
        { name: 'Qualified', color: 'bg-orange-500' },
        { name: 'Proposal', color: 'bg-yellow-500' },
        { name: 'Negotiation', color: 'bg-indigo-500' }
    ];
    
    const pipelineStats = pipelineStages.map(stage => {
        const stageDeals = stats.dealList.filter(d => d.stage === stage.name);
        return {
            ...stage,
            count: stageDeals.length,
            value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
        };
    });

    const pipelineTotalDeals = pipelineStats.reduce((sum, s) => sum + s.count, 0);

    const dealsOverview = {
        successful: stats.dealList.filter(d => d.stage === 'Closed Won').length,
        pending: stats.dealList.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage)).length,
        rejected: stats.dealList.filter(d => d.stage === 'Closed Lost').length,
        total: stats.dealList.length
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Click outside overlay for dropdown */}
            {isDatePickerOpen && (
                <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsDatePickerOpen(false)} 
                />
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Global sales performance and activity overview</p>
                </div>
                <div className="flex items-center gap-2 relative z-30">
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
                        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-in fade-in slide-in-from-top-2 z-[100]">
                            <div className="px-4 pb-2 mb-2 border-b border-gray-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {activePickerView === "years" ? "Select Year" : `Select Month (${pickerYear})`}
                                </span>
                                {activePickerView === "months" && (
                                    <button 
                                        onClick={() => setActivePickerView("years")}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                                    >
                                        <ArrowLeft size={10} /> Back
                                    </button>
                                )}
                            </div>

                            <div className="px-3">
                                {activePickerView === "years" ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                            {Array.from({ length: Math.max(new Date().getFullYear() - 2026 + 1, 1) }, (_, i) => 2026 + i).reverse().map(year => (
                                                <button
                                                    key={year}
                                                    onClick={() => { setPickerYear(year); setActivePickerView("months"); }}
                                                    className={`py-2 px-3 rounded-xl text-sm font-semibold transition-all ${pickerYear === year ? 'bg-red-50 text-red-700 border border-red-100' : 'hover:bg-gray-50 text-gray-700 border border-transparent'}`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => {
                                            const monthVal = `${pickerYear}-${m}`;
                                            const monthName = new Date(`${pickerYear}-${m}-01`).toLocaleString('default', { month: 'short' });
                                            const isSelected = selectedMonth === monthVal;
                                            return (
                                                <button
                                                    key={m}
                                                    onClick={() => { setSelectedMonth(monthVal); setIsDatePickerOpen(false); setActivePickerView("years"); }}
                                                    className={`py-2 rounded-lg text-[11px] font-bold transition-all ${isSelected ? 'bg-red-600 text-white shadow-md shadow-red-100' : 'hover:bg-red-50 text-gray-600 hover:text-red-700'}`}
                                                >
                                                    {monthName.toUpperCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-3 pt-2 px-4 border-t border-gray-50 flex items-center justify-between">
                                <button
                                    onClick={() => { setSelectedMonth(getMonthString(0)); setIsDatePickerOpen(false); setActivePickerView("years"); }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-red-600 uppercase tracking-tight transition-colors"
                                >
                                    Current
                                </button>
                                <button
                                    onClick={() => setIsDatePickerOpen(false)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-tight transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OverviewStat
                    label="Total Revenue"
                    value={`$${(stats.totalValue / (stats.totalValue >= 1000000 ? 1000000 : 1000)).toFixed(1)}${stats.totalValue >= 1000000 ? 'M' : 'K'}`}
                    icon={DollarSign}
                    onClick={() => setModalConfig({ isOpen: true, category: 'revenue', data: stats.dealList })}
                />
                <OverviewStat
                    label="Active Deals"
                    value={stats.deals}
                    icon={Briefcase}
                    onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.activeDealList || [] })}
                />
                <OverviewStat
                    label="Total Companies"
                    value={stats.companies}
                    icon={Building2}
                    onClick={() => setModalConfig({ isOpen: true, category: 'companies', data: stats.companyList })}
                />
                <OverviewStat
                    label="System Users"
                    value={stats.users}
                    icon={Users}
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
                            const isActive = activeBar === i;
                            return (
                                <div 
                                    key={i} 
                                    className="flex-1 h-full flex flex-col items-center gap-3 group cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveBar(isActive ? null : i);
                                    }}
                                >
                                    <div className="flex-1 w-full flex items-end">
                                        <div
                                            className={`w-full ${isActive ? 'bg-red-600' : 'bg-red-500'} group-hover:bg-red-600 transition-all duration-300 rounded-t-lg relative`}
                                            style={{ height: `${Math.max(h, 5)}%` }}
                                        >
                                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                ${m.value.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-red-600' : 'text-gray-400 font-bold'}`}>
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
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-red-500 transition-colors">{stats.stagnantDeals} Stagnant Deals</p>
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

            {/* Detailed Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Top Deals Widget */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-900">Top Deals</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {topDeals.map((deal, index) => (
                            <div key={deal._id || index} className="flex items-center group cursor-pointer hover:bg-gray-50 p-2.5 -mx-2 rounded-xl transition-colors gap-2.5 min-w-0" onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: [deal] })}>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center font-bold text-xs text-gray-400 shadow-sm border border-gray-100 group-hover:bg-red-50 group-hover:text-red-500 group-hover:border-red-100 transition-colors flex-shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-900 transition-colors uppercase tracking-tight whitespace-normal leading-tight mb-0.5">
                                        {getDealDisplayName(deal)}
                                    </p>
                                    <p className="text-[9px] font-medium text-gray-500 whitespace-nowrap overflow-hidden transition-all group-hover:whitespace-normal">{deal.companyName || deal.companyId?.name || "Unknown Company"}</p>
                                </div>
                                <div className="text-xs font-semibold text-gray-900 whitespace-nowrap pl-2.5 border-l border-gray-100 flex-shrink-0 text-right">
                                    ${(deal.value || 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {topDeals.length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">No deals found for this period</div>
                        )}
                    </div>
                </div>

                {/* Pipeline Statistics Widget */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[400px] md:col-span-2 xl:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-900">Pipeline Statistics</h2>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {pipelineStats.map((stat, i) => (
                            <div key={i} className="flex flex-col gap-1 min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">{stat.name}</span>
                                <span className="text-xs font-bold text-gray-900 truncate">${(stat.value >= 1000 ? (stat.value / 1000).toFixed(1) + 'K' : stat.value)}</span>
                                <span className="text-[10px] text-gray-500 truncate">{stat.count} Deals</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-1 h-32 rounded-xl mb-6 flex-1 items-end">
                        {pipelineStats.map((stat, i) => {
                            const heightPercent = pipelineTotalDeals > 0 ? Math.max((stat.count / pipelineTotalDeals) * 100, 10) : 0;
                            if (heightPercent === 0) return null;
                            const isActive = activePipelineBar === i;
                            return (
                                <div 
                                    key={i} 
                                    className={`${stat.color} flex-1 rounded-t-md transition-all duration-500 hover:scale-y-105 hover:brightness-110 relative group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-gray-200' : ''}`}
                                    style={{ height: `${heightPercent}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.innerWidth < 1024) {
                                            if (isActive) {
                                                setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => d.stage === stat.name) });
                                                setActivePipelineBar(null);
                                            } else {
                                                setActivePipelineBar(i);
                                            }
                                        } else {
                                            setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => d.stage === stat.name) });
                                        }
                                    }}
                                >
                                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100' : ''}`}>
                                        {stat.count} Deals
                                    </div>
                                </div>
                            );
                        })}
                        {pipelineTotalDeals === 0 && (
                            <div className="bg-gray-100 w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium rounded-xl">No active pipeline</div>
                        )}
                    </div>
                </div>

                {/* Deals Overview Widget */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-900">Deals Overview</h2>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900">{dealsOverview.total}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Deals</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors gap-3" onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => d.stage === 'Closed Won') })}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-gray-600 whitespace-normal leading-tight group-hover:text-gray-900">Successful Deals</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap pl-2 flex-shrink-0">{dealsOverview.successful} Deals</span>
                        </div>
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors gap-3" onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage)) })}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <CircleDashed size={14} className="text-yellow-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-gray-600 whitespace-normal leading-tight group-hover:text-gray-900">Pending Deals</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap pl-2 flex-shrink-0">{dealsOverview.pending} Deals</span>
                        </div>
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors gap-3" onClick={() => setModalConfig({ isOpen: true, category: 'deals', data: stats.dealList.filter(d => d.stage === 'Closed Lost') })}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <XCircle size={14} className="text-red-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-gray-600 whitespace-normal leading-tight group-hover:text-gray-900">Rejected Deals</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap pl-2 flex-shrink-0">{dealsOverview.rejected} Deals</span>
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
