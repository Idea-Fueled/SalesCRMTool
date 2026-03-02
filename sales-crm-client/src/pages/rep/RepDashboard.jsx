import React, { useState, useEffect } from "react";
import {
    Briefcase, CheckCircle2, DollarSign, Building2, ChevronDown, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDeals } from "../../../API/services/dealService";
import { getCompanies } from "../../../API/services/companyService";
import CompanyDetailsModal from "../../components/modals/CompanyDetailsModal";
import DealDetailsModal from "../../components/modals/DealDetailsModal";
import { toast } from "react-hot-toast";
import { Eye } from "lucide-react";

const Select = ({ options, value, onChange }) => (
    <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
            className="appearance-none text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 hover:border-gray-300 transition">
            {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
);

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ title, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const StageBadge = ({ stage }) => {
    const map = {
        Lead: "bg-red-50 text-red-600 border border-red-100", Qualified: "bg-orange-100 text-orange-700",
        Proposal: "bg-yellow-100 text-yellow-700", Negotiation: "bg-orange-100 text-orange-700",
        "Closed Won": "bg-green-100 text-green-700", "Closed Lost": "bg-red-100 text-red-700",
    };
    return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${map[stage] || "bg-gray-100 text-gray-600"}`}>{stage}</span>;
};

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const STAGE_COLORS = {
    Lead: "bg-red-500", Qualified: "bg-orange-500", Proposal: "bg-yellow-500",
    Negotiation: "bg-orange-400", "Closed Won": "bg-green-500", "Closed Lost": "bg-red-600",
};

const periodOptions = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"];

export default function RepDashboard() {
    const [period, setPeriod] = useState("Last 30 Days");
    const [deals, setDeals] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isCompanyDetailsOpen, setIsCompanyDetailsOpen] = useState(false);
    const [isDealDetailsOpen, setIsDealDetailsOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [dealsRes, companiesRes] = await Promise.all([
                    getDeals({ limit: 100 }),
                    getCompanies({ limit: 100 })
                ]);
                setDeals(dealsRes.data.data);
                setCompanies(companiesRes.data.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Computed stats from live data
    const wonDeals = deals.filter(d => d.stage === "Closed Won");
    const activeDeals = deals.filter(d => !d.stage.startsWith("Closed"));
    const lostDeals = deals.filter(d => d.stage === "Closed Lost");
    const totalPipeline = activeDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    const totalWon = wonDeals.reduce((acc, d) => acc + (d.value || 0), 0);

    // Stage breakdown from live data
    const stageData = STAGES.map(s => ({
        stage: s,
        count: deals.filter(d => d.stage === s).length,
        color: STAGE_COLORS[s]
    })).filter(s => s.count > 0);

    const formatCurrency = (val) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toLocaleString()}`;
    };

    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-6 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/rep/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Personal Overview</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your personal CRM activity overview</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "My Deals", value: loading ? "..." : String(deals.length), sub: "Across all stages", color: "bg-red-50 text-red-600", icon: Briefcase },
                    { label: "Deals Won", value: loading ? "..." : String(wonDeals.length), sub: `${formatCurrency(totalWon)} won`, color: "bg-red-600 text-white shadow-sm shadow-red-100", icon: CheckCircle2 },
                    { label: "My Pipeline", value: loading ? "..." : formatCurrency(totalPipeline), sub: `${activeDeals.length} in progress`, color: "bg-red-50 text-red-600 border border-red-100", icon: DollarSign },
                    { label: "My Companies", value: loading ? "..." : String(companies.length), sub: "Active accounts", color: "bg-orange-50 text-orange-600", icon: Building2 },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                            <p className="text-sm text-gray-500">{s.label}</p>
                            {s.sub && <p className="text-xs text-green-500 font-medium mt-0.5">{s.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h2 className="font-bold text-gray-800">My Recent Deals</h2>
                        <Select options={periodOptions} value={period} onChange={setPeriod} />
                    </div>
                    <div className="overflow-x-auto min-h-[200px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["Deal Name", "Company", "Stage", "Value", "Close Date"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading deals...</td></tr>
                                ) : deals.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No deals yet. Create your first deal!</td></tr>
                                ) : (
                                    deals.slice(0, 10).map((d) => (
                                        <tr key={d._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap cursor-pointer hover:text-red-600 transition-colors"
                                                onClick={() => { setSelectedDeal(d); setIsDealDetailsOpen(true); }}>
                                                {d.name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap cursor-pointer hover:text-red-600 transition-colors"
                                                onClick={() => {
                                                    const comp = companies.find(c => c._id === (d.companyId?._id || d.companyId));
                                                    if (comp) { setSelectedCompany(comp); setIsCompanyDetailsOpen(true); }
                                                }}>
                                                {d.companyId?.name || d.companyName || "—"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap"><StageBadge stage={d.stage} /></td>
                                            <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">{formatCurrency(d.value || 0)}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 mb-4">My Pipeline Stages</h3>
                    <div className="space-y-4">
                        {deals.length === 0 && !loading ? (
                            <p className="text-center py-6 text-gray-400 text-sm">No pipeline data yet</p>
                        ) : (
                            stageData.map(s => {
                                const pct = deals.length > 0 ? Math.round((s.count / deals.length) * 100) : 0;
                                return (
                                    <div key={s.stage}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 font-medium">{s.stage}</span>
                                            <span className="text-gray-500">{s.count} ({pct}%)</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                                <p className="text-xl font-bold text-green-700">{formatCurrency(totalWon)}</p>
                                <p className="text-xs text-green-600 font-medium">Total Won</p>
                            </div>
                            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                                <p className="text-xl font-bold text-red-500">{lostDeals.length}</p>
                                <p className="text-xs text-red-400 font-medium">Total Lost</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity: shows last 5 deals as activity feed */}
            <Card>
                <CardHeader title="Recent Deals Activity" />
                <div className="p-5 space-y-3">
                    {loading ? (
                        <p className="text-center py-4 text-gray-400 text-sm">Loading activity...</p>
                    ) : deals.length === 0 ? (
                        <p className="text-center py-4 text-gray-400 text-sm">No recent activity</p>
                    ) : (
                        deals.slice(0, 5).map((d) => {
                            const color = STAGE_COLORS[d.stage] || "bg-gray-400";
                            return (
                                <div key={d._id} className="flex items-start gap-4">
                                    <div className={`w-2.5 h-2.5 rounded-full ${color} mt-1.5 flex-shrink-0`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{d.name}</p>
                                        <p className="text-xs text-gray-500">{d.stage} · {d.companyId?.name || "No company"}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0 font-semibold text-green-700">{formatCurrency(d.value || 0)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            <CompanyDetailsModal
                isOpen={isCompanyDetailsOpen}
                onClose={() => setIsCompanyDetailsOpen(false)}
                company={selectedCompany}
            />
            <DealDetailsModal
                isOpen={isDealDetailsOpen}
                onClose={() => setIsDealDetailsOpen(false)}
                deal={selectedDeal}
            />
        </div>
    );
}
