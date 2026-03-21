"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Layers } from "lucide-react";
import { getAqiCategoryInfo } from "./PredictionGrid";

interface UnifiedResultCardProps {
    data: any;
    loading: boolean;
}

export default function UnifiedResultCard({ data, loading }: UnifiedResultCardProps) {
    const aqi = data?.aqi || 0;
    const contributions = data?.model_contributions;

    // Hooks must come before any early returns (Rules of Hooks)
    useEffect(() => {
        if (contributions) {
            console.log("=== META-ENSEMBLE MODEL TRUST CONTRIBUTIONS ===");
            console.log(`XGBoost (Tabular Proxy): ${(contributions.XGB * 100).toFixed(1)}%`);
            console.log(`LSTM (Long-term Temporal): ${(contributions.LSTM * 100).toFixed(1)}%`);
            console.log(`1D-CNN (Local Shocks): ${(contributions.CNN * 100).toFixed(1)}%`);
        }
    }, [contributions]);

    if (!loading && !data) return null;

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-8 mb-6 border border-[#889063] bg-gradient-to-b from-[#354024] to-[#1a2012] animate-pulse h-[320px] flex flex-col justify-center items-center"
            >
                <div className="w-64 h-6 bg-white/10 rounded-md mb-12"></div>
                <div className="w-32 h-8 bg-white/10 rounded-md mb-4"></div>
                <div className="w-48 h-24 bg-white/10 rounded-md mb-6"></div>
                <div className="w-40 h-10 bg-white/10 rounded-full"></div>
            </motion.div>
        );
    }

    const { category, color } = getAqiCategoryInfo(aqi);
    const trend = data?.trend || "Stable";


    const renderTrendIcon = () => {
        if (trend === "Deteriorating") return <ArrowUpRight className="text-red-400" size={24} />;
        if (trend === "Improving") return <ArrowDownRight className="text-green-400" size={24} />;
        return <ArrowRight className="text-yellow-400" size={24} />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-8 mb-6 border border-[#889063] bg-gradient-to-b from-[#354024] to-[#1a2012] relative overflow-hidden shadow-2xl shadow-[#354024]/20"
        >
            <div className="flex items-center gap-2 text-[#E5D7C4]/70 text-sm uppercase tracking-widest mb-8">
                <Layers size={14} />
                METHOD 5 — VERIDIAN META-ENSEMBLE (CONSENSUS)
            </div>

            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                {/* Center AQI */}
                <div className="flex flex-col items-center">
                    <p className="text-[#E5D7C4]/60 text-sm mb-2 uppercase tracking-widest">Predicted AQI</p>
                    <div className="text-6xl md:text-8xl font-bold text-[#E5D7C4]">
                        {aqi.toFixed(1)}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-center justify-center">
                    <div
                        className="px-10 py-4 rounded-full text-2xl font-bold uppercase tracking-widest shadow-lg"
                        style={{
                            backgroundColor: `${color}22`,
                            color: color,
                            border: `2px solid ${color}66`
                        }}
                    >
                        {category}
                    </div>
                </div>

                {/* Trend */}
                <div className="flex flex-col items-center">
                    <p className="text-[#E5D7C4]/60 text-sm mb-2 uppercase tracking-widest">Trajectory</p>
                    <div className="flex items-center gap-3">
                        {renderTrendIcon()}
                        <span className="text-2xl font-bold text-[#E5D7C4] uppercase tracking-wide">{trend}</span>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-5 border-t border-[#889063]/30 text-center">
                <p className="text-[#E5D7C4]/50 text-xs tracking-widest uppercase mb-3">
                    Unified consensus of XGBoost, LSTM, and 1D-CNN predictive streams
                </p>
                {contributions && (
                    <div className="flex justify-center items-center gap-6 text-[#E5D7C4]/60 text-xs tracking-wider">
                        <span title="XGBoost Trust Weight">XGB: {(contributions.XGB * 100).toFixed(1)}%</span>
                        <span title="LSTM Trust Weight">LSTM: {(contributions.LSTM * 100).toFixed(1)}%</span>
                        <span title="1D-CNN Trust Weight">CNN: {(contributions.CNN * 100).toFixed(1)}%</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
