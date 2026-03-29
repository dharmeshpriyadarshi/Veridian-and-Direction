"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, Activity, BarChart3, Database, ShieldCheck } from "lucide-react";
import { getAqiCategoryInfo, getAqiGradient, getSeverityWidth } from "./PredictionGrid";

interface MethodCardProps {
    methodNumber: number;
    title: string;
    subtitle: string;
    aqi: number | null;
    trend?: string | null;
    insight?: string | null;
    /** Rich neural insight object from the API e.g. { memory_window: "...", ... } */
    neuralInsights?: Record<string, string> | null;
    loading?: boolean;
}

/** Consistent stat block matching Method 1's StatCard style. */
function InsightBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2 text-[#E5D7C4]/40 mb-2">
                {icon}
                <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className="text-sm font-bold text-[#E5D7C4]">{value}</p>
        </div>
    );
}

export default function MethodCard({
    methodNumber, title, subtitle, aqi, trend, insight, neuralInsights, loading
}: MethodCardProps) {
    const safeAqi = aqi ?? 0;
    const { category, color } = getAqiCategoryInfo(safeAqi);
    const gradient = getAqiGradient(safeAqi);
    const severityPct = getSeverityWidth(safeAqi);

    if (!loading && aqi === null) return null;

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-3xl p-8 mb-0 animate-pulse h-[260px] w-full"
            />
        );
    }

    // Build 4 insight blocks from neuralInsights object (or fall back to defaults)
    const insightEntries = neuralInsights
        ? Object.entries(neuralInsights).slice(0, 4)
        : [];

    const trendColor = trend === "Deteriorating"
        ? "text-red-400"
        : trend === "Improving"
            ? "text-emerald-400"
            : "text-yellow-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-8 mb-0 w-full"
        >
            {/* Header — matches Method 1/2 style */}
            <div className="flex items-center gap-2 text-foreground/40 text-sm uppercase tracking-widest mb-6">
                <Cpu size={14} />
                Method {methodNumber} — {title}
                <span className="ml-auto text-[10px] text-foreground/25 normal-case">{subtitle}</span>
            </div>

            {/* Body: left (AQI) + right (insight blocks) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: big AQI + badge */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center">
                    <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-b ${gradient} bg-clip-text text-transparent`}>
                        {safeAqi.toFixed(0)}
                    </div>
                    <p className="text-foreground/50 text-sm mt-1">Predicted AQI</p>
                    <div
                        className="mt-4 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                        {category}
                    </div>
                    {trend && (
                        <p className={`text-xs uppercase tracking-widest font-medium mt-3 ${trendColor}`}>
                            {trend}
                        </p>
                    )}
                </div>

                {/* Right: 2×2 neural insight blocks */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {insightEntries.length > 0 ? (
                        insightEntries.map(([key, val]) => (
                            <InsightBlock
                                key={key}
                                icon={<BarChart3 size={14} />}
                                label={key.replace(/_/g, " ")}
                                value={val}
                            />
                        ))
                    ) : (
                        // Fallback 4 blocks when no neuralInsights
                        <>
                            <InsightBlock icon={<Activity size={14} />} label="Architecture" value={title} />
                            <InsightBlock icon={<Database size={14} />} label="Input Shape" value="(7, 21)" />
                            <InsightBlock icon={<ShieldCheck size={14} />} label="Trend" value={trend ?? "—"} />
                            <InsightBlock icon={<BarChart3 size={14} />} label="Category" value={category} />
                        </>
                    )}
                </div>
            </div>

            {/* AQI Range Bar — visually identical to Method 1 */}
            <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">AQI Range Visualization</p>
                <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: "linear-gradient(to right, #4ade80 0%, #a3e635 10%, #facc15 20%, #f97316 40%, #ef4444 60%, #991b1b 100%)",
                            opacity: 0.15
                        }}
                    />
                    <div
                        className="absolute top-0 h-full rounded-full"
                        style={{
                            left: `${Math.max(severityPct - 8, 0)}%`,
                            width: "8%",
                            background: `linear-gradient(to right, ${color}88, ${color})`,
                        }}
                    />
                    <div
                        className="absolute top-[-4px] w-1 h-5 rounded-full bg-white shadow-lg shadow-white/30"
                        style={{ left: `${severityPct}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-foreground/30 mt-2">
                    <span>0 (Good)</span><span>50</span><span>100</span><span>200</span><span>300</span><span>500 (Severe)</span>
                </div>

                {/* Derived insight footnote */}
                {insight && (
                    <p className="text-[#E5D7C4]/25 text-[10px] italic mt-3">⚙ {insight}</p>
                )}
            </div>
        </motion.div>
    );
}
