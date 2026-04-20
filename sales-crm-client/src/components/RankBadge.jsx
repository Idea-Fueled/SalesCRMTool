import React from "react";
import { Flame, Sun, Snowflake } from "lucide-react";

const tierConfig = {
    Hot: {
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-100",
        icon: Flame,
        glow: "shadow-red-100/50"
    },
    Warm: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-100",
        icon: Sun,
        glow: "shadow-orange-100/50"
    },
    Cold: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-100",
        icon: Snowflake,
        glow: "shadow-blue-100/50"
    }
};

export default function RankBadge({ score, tier, compact = false }) {
    const config = tierConfig[tier] || tierConfig.Cold;
    const Icon = config.icon;

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${config.bg} ${config.text} border ${config.border}`}>
                <Icon size={9} />
                {score}
            </span>
        );
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.text} border ${config.border} shadow-sm ${config.glow}`}>
            <Icon size={12} />
            <span className="text-[11px] font-black">{score}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{tier}</span>
        </div>
    );
}


