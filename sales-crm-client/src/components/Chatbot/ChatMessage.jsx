import React from "react";
import RankBadge from "../RankBadge";
import { Briefcase, Building2, User, Mail, Linkedin, ExternalLink } from "lucide-react";

/**
 * Renders a single chat message — user bubble or bot bubble with optional data cards.
 */
export default function ChatMessage({ message, isLast }) {
    const { role, text, data, type } = message;

    // User message
    if (role === "user") {
        return (
            <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="max-w-[85%] bg-gradient-to-br from-red-600 to-red-800 text-white px-5 py-3 rounded-3xl rounded-br-lg text-sm font-semibold shadow-lg shadow-red-900/10 border border-white/10 tracking-tight">
                    {text}
                </div>
            </div>
        );
    }

    // Check if this is a detail/summary response (bullet-point text)
    const isDetail = type?.includes("detail");

    // Bot message
    return (
        <div className={`flex justify-start mb-4 ${isLast ? 'animate-in fade-in slide-in-from-left-3 duration-500' : ''}`}>
            <div className="max-w-[92%] space-y-3">
                {/* Text reply */}
                {text && (
                    <div
                        className={`bg-white/90 backdrop-blur-sm border border-white px-5 py-4 rounded-3xl rounded-bl-lg shadow-[0_5px_15px_-3px_rgba(0,0,0,0.05)] leading-relaxed ${isDetail ? "text-xs tracking-wide" : "text-sm font-medium"} text-gray-700 ring-1 ring-black/5`}
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }}
                    />
                )}

                {/* Data cards (only for list responses) */}
                {data && data.length > 0 && !isDetail && (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar-premium pr-1 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                        {data.map((item, i) => (
                            <DataCard key={i} item={item} type={type} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Simple markdown → HTML (bold, newlines, bullet points) */
function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
        .replace(/• /g, '<span class="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5 relative top-[-1px]"></span>');
}

/** Renders a compact card for a deal/company/contact */
function DataCard({ item, type }) {
    const isDeal = type?.includes("deal");
    const isCompany = type?.includes("company");
    const isUser = type?.includes("user");

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/60 border border-white rounded-2xl hover:bg-white hover:shadow-md hover:border-red-100 transition-all duration-300 group ring-1 ring-black/5">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-all duration-300">
                    {isDeal ? <Briefcase size={15} /> : isCompany ? <Building2 size={15} /> : <User size={15} />}
                </div>
                <div className="min-w-0">
                    <p className="text-[12px] font-bold text-gray-800 truncate leading-tight group-hover:text-red-600 transition-colors">
                        {item.name}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5 opacity-70">
                        {isDeal ? `$${(item.value || 0).toLocaleString()} · ${item.stage || "Lead"}` :
                         isCompany ? `${item.industry || "General"} · ${item.status || "Active"}` :
                         isUser ? `${item.role || "User"} · ${item.email}` :
                         `${item.jobTitle || "Contact"} · ${item.company || "Direct"}`}
                    </p>
                </div>
            </div>
            <div className="flex-shrink-0 scale-90 group-hover:scale-100 transition-transform duration-300">
                {!isUser && item.score !== undefined && (
                    <RankBadge score={item.score} tier={item.tier} compact />
                )}
            </div>
        </div>
    );
}
