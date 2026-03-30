import React from "react";
import RankBadge from "../RankBadge";
import { Briefcase, Building2, User, Mail, Linkedin, ExternalLink } from "lucide-react";

/**
 * Renders a single chat message — user bubble or bot bubble with optional data cards.
 */
export default function ChatMessage({ message }) {
    const { role, text, data, type } = message;

    // User message
    if (role === "user") {
        return (
            <div className="flex justify-end mb-3">
                <div className="max-w-[85%] bg-red-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm font-medium shadow-md">
                    {text}
                </div>
            </div>
        );
    }

    // Check if this is a detail/summary response (bullet-point text)
    const isDetail = type?.includes("detail");

    // Bot message
    return (
        <div className="flex justify-start mb-3">
            <div className="max-w-[90%] space-y-2">
                {/* Text reply */}
                {text && (
                    <div
                        className={`bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm leading-relaxed ${isDetail ? "text-xs" : "text-sm"} text-gray-700`}
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }}
                    />
                )}

                {/* Data cards (only for list responses) */}
                {data && data.length > 0 && !isDetail && (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
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

    return (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 group-hover:text-red-500 transition-colors">
                    {isDeal ? <Briefcase size={13} /> : isCompany ? <Building2 size={13} /> : <User size={13} />}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-800 truncate leading-tight">
                        {item.name}
                    </p>
                    <p className="text-[9px] text-gray-400 truncate">
                        {isDeal ? `${item.value} · ${item.stage}` :
                         isCompany ? `${item.industry} · ${item.status}` :
                         `${item.jobTitle} · ${item.company}`}
                    </p>
                </div>
            </div>
            <RankBadge score={item.score} tier={item.tier} compact />
        </div>
    );
}
