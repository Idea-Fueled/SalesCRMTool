import React, { useState, useEffect } from "react";
import { 
    Trash2, RefreshCcw, Briefcase, Building2, Users, 
    Calendar, AlertCircle, ChevronRight, Search, Clock
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { getArchivedDeals, restoreDeal } from "../../API/services/dealService";
import { getArchivedContacts, restoreContact } from "../../API/services/contactService";
import { getArchivedCompanies, restoreCompany } from "../../API/services/companyService";
import { toast } from "react-hot-toast";

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "—";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};



export default function ArchiveDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || 'deals');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            let res;
            if (activeTab === 'deals') res = await getArchivedDeals();
            else if (activeTab === 'contacts') res = await getArchivedContacts();
            else if (activeTab === 'companies') res = await getArchivedCompanies();
            
            setData(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to load archived ${activeTab}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Sync activeTab with URL params
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set("tab", activeTab);
            return newParams;
        }, { replace: true });
        
        fetchData();
    }, [activeTab]);

    const handleRestore = async (id) => {
        try {
            if (activeTab === 'deals') await restoreDeal(id);
            else if (activeTab === 'contacts') await restoreContact(id);
            else if (activeTab === 'companies') await restoreCompany(id);
            
            const singularName = activeTab === 'companies' ? 'Company' : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1);
            toast.success(`${singularName} restored successfully!`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to restore item");
        }
    };

    const filteredData = data.filter(item => {
        const name = (activeTab === 'contacts' ? `${item.firstName || ""} ${item.lastName || ""}` : (item.name || "")).toLowerCase();
        return name.includes((searchTerm || "").toLowerCase());
    });

    return (
        <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <Briefcase size={22} className="text-gray-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Archived Records</h1>
                        <p className="text-sm text-gray-400">Restore items within 30 days before permanent deletion.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/30">
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg w-fit">
                        {[
                            { id: 'deals', label: 'Deals', icon: Briefcase },
                            { id: 'contacts', label: 'Contacts', icon: Users },
                            { id: 'companies', label: 'Companies', icon: Building2 }
                        ]
                        .filter(tab => !searchParams.get("tab") || searchParams.get("tab") === tab.id)
                        .map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchTerm(""); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                                    activeTab === tab.id 
                                    ? "bg-white text-red-600 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder={`Search archived ${activeTab}...`}
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Record Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deleted Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Left</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                                            <span>Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                                                <Trash2 size={26} className="text-gray-300" />
                                            </div>
                                            <p className="font-medium text-gray-500">No archived {activeTab} found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map(item => {
                                    const deletedDate = new Date(item.deletedAt);
                                    const diffDays = Math.ceil(Math.abs(new Date() - deletedDate) / (1000 * 60 * 60 * 24));
                                    const daysLeft = Math.max(0, 30 - diffDays);
                                    
                                    const name = activeTab === 'contacts' ? `${item.firstName} ${item.lastName}` : item.name;

                                    return (
                                        <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                                                        {activeTab === 'deals' && <Briefcase size={14} />}
                                                        {activeTab === 'contacts' && <Users size={14} />}
                                                        {activeTab === 'companies' && <Building2 size={14} />}
                                                    </div>
                                                    <span className="font-bold text-gray-800 tracking-tight uppercase text-xs">{name}</span>
                                                    {activeTab === 'companies' && item.revenueRange && (
                                                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded ml-1">
                                                            {formatCurrency(item.revenueRange)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                    {activeTab === 'companies' ? 'company' : activeTab.slice(0, -1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                <span className="flex items-center gap-1.5"><Calendar size={12}/> {deletedDate.toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit ${daysLeft < 7 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    <Clock size={12} /> {daysLeft} Days
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleRestore(item._id)}
                                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border border-green-200 text-green-700 hover:bg-green-50 transition active:scale-95"
                                                >
                                                    <RefreshCcw size={13} /> Restore
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
