"use client";

import React, { useEffect, useState } from 'react';

// Interfaces for incoming data shape
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

const Leaderboard = () => {
    const [data, setData] = useState<MetaEvalResponse | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/v1/metrics/meta-eval')
            .then(res => {
                if (!res.ok) throw new Error("Could not load validation metrics.");
                return res.json();
            })
            .then(json => setData(json))
            .catch(err => setError(err.message));
    }, []);

    if (error) {
        return <div className="p-6 my-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">{error}</div>;
    }

    if (!data) return <div className="animate-pulse h-40 bg-[#22c55e]/5 rounded-xl w-full my-8" />;

    const p_value = data.statistical_test.p_value;
    const isSignificant = p_value <= 0.05;
    
    // The metric payload uses "A" and "B" as keys
    const meta_a = data.metrics.A;
    const meta_b = data.metrics.B;
    
    const winner = meta_a.rmse < meta_b.rmse ? 'A' : 'B';

    return (
        <div className="w-full bg-[#1a1c18]/80 border border-white/10 rounded-2xl p-6 my-8 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold text-[#E5D7C4] tracking-tight">Statistical Validation Tier — Historian (A) vs. Scanner (B)</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isSignificant ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/10 text-white/40'}`}>
                    {isSignificant ? 'Statistically Significant Win' : 'Marginal Performance Difference'}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="text-white/40 text-sm uppercase self-center text-left pl-4">Metric</div>
                <div className={`p-4 rounded-xl border transition-all duration-300 ${winner === 'A' ? 'bg-[#22c55e]/5 border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/5'}`}>
                    <p className="text-xs text-white/40 uppercase mb-1">Historian (A)</p>
                    {winner === 'A' && <p className="text-[10px] text-[#22c55e] font-bold mb-2">🏆 BEST PRECISION</p>}
                </div>
                <div className={`p-4 rounded-xl border transition-all duration-300 ${winner === 'B' ? 'bg-[#22c55e]/5 border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/5'}`}>
                    <p className="text-xs text-white/40 uppercase mb-1">Scanner (B)</p>
                    {winner === 'B' && <p className="text-[10px] text-[#22c55e] font-bold mb-2">🏆 BEST PRECISION</p>}
                </div>

                {/* Dynamic Metric Rows */}
                <MetricRow label="RMSE" valA={meta_a.rmse} valB={meta_b.rmse} winner={winner} isLowerBetter={true} />
                <MetricRow label="MAE" valA={meta_a.mae} valB={meta_b.mae} winner={winner} isLowerBetter={true} />
                <MetricRow label="R² Score" valA={meta_a.r2} valB={meta_b.r2} winner={winner} isLowerBetter={false} />
                <MetricRow label="SD" valA={meta_a.sd} valB={meta_b.sd} winner={winner} isLowerBetter={true} />
            </div>

            <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed">
                    <span className="text-[#22c55e] font-bold">T-Test Result:</span> {isSignificant 
                        ? `There is a 95% probability that the accuracy gap is driven by architectural superiority (p = ${p_value.toFixed(4)}).` 
                        : `The performance difference is currently negligible (p = ${p_value.toFixed(4)}). Both models are equally reliable.`}
                </p>
            </div>
        </div>
    );
};

const MetricRow = ({ label, valA, valB, winner, isLowerBetter }: { label: string, valA: number, valB: number, winner: string, isLowerBetter: boolean }) => (
    <>
        <div className="text-white/60 text-sm font-medium text-left pl-4 self-center">{label}</div>
        <div className={`text-lg font-mono py-2 ${winner === 'A' ? 'text-[#22c55e]' : 'text-white/40'}`}>{valA.toFixed(4)}</div>
        <div className={`text-lg font-mono py-2 ${winner === 'B' ? 'text-[#22c55e]' : 'text-white/40'}`}>{valB.toFixed(4)}</div>
    </>
);

export default Leaderboard;
