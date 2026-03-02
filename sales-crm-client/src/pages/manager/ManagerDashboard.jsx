import React, { useState, useEffect } from "react";
import {
    Users2, Briefcase, CheckCircle2, DollarSign, ChevronDown, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDeals } from "../../../API/services/dealService";
import { getCompanies } from "../../../API/services/companyService";
import { getTeamUsers } from "../../../API/services/userService";
import CompanyDetailsModal from "../../components/modals/CompanyDetailsModal";
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

const StatCard = ({ label, value, sub, color, icon: IconComp }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <IconComp size={20} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            {sub && <p className="text-xs text-red-500 font-medium mt-0.5">{sub}</p>}
        </div>
    </div>
);

const Avatar = ({ name, color = "bg-red-500" }) => {
    if (!name) return null;
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
};

const STAGE_COLORS = {
    Lead: "bg-blue-500", Qualified: "bg-purple-500", Proposal: "bg-yellow-500",
    Negotiation: "bg-orange-500", "Closed Won": "bg-green-500", "Closed Lost": "bg-red-500",
};
const repColors = ["bg-red-500", "bg-orange-500", "bg-red-600", "bg-orange-600", "bg-red-400", "bg-amber-500"];
const periodOptions = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"];

export default function ManagerDashboard() {
    const [period, setPeriod] = useState("Last 30 Days");
    const [deals, setDeals] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [dealsRes, usersRes, companiesRes] = await Promise.all([
                    getDeals({ limit: 500 }),
                    getTeamUsers(),
                    getCompanies({ limit: 1000 })
                ]);
                setDeals(dealsRes.data.data);
                setTeamMembers(usersRes.data.filter(u => u.role === "sales_rep"));
                setCompanies(companiesRes.data.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load team dashboard");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Computed stats
    const wonDeals = deals.filter(d => d.stage === "Closed Won");
    const activeDeals = deals.filter(d => !d.stage.startsWith("Closed"));
    const totalPipeline = activeDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    const wonRevenue = wonDeals.reduce((acc, d) => acc + (d.value || 0), 0);

    const formatCurrency = (val) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toLocaleString()}`;
    };

    // Per-rep stats
    const repStats = teamMembers.map((rep, i) => {
        const repDeals = deals.filter(d => d.ownerId?._id === rep._id || d.ownerId === rep._id);
        const won = repDeals.filter(d => d.stage === "Closed Won").length;
        const lost = repDeals.filter(d => d.stage === "Closed Lost").length;
        const pipeline = repDeals.filter(d => !d.stage.startsWith("Closed")).reduce((acc, d) => acc + (d.value || 0), 0);
        return {
            _id: rep._id,
            name: `${rep.firstName} ${rep.lastName}`,
            deals: repDeals.length,
            won,
            lost,
            pipeline: formatCurrency(pipeline),
            pipelineRaw: pipeline,
            lastLogin: rep.lastLogin ? new Date(rep.lastLogin).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never",
            status: rep.isActive ? "Active" : "Inactive",
            color: repColors[i % repColors.length]
        };
    });

    // Stage breakdown from real deals
    const stageData = Object.entries(STAGE_COLORS).map(([stage, bg]) => ({
        stage,
        count: deals.filter(d => d.stage === stage).length,
        color: bg
    }));
    return (
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            {/* Symmetric Navigation Header */}
            <div className="flex items-center mb-6 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                <Link to="/manager/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="mx-1.5 text-gray-200" />
                <span className="text-gray-900">Team Overview</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Team Members" value={loading ? "..." : String(teamMembers.length)} sub="+ you as manager" color="bg-red-50 text-red-600" icon={Users2} />
                <StatCard label="Team Deals" value={loading ? "..." : String(deals.length)} sub="All stages" color="bg-orange-50 text-orange-600" icon={Briefcase} />
                <StatCard label="Team Won" value={loading ? "..." : String(wonDeals.length)} sub={`${formatCurrency(wonRevenue)} revenue`} color="bg-red-600 text-white shadow-sm shadow-red-100" icon={CheckCircle2} />
                <StatCard label="Team Pipeline" value={loading ? "..." : formatCurrency(totalPipeline)} sub={`${activeDeals.length} active deals`} color="bg-red-50 text-red-600 border border-red-100" icon={DollarSign} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                <Card className="lg:col-span-3">
                    <CardHeader title="TEAM SALES REPRESENTATIVE PERFORMANCE">
                        <Select options={periodOptions} value={period} onChange={setPeriod} />
                    </CardHeader>
                    <div className="overflow-x-auto min-h-[200px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["REPRESENTATIVE", "TOTAL DEALS", "WON", "LOST", "PIPELINE VALUE", "STATUS"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading team performance...</td></tr>
                                ) : repStats.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">NO SALES REPRESENTATIVES IN YOUR TEAM YET.</td></tr>
                                ) : (
                                    repStats.map((rep) => (
                                        <tr key={rep._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={rep.name} color={rep.color} />
                                                    <div>
                                                        <p className="font-medium text-gray-800 leading-none">{rep.name}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{rep.lastLogin}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-800">{rep.deals}</td>
                                            <td className="px-4 py-3 text-green-600 font-semibold">{rep.won}</td>
                                            <td className="px-4 py-3 text-red-500 font-semibold">{rep.lost}</td>
                                            <td className="px-4 py-3 text-red-600 font-bold">{rep.pipeline}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 w-fit ${rep.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${rep.status === "Active" ? "bg-green-500" : "bg-gray-400"}`} />
                                                    {rep.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader title="Team Deals by Stage" />
                    <div className="p-5 space-y-3">
                        {stageData.map(s => {
                            const total = deals.length || 1;
                            const pct = Math.round((s.count / total) * 100);
                            return (
                                <div key={s.stage}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 font-medium">{s.stage}</span>
                                        <span className="text-gray-500">{s.count} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Won vs Lost per Rep */}
            <Card>
                <CardHeader title="WON VS LOST PER REPRESENTATIVE">
                    <Select options={periodOptions} value={period} onChange={setPeriod} />
                </CardHeader>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {loading ? (
                        <p className="text-center text-gray-400 text-sm col-span-4 py-6">Loading rep data...</p>
                    ) : repStats.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm col-span-4 py-6">NO SALES REPRESENTATIVES FOUND IN YOUR TEAM.</p>
                    ) : (
                        repStats.map((rep) => (
                            <div key={rep._id} className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <Avatar name={rep.name} color={rep.color} />
                                <p className="text-sm font-semibold text-gray-800 text-center leading-tight">{rep.name}</p>
                                <div className="w-full space-y-1.5">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Won</span>
                                            <span className="font-semibold text-green-600">{rep.won}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 rounded-full">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: rep.deals > 0 ? `${(rep.won / rep.deals) * 100}%` : "0%" }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Lost</span>
                                            <span className="font-semibold text-red-500">{rep.lost}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 rounded-full">
                                            <div className="h-full bg-red-400 rounded-full" style={{ width: rep.deals > 0 ? `${(rep.lost / rep.deals) * 100}%` : "0%" }} />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-red-600 font-bold">{rep.pipeline}</p>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <CompanyDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                company={selectedCompany}
            />
        </div>
    );
}
