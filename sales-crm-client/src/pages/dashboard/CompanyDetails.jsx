import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCompanyById } from "../../../API/services/companyService";
import {
    Building2, User, MapPin, Globe, Phone,
    Mail, Briefcase, Calendar, Clock, ArrowLeft,
    ChevronRight, Download, RotateCw, Maximize2,
    Star, Layers, Users, Target, Info, DollarSign,
    MoreHorizontal, List, FileText, Paperclip,
    Loader2, ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";

const companyStatusPipeline = [
    { id: "Lead", label: "Lead Identification" },
    { id: "Prospect", label: "Professional Prospect" },
    { id: "Customer", label: "Active Customer" },
    { id: "Churned", label: "Relationship Ended" }
];

const formatDate = (date, includeTime = false) => {
    if (!date) return "Not Set";
    const options = {
        day: "numeric",
        month: "short",
        year: "numeric",
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(date).toLocaleString("en-IN", options);
};

export default function CompanyDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await getCompanyById(id);
                setCompany(res.data.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to fetch company details");
            } finally {
                setLoading(false);
            }
        };
        fetchCompany();
    }, [id]);

    const getInitials = (name) => {
        if (!name) return "C";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-semibold">Company not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={18} /> Go Back
                </button>
            </div>
        );
    }

    const basePath = window.location.pathname.startsWith('/rep') ? '/rep' :
        window.location.pathname.startsWith('/manager') ? '/manager' : '/dashboard';

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to={basePath} className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <Link to={`${basePath}/companies`} className="hover:text-red-600 transition-colors">Companies</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">View Details</span>
            </div>

            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-red-600 border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-black ring-1 ring-red-100 uppercase">
                        {getInitials(company.name)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 leading-none">{company.name}</h1>
                            <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Layers size={14} className="text-gray-300" />
                                <span>{company.industry || "General Industry"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <MapPin size={12} className="text-red-400" />
                                <span>{company.address || "Main global headquarters"}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                </div>
            </div>

            {/* Main Content Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Information */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Company Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Operational Identity</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users size={10} className="text-red-400" /> Company Size
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.size || "1-10"} Employees</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe size={10} className="text-red-400" /> Website
                                </label>
                                {company.website ? (
                                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-red-600 hover:underline flex items-center gap-1">
                                        {company.website} <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <p className="text-sm font-bold text-gray-300 italic">No website</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign size={10} className="text-green-500" /> Revenue Range
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.revenueRange || "Private information"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <User size={10} className="text-red-400" /> Notes
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.notes || "No notes recorded"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone size={10} className="text-red-400" /> Phone
                                </label>
                                <p className="text-sm font-bold text-gray-900">{company.phone || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <MapPin size={10} className="text-red-400" /> Headquarters
                                </label>
                                <p className="text-sm font-bold text-gray-900 leading-relaxed">{company.address || "No address on file"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Owner */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Strategic Owner</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ring-1 ring-red-100">
                                    {company.ownerId?.firstName?.[0]}{company.ownerId?.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 leading-none">{company.ownerId?.firstName} {company.ownerId?.lastName || ""}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Account Executive</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Status & Interactions */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Pipeline Status */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Account Lifecycle Status</h3>
                        <div className="flex flex-wrap items-center">
                            {companyStatusPipeline.map((stage, index) => {
                                const currentStatusIndex = companyStatusPipeline.findIndex(s => s.id === (company.status || "Lead"));
                                const isActive = index <= (currentStatusIndex === -1 ? 0 : currentStatusIndex);
                                return (
                                    <div key={stage.id} className="flex-1 min-w-[150px] relative group h-10 mb-2 mr-2">
                                        <div className={`
                                            h-full w-full flex items-center justify-center text-[10px] font-bold px-4
                                            transition-all duration-300 cursor-default
                                            ${isActive
                                                ? (index === 0 ? "bg-blue-600 text-white" : index === 1 ? "bg-amber-400 text-white" : index === 2 ? "bg-green-600 text-white" : "bg-red-600 text-white")
                                                : "bg-gray-100 text-gray-400"}
                                            ${index === 0 ? "rounded-l-lg" : ""}
                                            ${index === companyStatusPipeline.length - 1 ? "rounded-r-lg" : ""}
                                            relative z-10
                                        `}
                                            style={{
                                                clipPath: index === 0
                                                    ? "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)"
                                                    : index === companyStatusPipeline.length - 1
                                                        ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10% 50%)"
                                                        : "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)"
                                            }}>
                                            {stage.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="px-6 h-14 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Corporate Remarks</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full">
                                <Clock size={12} className="text-red-400" /> Operational Status
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Narratives/Intel */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                                    <FileText size={10} /> Operational Intel
                                </div>
                                <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 text-[13px] text-gray-600 leading-relaxed italic whitespace-pre-wrap shadow-inner">
                                    {company.notes || "No operational intelligence or interaction notes recorded for this organization yet."}
                                </div>
                            </div>


                            {/* Cross-Linking Stats */}
                            <div className="pt-8 grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
                                    <Target size={14} className="text-gray-300" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">0 Opportunities Open</span>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
                                    <Users size={14} className="text-gray-300" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Multiple Stakeholders Linked</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Meta Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-300" /> Registry Datestamp: {formatDate(company.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-300" /> Last System Update: {formatDate(company.updatedAt)}</span>
                </div>
                <span>Ref-ID: {company._id}</span>
            </div>
        </div>
    );
}
