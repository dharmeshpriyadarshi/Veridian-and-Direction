"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Sigma, Zap } from "lucide-react";

interface ModelMetrics {
    name: string;
    rmse: number;
    mae: number;
    r2: number;
    sd: number;
}

interface MetaEvalResponse {
    metrics: {
        A: ModelMetrics;
        B: ModelMetrics;
    };
    statistical_test: {
        test_name: string;
        t_statistic: number;
        p_value: number;
        is_significant: boolean;
        interpretation: string;
    };
    winner: "A" | "B" | "Tie";
}

export default function Leaderboard() {
    const [data, setData] = useState<MetaEvalResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("http://127.0.0.1:8000/api/v1/metrics/meta-eval")
            .then(res => {
                if (!res.ok) throw new Error("Evaluation report not available.");
                return res.json();
            })
            .then(json => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="rounded-3xl p-8 mb-6 border border-[#889063] bg-gradient-to-b from-[#354024] to-[#1a2012] animate-pulse h-[200px] flex items-center justify-center w-full">
                <div className="w-48 h-6 bg-white/10 rounded" />
            </div>
        );
    }
    
    if (error || !data) {
        return null; // hide quietly if the evaluator script hasn't been run yet
    }

    const { A, B } = data.metrics;
    const isAWinner = data.winner === "A";
    const isBWinner = data.winner === "B";

    const winnerGlow = "shadow-[0_0_20px_rgba(34,197,94,0.15)] border-[#22c55e] scale-[1.01] z-10 bg-black/60";
    const loserStyle = "border-[#889063]/30 opacity-70 bg-black/40 scale-100 z-0";

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 w-full pt-4"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <Trophy size={18} className="text-[#22c55e]" />
                </div>
                <h3 className="text-2xl font-bold text-[#E5D7C4]">Model Performance</h3>
                <span className="text-[10px] uppercase tracking-widest text-[#22c55e] border border-[#22c55e]/30 px-3 py-1 rounded-full ml-auto md:ml-2">
                    Validation Rigor Tier
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                
                {/* META-A COLUMN */}
                <div className={`rounded-3xl border p-8 flex flex-col transition-all duration-500 ease-out ${isAWinner ? winnerGlow : loserStyle}`}>
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-5">
                        <div>
                            <p className="text-[#889063] text-xs uppercase tracking-widest mb-1.5">Meta-A</p>
                            <h4 className="text-xl font-bold text-[#E5D7C4] tracking-wide">{A.name}</h4>
                        </div>
                        {isAWinner && (
                            <div className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                                <Zap size={12} className="fill-current" />
                                Optimized Path
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-3 flex-1">
                        <MetricRow label="RMSE (Root Mean Square Error)" value={A.rmse.toFixed(2)} isBetter={isAWinner} />
                        <MetricRow label="MAE (Mean Absolute Error)" value={A.mae.toFixed(2)} />
                        <MetricRow label="R² (Explained Variance)" value={A.r2.toFixed(4)} />
                        <MetricRow label="SD (Distribution Variance)" value={A.sd.toFixed(2)} />
                    </div>
                </div>

                {/* META-B COLUMN */}
                <div className={`rounded-3xl border p-8 flex flex-col transition-all duration-500 ease-out ${isBWinner ? winnerGlow : loserStyle}`}>
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-5">
                        <div>
                            <p className="text-[#889063] text-xs uppercase tracking-widest mb-1.5">Meta-B</p>
                            <h4 className="text-xl font-bold text-[#E5D7C4] tracking-wide">{B.name}</h4>
                        </div>
                        {isBWinner && (
                            <div className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                                <Zap size={12} className="fill-current" />
                                Optimized Path
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-3 flex-1">
                        <MetricRow label="RMSE (Root Mean Square Error)" value={B.rmse.toFixed(2)} isBetter={isBWinner} />
                        <MetricRow label="MAE (Mean Absolute Error)" value={B.mae.toFixed(2)} />
                        <MetricRow label="R² (Explained Variance)" value={B.r2.toFixed(4)} />
                        <MetricRow label="SD (Distribution Variance)" value={B.sd.toFixed(2)} />
                    </div>
                </div>

            </div>

            {/* T-TEST STATISTICAL PANEL */}
            <div className="mt-8 rounded-2xl bg-[#0a0c08] border border-white/5 p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-inner">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Sigma size={20} className="text-[#E5D7C4]/70" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[#E5D7C4] uppercase tracking-widest mb-1">{data.statistical_test.test_name}</p>
                        <div className="flex gap-4 text-xs text-[#E5D7C4]/40 font-mono">
                            <span>t = {data.statistical_test.t_statistic.toFixed(3)}</span>
                            <span>p = {data.statistical_test.p_value.toFixed(4)}</span>
                        </div>
                    </div>
                </div>
                
                <div className={`px-4 py-3 border rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap shadow-md ${
                    data.statistical_test.is_significant 
                        ? "bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e] shadow-[#22c55e]/10" 
                        : "bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10"
                }`}>
                    {data.statistical_test.interpretation}
                </div>
            </div>

        </motion.div>
    );
}

function MetricRow({ label, value, isBetter = false }: { label: string; value: string; isBetter?: boolean }) {
    return (
        <div className="flex justify-between items-center bg-white/5 rounded-xl px-5 py-3 border border-white/5 hover:bg-white/10 transition-colors">
            <span className="text-[11px] uppercase tracking-widest text-[#E5D7C4]/50 basis-2/3">{label}</span>
            <span className={`text-base font-mono font-bold ${isBetter ? 'text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-[#E5D7C4]'}`}>
                {value}
            </span>
        </div>
    );
}
