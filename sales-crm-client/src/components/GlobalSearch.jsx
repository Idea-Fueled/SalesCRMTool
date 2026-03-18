import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Briefcase, Building2, ContactRound, X, Loader2, MessageSquare, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getDeals } from "../API/services/dealService";
import { getContacts } from "../API/services/contactService";
import { getCompanies } from "../API/services/companyService";

const stageBadge = {
    Lead: "bg-red-50 text-red-600 border border-red-100", Qualified: "bg-orange-100 text-orange-700",
    Proposal: "bg-yellow-100 text-yellow-700", Negotiation: "bg-orange-100 text-orange-700",
    "Closed Won": "bg-green-100 text-green-700", "Closed Lost": "bg-red-100 text-red-700",
};

export default function GlobalSearch({ isOpen, onClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({ deals: [], contacts: [], companies: [] });
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Flatten results for keyboard navigation
    const flatResults = useMemo(() => {
        return [
            ...results.deals.map(d => ({ ...d, type: 'deal' })),
            ...results.contacts.map(c => ({ ...c, type: 'contact' })),
            ...results.companies.map(co => ({ ...co, type: 'company' }))
        ];
    }, [results]);

    // Auto-focus on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setResults({ deals: [], contacts: [], companies: [] });
            setSelectedIndex(-1);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Reset selected index when query or results change
    useEffect(() => {
        if (flatResults.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [flatResults]);

    // ESC to close
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults({ deals: [], contacts: [], companies: [] });
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            setResults({ deals: [], contacts: [], companies: [] }); // Clear results immediately
            try {
                const [dealsRes, contactsRes, companiesRes] = await Promise.all([
                    getDeals({ name: query, limit: 5 }),
                    getContacts({ name: query, limit: 5 }),
                    getCompanies({ name: query, limit: 5 }),
                ]);
                setResults({
                    deals: dealsRes.data.data || [],
                    contacts: contactsRes.data.data || [],
                    companies: companiesRes.data.data || [],
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const handleNavigate = useCallback((item) => {
        const getBasePath = () => {
            if (!user) return "/dashboard";
            if (user.role === "admin") return "/dashboard";
            if (user.role === "sales_manager") return "/manager";
            if (user.role === "sales_rep") return "/rep";
            return "/dashboard";
        };
        const basePath = getBasePath();
        let path = "";
        if (item.type === 'deal') path = `${basePath}/deals/${item._id}`;
        else if (item.type === 'contact') path = `${basePath}/contacts/${item._id}`;
        else if (item.type === 'company') path = `${basePath}/companies/${item._id}`;
        
        if (path) {
            navigate(path);
            onClose();
        }
    }, [user, navigate, onClose]);

    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0 && selectedIndex < flatResults.length) {
                handleNavigate(flatResults[selectedIndex]);
            }
        }
    };

    const total = flatResults.length;
    const hasResults = total > 0;

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4"
            style={{ background: "rgba(15,15,25,0.65)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden pointer-events-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                    {loading
                        ? <Loader2 size={18} className="text-gray-400 animate-spin flex-shrink-0" />
                        : <Search size={18} className="text-gray-400 flex-shrink-0" />
                    }
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search deals, contacts, companies..."
                        className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                    <kbd className="hidden sm:block text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[420px] overflow-y-auto">
                    {!query.trim() && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <Search size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Start typing to search</p>
                            <p className="text-xs mt-1">Search across deals, contacts, and companies</p>
                        </div>
                    )}

                    {query.trim() && !loading && !hasResults && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <p className="font-medium">No results for "{query}"</p>
                            <p className="text-xs mt-1">Try a different keyword</p>
                        </div>
                    )}

                    {/* Deals */}
                    {results.deals.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                                <Briefcase size={13} className="text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deals</span>
                                <span className="ml-auto text-xs text-gray-400">{results.deals.length} result{results.deals.length > 1 ? "s" : ""}</span>
                            </div>
                            {results.deals.map((d, i) => {
                                const index = i;
                                const isSelected = selectedIndex === index;
                                return (
                                    <button
                                        key={d._id}
                                        type="button"
                                        className={`w-full text-left block px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors relative z-[1001] pointer-events-auto ${isSelected ? 'bg-red-50 border-red-100' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleNavigate({ ...d, type: 'deal' })}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 text-left">
                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>{d.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{d.companyId?.name || "No company"}</p>
                                            </div>
                                            <div className="flex-shrink-0 flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stageBadge[d.stage] || "bg-gray-100 text-gray-600"}`}>{d.stage}</span>
                                                <span className="text-xs font-semibold text-gray-700">${d.value?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Contacts */}
                    {results.contacts.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                                <ContactRound size={13} className="text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</span>
                                <span className="ml-auto text-xs text-gray-400">{results.contacts.length} result{results.contacts.length > 1 ? "s" : ""}</span>
                            </div>
                            {results.contacts.map((c, i) => {
                                const index = results.deals.length + i;
                                const isSelected = selectedIndex === index;
                                return (
                                    <button
                                        key={c._id}
                                        type="button"
                                        className={`w-full text-left block px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors relative z-[1001] pointer-events-auto ${isSelected ? 'bg-red-50 border-red-100' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleNavigate({ ...c, type: 'contact' })}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-colors ${isSelected ? 'bg-red-700' : 'bg-red-600'}`}>
                                                {`${c.firstName?.[0] || ""}${c.lastName?.slice(-1) || ""}`.toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>{c.firstName} {c.lastName}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{c.jobTitle || c.email || "—"} · {c.companyId?.name || "No company"}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Companies */}
                    {results.companies.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                                <Building2 size={13} className="text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Companies</span>
                                <span className="ml-auto text-xs text-gray-400">{results.companies.length} result{results.companies.length > 1 ? "s" : ""}</span>
                            </div>
                            {results.companies.map((co, i) => {
                                const index = results.deals.length + results.contacts.length + i;
                                const isSelected = selectedIndex === index;
                                return (
                                    <button
                                        key={co._id}
                                        type="button"
                                        className={`w-full text-left block px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors relative z-[1001] pointer-events-auto ${isSelected ? 'bg-red-50 border-red-100' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleNavigate({ ...co, type: 'company' })}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="flex items-center justify-between gap-3 text-left">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>{co.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{co.industry || "—"} · {co.size || "—"}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${co.status === "Active" ? "bg-green-100 text-green-700" : co.status === "Prospect" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{co.status || "—"}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400 bg-white relative z-[1002]">
                    <div className="flex items-center gap-1.5 font-medium">
                        <kbd className="font-mono bg-gray-50 border border-gray-100 px-1 py-0.5 rounded shadow-sm text-gray-500">↑↓</kbd> 
                        <span>to navigate</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                        <kbd className="font-mono bg-gray-50 border border-gray-100 px-1 py-0.5 rounded shadow-sm text-gray-500">ENTER</kbd> 
                        <span>to select</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                        <kbd className="font-mono bg-gray-50 border border-gray-100 px-1 py-0.5 rounded shadow-sm text-gray-500">ESC</kbd> 
                        <span>to close</span>
                    </div>
                    <span className="ml-auto font-bold text-red-500/80">{hasResults ? `${total} result${total > 1 ? "s" : ""}` : ""}</span>
                </div>
            </div>
        </div>
    );
}
