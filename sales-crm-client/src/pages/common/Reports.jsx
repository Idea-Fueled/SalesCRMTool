import React, { useState, useEffect, useRef } from "react";
import { 
    LayoutDashboard, Building2, ContactRound, Briefcase, 
    Search, Calendar, Filter, ChevronDown, Download
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getDeals } from "../../API/services/dealService";
import { getCompanies } from "../../API/services/companyService";
import { getContacts } from "../../API/services/contactService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

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
    const [activeTab, setActiveTab] = useState("deals");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                createdAfter: dateRange.start,
                createdBefore: new Date(new Date(dateRange.end).setHours(23, 59, 59, 999)).toISOString(),
                limit: 1000,
                name: searchQuery || undefined
            };

            let res;
            if (activeTab === "deals") res = await getDeals(params);
            else if (activeTab === "companies") res = await getCompanies(params);
            else if (activeTab === "contacts") res = await getContacts(params);

            setData(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to fetch ${activeTab} report`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, dateRange]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleRowClick = (id) => {
        // Use URL context to determine role prefix instead of user.role
        // This prevents redirection to admin dashboard when staying in manager view
        const pathParts = location.pathname.split('/');
        const rolePath = pathParts[1] || (user?.role === "admin" ? "dashboard" : user?.role === "sales_manager" ? "manager" : "rep");
        navigate(`/${rolePath}/${activeTab}/${id}`);
    };

    const handleExport = async () => {
        if (!tableRef.current || data.length === 0) return;
        
        setExporting(true);
        const toastId = toast.loading(`Generating ${activeTab} report...`);
        
        try {
            const dataUrl = await toPng(tableRef.current, { backgroundColor: '#ffffff', quality: 1.0 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.setFontSize(18);
            pdf.setTextColor(239, 68, 68); // Red-500
            pdf.text(`${activeTab.toUpperCase()} PERFORMANCE REPORT`, 15, 20);
            
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128); // Gray-500
            pdf.text(`Periode: ${dateRange.start} to ${dateRange.end}`, 15, 28);
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
                        Activity logs for your {user?.role === 'sales_manager' ? 'team members' : 'personal pipeline'}
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

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                        <Calendar size={14} className="text-gray-400" />
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="text-xs font-medium focus:outline-none border-none p-0 w-24 bg-transparent"
                        />
                        <span className="text-gray-300 text-xs">—</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="text-xs font-medium focus:outline-none border-none p-0 w-24 bg-transparent"
                        />
                    </div>

                    <button 
                        onClick={fetchData}
                        className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black transition shadow-sm"
                        title="Reload"
                    >
                        <Filter size={16} />
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

                <div className="overflow-x-auto min-h-[300px]" ref={tableRef}>
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-gray-50/40 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-3.5 font-bold">Creation Date</th>
                                <th className="px-6 py-3.5 font-bold">{activeTab === "contacts" ? "Name" : activeTab === "companies" ? "Company" : "Deal name"}</th>
                                <th className="px-6 py-3.5 font-bold">{activeTab === "deals" ? "Value" : activeTab === "companies" ? "Industry" : "Title"}</th>
                                <th className="px-6 py-3.5 font-bold">Owner</th>
                                <th className="px-6 py-3.5 text-right font-bold">Status</th>
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
                                    <td colSpan={5} className="py-20 text-center text-gray-400 text-xs font-medium italic">
                                        No records found for this period.
                                    </td>
                                </tr>
                            ) : (
                                data.map(item => (
                                    <tr 
                                        key={item._id} 
                                        onClick={() => handleRowClick(item._id)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs font-medium">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-700 group-hover:text-red-600 transition-colors">
                                            {activeTab === "contacts" ? `${item.firstName} ${item.lastName}` : item.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {activeTab === "deals" ? `$${(item.value || 0).toLocaleString()}` : item.industry || item.jobTitle || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[8px] font-bold text-red-600">
                                                    {(item.ownerId?.firstName?.[0] || user?.firstName?.[0] || 'A')}
                                                </div>
                                                <span className="font-medium text-gray-500 text-xs truncate max-w-[100px]">
                                                    {item.ownerId?.firstName || user?.firstName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
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
