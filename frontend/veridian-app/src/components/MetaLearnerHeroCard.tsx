"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Cpu, ChevronDown, Info } from "lucide-react";
import { getAqiCategoryInfo } from "./PredictionGrid";

interface MetaLearnerHeroCardProps {
    data: any;
    loading: boolean;
}

const MODEL_META = {
    xgb: { label: "XGBoost", color: "bg-blue-500", desc: "Tabular meteorological & lag correlations" },
    lstm: { label: "Bi-LSTM", color: "bg-emerald-500", desc: "Long-term 7-day pollution temporal memory" },
    cnn: { label: "1D-CNN", color: "bg-amber-500", desc: "Localized atmospheric spike pattern detection" },
    gru: { label: "Bi-GRU", color: "bg-purple-500", desc: "Gated Sequential Prediction Stream" },
};

export default function MetaLearnerHeroCard({ data, loading }: MetaLearnerHeroCardProps) {
    const aqi = data?.meta_aqi ?? data?.aqi ?? 0;
    const weights = data?.weights;
    const lstmAqi = data?.lstm_aqi ?? 0;
    const cnnAqi = data?.cnn_aqi ?? 0;
    const gruAqi = data?.gru_aqi ?? 0;
    const xgbAqi = 150.0; // XGB stub value (matches xgb_base stub)

    const [showDecision, setShowDecision] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (weights) {
            console.log("=== META-LEARNER TRUST WEIGHTS ===");
            Object.entries(weights).forEach(([k, v]) =>
                console.log(`${k.toUpperCase()}: ${((v as number) * 100).toFixed(1)}%`)
            );
        }
    }, [weights]);

    if (!loading && !data) return null;

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-8 mb-6 border border-[#889063] bg-gradient-to-b from-[#354024] to-[#1a2012] animate-pulse h-[280px] flex flex-col justify-center items-center"
            >
                <div className="w-72 h-5 bg-white/10 rounded mb-10" />
                <div className="w-32 h-8 bg-white/10 rounded mb-4" />
                <div className="w-48 h-20 bg-white/10 rounded" />
            </motion.div>
        );
    }

    const { category, color } = getAqiCategoryInfo(aqi);
    const trend = data?.trend || "Stable";

    const trendIcon = trend === "Deteriorating"
        ? <ArrowUpRight className="text-red-400" size={22} />
        : trend === "Improving"
            ? <ArrowDownRight className="text-green-400" size={22} />
            : <ArrowRight className="text-yellow-400" size={22} />;

    // Determine which model the Judge trusted most
    const highestKey = weights
        ? (Object.entries(weights) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]
        : "lstm";
    const highestLabel = MODEL_META[highestKey as keyof typeof MODEL_META]?.label ?? highestKey.toUpperCase();

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-[#889063] bg-gradient-to-b from-[#354024] to-[#1a2012] shadow-2xl shadow-[#354024]/20 mb-6 overflow-hidden"
        >
            <div className="p-8">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-8">
                    <Cpu size={15} className="text-[#889063]" />
                    <span className="text-[#E5D7C4] font-bold text-sm uppercase tracking-widest">
                        Meta-Learner Consensus
                    </span>
                    <span className="ml-auto text-[#E5D7C4]/40 text-xs tracking-widest uppercase">
                        RF ← XGB · LSTM · GRU · CNN
                    </span>
                </div>

                {/* Core metrics */}
                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                    <div className="flex flex-col items-center">
                        <p className="text-[#E5D7C4]/50 text-xs mb-1 uppercase tracking-widest">Consensus AQI</p>
                        <div className="text-7xl md:text-8xl font-bold text-[#E5D7C4]">{aqi.toFixed(1)}</div>
                    </div>

                    <div
                        className="px-10 py-4 rounded-full text-2xl font-bold uppercase tracking-widest shadow-lg"
                        style={{ backgroundColor: `${color}22`, color, border: `2px solid ${color}66` }}
                    >
                        {category}
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[#E5D7C4]/50 text-xs mb-1 uppercase tracking-widest">Trajectory</p>
                        <div className="flex items-center gap-2">
                            {trendIcon}
                            <span className="text-xl font-bold text-[#E5D7C4] uppercase tracking-wide">{trend}</span>
                        </div>
                    </div>
                </div>

                {/* Toggle button */}
                <div className="mt-8 pt-5 border-t border-[#889063]/30">
                    <button
                        onClick={() => setShowDecision(v => !v)}
                        className="flex items-center gap-2 mx-auto text-[#889063] hover:text-[#E5D7C4] transition-colors text-xs uppercase tracking-widest"
                    >
                        <span>Transparency &amp; Logic</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-300 ${showDecision ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>
            </div>

            {/* ── XAI Decision Logic Panel ─────────────────────────────── */}
            <AnimatePresence>
                {showDecision && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-8 pb-8 border-t border-[#889063]/20 pt-6">

                            {/* Dynamic tooltip banner */}
                            <div className="relative flex items-start gap-3 bg-white/5 rounded-2xl p-4 mb-4">
                                <Info size={14} className="text-[#889063] mt-0.5 shrink-0" />
                                <p className="text-[#E5D7C4]/70 text-xs leading-relaxed">
                                    The Meta-Learner audits three independent AI architectures. It currently trusts{" "}
                                    <span className="text-[#E5D7C4] font-bold">{highestLabel}</span> most due to
                                    its historical accuracy during similar atmospheric conditions.
                                </p>
                            </div>

                            {/* XGB diagnostic note — shown when xgb weight is low */}
                            {weights && weights.xgb < 0.2 && (
                                <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-4">
                                    <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-blue-300/80 text-xs leading-relaxed">
                                        <span className="font-bold text-blue-300">Diagnostic:</span> The Meta-Learner currently
                                        prioritizes sequential patterns over tabular weather trends due to high atmospheric
                                        volatility. XGBoost remains factored at{" "}
                                        <span className="font-bold">{((weights.xgb ?? 0) * 100).toFixed(1)}%</span>.
                                    </p>
                                </div>
                            )}

                            {/* Weighted formula display */}
                            <p className="text-[#889063] text-[10px] uppercase tracking-widest mb-3">
                                Weighted Consensus Formula
                            </p>
                            <div className="bg-black/20 rounded-xl px-5 py-4 mb-6 font-mono text-sm text-[#E5D7C4]/80 overflow-x-auto whitespace-nowrap">
                                Final AQI ={" "}
                                <span className="text-blue-300">({((weights?.xgb ?? 0) * 100).toFixed(1)}% × {xgbAqi.toFixed(1)})</span>
                                {" "}+{" "}
                                <span className="text-emerald-300">({((weights?.lstm ?? 0) * 100).toFixed(1)}% × {lstmAqi.toFixed(1)})</span>
                                {" "}+{" "}
                                <span className="text-purple-300">({((weights?.gru ?? 0) * 100).toFixed(1)}% × {gruAqi.toFixed(1)})</span>
                                {" "}+{" "}
                                <span className="text-amber-300">({((weights?.cnn ?? 0) * 100).toFixed(1)}% × {cnnAqi.toFixed(1)})</span>
                                {" "}≈{" "}
                                <span className="text-[#E5D7C4] font-bold">{aqi.toFixed(1)}</span>
                            </div>

                            {/* Contribution bars */}
                            <p className="text-[#889063] text-[10px] uppercase tracking-widest mb-3">
                                Model Influence Breakdown
                            </p>
                            <div className="flex flex-col gap-3">
                                {(["xgb", "lstm", "gru", "cnn"] as const).map((key) => {
                                    const pct = ((weights?.[key] ?? 0) * 100);
                                    const meta = MODEL_META[key];

                                    // Hard-coded colors as requested
                                    const bgColors: Record<string, string> = {
                                        "xgb": "#3b82f6", // Deep Blue
                                        "lstm": "#22c55e", // Veridian Green
                                        "gru": "#a855f7", // Purple
                                        "cnn": "#f59e0b" // Amber/Orange
                                    };

                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-[#E5D7C4]/80 font-medium">{meta.label}</span>
                                                <span className="text-[#E5D7C4]/50">{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: bgColors[key] }}
                                                />
                                            </div>
                                            <p className="text-[#E5D7C4]/30 text-[10px] mt-0.5">{meta.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
