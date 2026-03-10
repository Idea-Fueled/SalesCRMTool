import React, { useState, useEffect } from "react";
import { 
    Trash2, RefreshCcw, Briefcase, Building2, Users, 
    Calendar, AlertCircle, ChevronRight, Search, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { getArchivedDeals, restoreDeal } from "../../../API/services/dealService";
import { getArchivedContacts, restoreContact } from "../../../API/services/contactService";
import { getArchivedCompanies, restoreCompany } from "../../../API/services/companyService";
import { toast } from "react-hot-toast";

const TrashItem = ({ item, type, onRestore }) => {
    const deletedDate = new Date(item.deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now - deletedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 30 - diffDays);

    const getDisplayName = () => {
        if (type === 'deals') return item.name;
        if (type === 'contacts') return `${item.firstName} ${item.lastName}`;
        if (type === 'companies') return item.name;
        return 'Unknown';
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                        {type === 'deals' && <Briefcase size={20} />}
                        {type === 'contacts' && <Users size={20} />}
                        {type === 'companies' && <Building2 size={20} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-red-500 transition-colors uppercase tracking-tight">
                            {getDisplayName()}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                Deleted on {deletedDate.toLocaleDateString()}
                            </span>
                            <span className={`flex items-center gap-1 font-bold ${daysLeft < 7 ? 'text-red-500' : 'text-orange-500'}`}>
                                <Clock size={12} />
                                {daysLeft} Days Left
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onRestore(item._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                    <RefreshCcw size={14} />
                    Restore
                </button>
            </div>
        </div>
    );
};

export default function ArchiveDashboard() {
    const [activeTab, setActiveTab] = useState('deals');
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
        fetchData();
    }, [activeTab]);

    const handleRestore = async (id) => {
        try {
            if (activeTab === 'deals') await restoreDeal(id);
            else if (activeTab === 'contacts') await restoreContact(id);
            else if (activeTab === 'companies') await restoreCompany(id);
            
            toast.success(`${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)} restored successfully!`);
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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Breadcrumbs */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <Link to="/dashboard" className="hover:text-red-600 transition-colors">Admin Overview</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Trash & Archive</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Trash2 className="text-red-500" size={28} />
                        Archived Records
                    </h1>
                    <p className="text-gray-500 mt-1">Restore deleted items within 30 days. After 30 days, they remain archived permanently.</p>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={`Search archived ${activeTab}...`}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl w-fit">
                {[
                    { id: 'deals', label: 'Deals', icon: Briefcase },
                    { id: 'contacts', label: 'Contacts', icon: Users },
                    { id: 'companies', label: 'Companies', icon: Building2 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchTerm("");
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === tab.id 
                            ? "bg-white text-red-600 shadow-sm" 
                            : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.map(item => (
                        <TrashItem 
                            key={item._id} 
                            item={item} 
                            type={activeTab} 
                            onRestore={handleRestore} 
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No archived {activeTab}</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Items you delete will appear here for 30 days before being moved to permanent archive.</p>
                </div>
            )}

            <div className="flex items-start gap-4 p-5 bg-red-50/50 border border-red-100/50 rounded-2xl">
                <AlertCircle size={20} className="text-red-500 shrink-0" />
                <div className="text-xs text-gray-600 leading-relaxed">
                    <p className="font-bold text-red-700 mb-1 uppercase tracking-tight">Important Policy:</p>
                    <p>Records in the trash can only be restored within <strong>30 days</strong> of deletion. After this period, they are automatically moved to terminal archive and cannot be restored to active dashboards but will remain in database for compliance and audit purposes.</p>
                </div>
            </div>
        </div>
    );
}
