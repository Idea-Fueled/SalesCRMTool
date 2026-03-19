import React, { useState, useEffect, useRef } from "react";
import { 
    LayoutDashboard, Building2, ContactRound, Briefcase, 
    Search, Calendar, Filter, ChevronDown, Download, RotateCw
} from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { getDeals } from "../../API/services/dealService";
import { getCompanies } from "../../API/services/companyService";
import { getContacts } from "../../API/services/contactService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import CollapsibleDealName from "../../components/CollapsibleDealName";

const TabButton = ({ active, label, icon: Icon, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            active 
            ? "border-red-500 text-red-600 bg-red-50/30" 
            : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
    >
        <Icon size={14} />
        {label}
    </button>
);

export default function Reports() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const tableRef = useRef(null);
    const fetchToastId = useRef(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "deals");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [dateRange, setDateRange] = useState({
        start: searchParams.get("start") || new Date().toISOString().split('T')[0],
        end: searchParams.get("end") || new Date().toISOString().split('T')[0]
    });
    const [rangePreset, setRangePreset] = useState(searchParams.get("preset") || "today");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const fetchData = async (signal) => {
        // Clear any stale error toast when starting a new fetch
        if (fetchToastId.current) {
            toast.dismiss(fetchToastId.current);
            fetchToastId.current = null;
        }

        setLoading(true);
        try {
            const params = {
                createdAfter: dateRange.start,
                createdBefore: new Date(new Date(dateRange.end).setHours(23, 59, 59, 999)).toISOString(),
                limit: 1000,
                name: debouncedSearch || undefined
            };

            let res;
            // Pass signal to avoid racing conditions
            // const options = { params, signal }; // This line is no longer needed as signal is passed directly
            
            if (activeTab === "deals") res = await getDeals(params, signal);
            else if (activeTab === "companies") res = await getCompanies(params, signal);
            else if (activeTab === "contacts") res = await getContacts(params, signal);

            // Double check signal has not been aborted
            if (signal && signal.aborted) return;
            
            setData(res?.data?.data || []);
        } catch (error) {
            // Ignore cancellation errors caused by rapid tab switching / component unmount
            if (error.name === 'AbortError' || axios.isCancel?.(error) || error.code === 'ERR_CANCELED') return;
            console.error(error);
            fetchToastId.current = toast.error(`Failed to fetch ${activeTab} report`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300); // More responsive 300ms
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const calculateRange = () => {
            const now = new Date();
            let start = new Date();
            let end = new Date();

            switch (rangePreset) {
                case "today":
                    start = new Date();
                    end = new Date();
                    break;
                case "yesterday":
                    start = new Date(now);
                    start.setDate(now.getDate() - 1);
                    end = new Date(now);
                    end.setDate(now.getDate() - 1);
                    break;
                case "weekly":
                    start = new Date(now);
                    start.setDate(now.getDate() - 7);
                    end = new Date(now);
                    break;
                case "thisMonth":
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case "lastMonth":
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    end = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case "custom":
                    return; // Don't overwrite custom selection
                default:
                    break;
            }

            setDateRange({
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            });
        };

        if (rangePreset !== "custom") {
            calculateRange();
        }
    }, [rangePreset]);

    useEffect(() => {
        const controller = new AbortController();
        
        const params = {
            tab: activeTab,
            preset: rangePreset,
            start: dateRange.start,
            end: dateRange.end
        };
        // Update URL to persist filter state
        setSearchParams(params, { replace: true });
        
        // Use a small timeout to let calculateRange finish if rangePreset just changed
        const timer = setTimeout(() => {
            fetchData(controller.signal);
        }, 50);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [activeTab, dateRange, debouncedSearch, rangePreset]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setDebouncedSearch(searchQuery); // Trigger immediate search on Enter
    };

    const handleRowClick = (id) => {
        // Use URL context to determine role prefix instead of user.role
        // This prevents redirection to admin dashboard when staying in manager view
        const pathParts = location.pathname.split('/');
        const rolePath = pathParts[1] || (user?.role === "admin" ? "dashboard" : user?.role === "sales_manager" ? "manager" : "rep");
        navigate(`/${rolePath}/${activeTab}/${id}`);
    };

    const getChartData = () => {
        if (!data || data.length === 0) return [];
        const counts = {};
        data.forEach(item => {
            const status = item.status || item.stage || (activeTab === "contacts" ? (item.jobTitle || "Other") : "Other");
            counts[status] = (counts[status] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8'];

    const handleExport = async () => {
        if (!tableRef.current || data.length === 0) return;
        
        setExporting(true);
        const toastId = toast.loading(`Generating ${activeTab} report...`);
        
        try {
            // Hide scrollbars temporarily
            const originalOverflow = tableRef.current.style.overflow;
            tableRef.current.style.overflow = 'visible';

            const dataUrl = await toPng(tableRef.current, { backgroundColor: '#ffffff', quality: 1.0 });

            // Restore overflow
            tableRef.current.style.overflow = originalOverflow;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.setFontSize(18);
            pdf.setTextColor(239, 68, 68); // Red-500
            pdf.text(`${activeTab.toUpperCase()} PERFORMANCE REPORT`, 15, 20);
            
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128); // Gray-500
            pdf.text(`Period: ${dateRange.start} to ${dateRange.end}`, 15, 28);
            pdf.text(`Generated on: ${new Date().toLocaleString()}`, 15, 33);
            
            pdf.addImage(dataUrl, 'PNG', 10, 40, pdfWidth - 20, pdfHeight - 20);
            pdf.save(`CRM_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            
            toast.success("Report downloaded successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2.5">
                        <LayoutDashboard className="text-red-500" size={24} />
                        Performance Reports
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {user?.role === 'admin' ? 'Global system performance and activity oversight' : `Activity logs for your ${user?.role === 'sales_manager' ? 'team members' : 'personal pipeline'}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Search Box */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 md:flex-none md:min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 transition shadow-sm"
                        />
                    </form>

                    {/* Single Combined Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-4 py-1.5 shadow-sm hover:border-red-400 hover:shadow-md transition-all active:scale-95"
                        >
                            <Calendar size={14} className="text-red-500" />
                            <span className="max-w-[150px] truncate">
                                {rangePreset === 'custom' 
                                    ? `${dateRange.start.split('-').reverse().join('-')} — ${dateRange.end.split('-').reverse().join('-')}` 
                                    : rangePreset === "today" ? "Today" 
                                    : rangePreset === "yesterday" ? "Yesterday"
                                    : rangePreset === "weekly" ? "Last 7 Days"
                                    : rangePreset === "thisMonth" ? "This Month" 
                                    : "Last Month"
                                }
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 p-5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 min-w-[280px] animate-in fade-in zoom-in duration-200">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Quick Presets</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'today', label: 'Today' },
                                            { id: 'yesterday', label: 'Yesterday' },
                                            { id: 'weekly', label: 'Last 7 Days' },
                                            { id: 'thisMonth', label: 'This Month' },
                                            { id: 'lastMonth', label: 'Last Month' }
                                        ].map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => { setRangePreset(preset.id); setIsFilterOpen(false); }}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                                    rangePreset === preset.id 
                                                    ? 'bg-red-50 border-red-200 text-red-600' 
                                                    : 'bg-gray-50/50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-300'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 space-y-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                            Custom Range <span className="h-[1px] flex-1 bg-gray-50"></span>
                                        </span>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 px-1">START DATE</label>
                                                <input 
                                                    type="date" 
                                                    value={dateRange.start}
                                                    onChange={(e) => {
                                                        setDateRange(prev => ({ ...prev, start: e.target.value }));
                                                        setRangePreset("custom");
                                                    }}
                                                    className="w-full text-[10px] font-bold p-2 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-red-200 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 px-1">END DATE</label>
                                                <input 
                                                    type="date" 
                                                    value={dateRange.end}
                                                    onChange={(e) => {
                                                        setDateRange(prev => ({ ...prev, end: e.target.value }));
                                                        setRangePreset("custom");
                                                    }}
                                                    className="w-full text-[10px] font-bold p-2 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-red-200 transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => { fetchData(); setIsFilterOpen(false); }}
                                            className="w-full py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-red-100/50 hover:bg-red-700 transition active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Apply Filter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => { fetchData(); setIsFilterOpen(false); }}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition shadow-sm active:scale-95"
                        title="Reload"
                    >
                        <RotateCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100 px-2 overflow-x-auto no-scrollbar">
                    <TabButton 
                        active={activeTab === "deals"} 
                        label="Deals" 
                        icon={Briefcase} 
                        onClick={() => { setActiveTab("deals"); setSearchQuery(""); }} 
                    />
                    <TabButton 
                        active={activeTab === "companies"} 
                        label="Companies" 
                        icon={Building2} 
                        onClick={() => { setActiveTab("companies"); setSearchQuery(""); }} 
                    />
                    <TabButton 
                        active={activeTab === "contacts"} 
                        label="Contacts" 
                        icon={ContactRound} 
                        onClick={() => { setActiveTab("contacts"); setSearchQuery(""); }} 
                    />
                </div>

                {/* Chart Section */}
                {!loading && data.length > 0 && (
                    <div className="p-6 bg-gray-50/30 border-b border-gray-100 flex flex-col items-center">
                        <div className="w-full flex flex-col md:flex-row items-center justify-around gap-8">
                            <div className="w-full h-[220px] max-w-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getChartData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {getChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" 
                                            formatter={(value, entry) => <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight ml-1">{value} ({entry.payload.value})</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 max-w-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                    {activeTab === "contacts" ? "Job Title Distribution" : "Metric Distribution"}
                                </h4>
                                <div className="space-y-3">
                                    {getChartData().map((item, index) => {
                                        const percentage = Math.round((item.value / data.length) * 100);
                                        return (
                                            <div key={item.name} className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                                    <span className="text-gray-500">{item.name}</span>
                                                    <span className="text-gray-700">{percentage}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-1000" 
                                                        style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto min-h-[300px]" ref={tableRef}>
                    <table className="w-full table-fixed text-left text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-gray-50/40 border-b border-gray-100 text-[10px] font-black text-gray-600 uppercase tracking-wider">
                                <th className="px-4 py-3.5 font-bold w-1/5">Creation Date</th>
                                <th className="px-4 py-3.5 font-bold w-1/5">{activeTab === "contacts" ? "Name" : activeTab === "companies" ? "Company" : "Deal name"}</th>
                                <th className="px-4 py-3.5 font-bold w-1/5">{activeTab === "deals" ? "Value" : activeTab === "companies" ? "Industry" : "Title"}</th>
                                <th className="px-4 py-3.5 font-bold w-1/5">Owner</th>
                                <th className="px-4 py-3.5 text-right font-bold w-1/5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading {activeTab}...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-gray-400 text-xs font-semibold italic">
                                        {searchQuery ? "Not found" : "No records found for this period."}
                                    </td>
                                </tr>
                            ) : (
                                data.map(item => (
                                    <tr 
                                        key={item._id} 
                                        onClick={() => handleRowClick(item._id)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-400 text-xs font-medium">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-gray-700 group-hover:text-red-600 transition-colors">
                                            {activeTab === "deals" ? (
                                                <CollapsibleDealName 
                                                    name={item.name} 
                                                    onNavigate={() => handleRowClick(item._id)} 
                                                />
                                            ) : (
                                                activeTab === "contacts" ? `${item.firstName} ${item.lastName}` : item.name
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 font-medium">
                                            {activeTab === "deals" ? `$${(item.value || 0).toLocaleString()}` : item.industry || item.jobTitle || "—"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-red-100 flex items-center justify-center">
                                                    {item.ownerId?.profilePicture ? (
                                                        <img
                                                            src={item.ownerId.profilePicture}
                                                            alt={`${item.ownerId.firstName || user?.firstName || ''} profile`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-red-600">
                                                            {(item.ownerId?.firstName?.[0] || user?.firstName?.[0] || 'A')}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-500 text-xs truncate max-w-[140px]">
                                                    {item.ownerId?.firstName || user?.firstName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                                (item.status === 'Active' || item.stage === 'Closed Won') 
                                                ? 'bg-green-50 text-green-600 border-green-100' 
                                                : 'bg-gray-50 text-gray-500 border-gray-100'
                                            }`}>
                                                {item.status || item.stage || "N/A"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="bg-white p-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total {activeTab}: {data.length}
                    </p>
                    <button 
                        onClick={handleExport}
                        disabled={data.length === 0 || exporting}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest disabled:opacity-30 transition-opacity"
                    >
                        <Download size={12} className={exporting ? "animate-bounce" : ""} />
                        {exporting ? "Generating..." : "Export PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}
