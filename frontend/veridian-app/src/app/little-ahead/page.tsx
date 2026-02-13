"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
    Search, Calendar, TrendingUp, ShieldCheck, AlertCircle,
    ChevronDown, ChevronUp, Database, Cpu, Lock, BarChart3,
    Activity, Layers, ArrowRight
} from "lucide-react";

interface PredictionResult {
    prediction: {
        date: string;
        display_date: string;
        predicted_aqi: number;
        median_aqi: number;
        category: string;
        category_color: string;
        severity: string;
        confidence_interval: { lower: number; upper: number };
        likely_range: { lower: number; upper: number };
        std_dev: number;
    };
    evaluation: {
        method: string;
        description: string;
        steps: { step: number; title: string; detail: string }[];
        data_quality: {
            sample_size: number;
            years_covered: number[];
            window_days: number;
        };
    };
    method2_status: {
        name: string;
        status: string;
        description: string;
    };
}

export default function LittleAheadPage() {
    const [selectedDate, setSelectedDate] = useState("");
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showEvaluation, setShowEvaluation] = useState(false);

    const handlePredict = async () => {
        if (!selectedDate) {
            setError("Please select a date in 2026.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);
        setShowEvaluation(false);

        try {
            const res = await fetch(`http://127.0.0.1:8000/predict-anchor?date=${selectedDate}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Prediction failed.");
            }
            const data: PredictionResult = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Could not connect to the ML Engine. Is the API running?");
        } finally {
            setLoading(false);
        }
    };

    // Helper: get severity bar width
    const getSeverityWidth = (aqi: number) => Math.min((aqi / 500) * 100, 100);

    // Helper: get gradient for AQI gauge
    const getAqiGradient = (aqi: number) => {
        if (aqi <= 50) return "from-green-400 to-green-600";
        if (aqi <= 100) return "from-yellow-300 to-yellow-500";
        if (aqi <= 200) return "from-orange-400 to-orange-600";
        if (aqi <= 300) return "from-red-400 to-red-600";
        return "from-red-700 to-red-900";
    };

    return (
        <main className="min-h-screen bg-veridian-black text-foreground relative">
            <Navbar />

            <div className="pt-32 px-4 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-5xl md:text-6xl font-bold mb-4">Little Ahead</h1>
                    <p className="text-foreground/60 text-lg max-w-3xl">
                        Powered by <span className="text-[var(--veridian-primary)] font-semibold">10 years of historical data</span> —
                        our ML engine analyzes pollution patterns to give you a probabilistic forecast for any day in 2026.
                    </p>
                </motion.div>

                {/* ============================================ */}
                {/*  DATE SEARCH SECTION                         */}
                {/* ============================================ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel rounded-3xl p-8 mb-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[var(--veridian-primary)]/20 flex items-center justify-center">
                            <Calendar size={20} className="text-[var(--veridian-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Search a Date</h2>
                            <p className="text-foreground/40 text-sm">Select any date in 2026 to get a prediction for Delhi</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="date"
                                min="2026-01-01"
                                max="2026-12-31"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-foreground text-lg 
                                           focus:outline-none focus:border-[var(--veridian-primary)] focus:ring-1 focus:ring-[var(--veridian-primary)]/30
                                           transition-all duration-300 appearance-none"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>
                        <button
                            onClick={handlePredict}
                            disabled={loading || !selectedDate}
                            className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3
                                       bg-gradient-to-r from-[var(--veridian-primary)] to-[var(--veridian-accent)] text-[var(--veridian-black)]
                                       hover:shadow-lg hover:shadow-[var(--veridian-primary)]/20 hover:scale-[1.02]
                                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-[var(--veridian-black)]/30 border-t-[var(--veridian-black)] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Search size={20} />
                                    Predict
                                </>
                            )}
                        </button>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3"
                            >
                                <AlertCircle size={18} />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ============================================ */}
                {/*  PREDICTION RESULT                           */}
                {/* ============================================ */}
                <AnimatePresence mode="wait">
                    {result && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Main Prediction Card */}
                            <div className="glass-panel rounded-3xl p-8 mb-6">
                                <div className="flex items-center gap-2 text-foreground/40 text-sm uppercase tracking-widest mb-6">
                                    <Cpu size={14} />
                                    Method 1 — Historical Anchor
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Big AQI Number */}
                                    <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                        <p className="text-foreground/50 text-sm mb-2">{result.prediction.display_date}, 2026</p>
                                        <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-b ${getAqiGradient(result.prediction.predicted_aqi)} bg-clip-text text-transparent`}>
                                            {result.prediction.predicted_aqi}
                                        </div>
                                        <p className="text-foreground/50 text-sm mt-1">Predicted PM2.5</p>
                                        <div
                                            className="mt-4 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
                                            style={{ backgroundColor: result.prediction.category_color + "22", color: result.prediction.category_color, border: `1px solid ${result.prediction.category_color}44` }}
                                        >
                                            {result.prediction.category}
                                        </div>
                                    </div>

                                    {/* Right: Stats Grid */}
                                    <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <StatCard
                                            icon={<BarChart3 size={16} />}
                                            label="Median AQI"
                                            value={result.prediction.median_aqi.toString()}
                                        />
                                        <StatCard
                                            icon={<Activity size={16} />}
                                            label="Std Deviation"
                                            value={`±${result.prediction.std_dev}`}
                                        />
                                        <StatCard
                                            icon={<Database size={16} />}
                                            label="Sample Size"
                                            value={`${result.evaluation.data_quality.sample_size} days`}
                                        />
                                        <StatCard
                                            icon={<ShieldCheck size={16} />}
                                            label="95% CI (Mean)"
                                            value={`${result.prediction.confidence_interval.lower} — ${result.prediction.confidence_interval.upper}`}
                                        />
                                        <StatCard
                                            icon={<TrendingUp size={16} />}
                                            label="Likely Range"
                                            value={`${result.prediction.likely_range.lower} — ${result.prediction.likely_range.upper}`}
                                            sublabel="10th — 90th percentile"
                                        />
                                        <StatCard
                                            icon={<Layers size={16} />}
                                            label="Years Covered"
                                            value={`${result.evaluation.data_quality.years_covered.length} yrs`}
                                            sublabel={`${Math.min(...result.evaluation.data_quality.years_covered)}–${Math.max(...result.evaluation.data_quality.years_covered)}`}
                                        />
                                    </div>
                                </div>

                                {/* AQI Range Bar */}
                                <div className="mt-8 pt-6 border-t border-white/5">
                                    <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">Prediction Range Visualization</p>
                                    <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                                        {/* Full range background gradient */}
                                        <div className="absolute inset-0 rounded-full"
                                            style={{ background: "linear-gradient(to right, #4ade80 0%, #facc15 20%, #f97316 40%, #ef4444 60%, #991b1b 100%)", opacity: 0.15 }}
                                        />
                                        {/* Likely range highlight */}
                                        <div
                                            className="absolute top-0 h-full rounded-full"
                                            style={{
                                                left: `${getSeverityWidth(result.prediction.likely_range.lower)}%`,
                                                width: `${getSeverityWidth(result.prediction.likely_range.upper) - getSeverityWidth(result.prediction.likely_range.lower)}%`,
                                                background: `linear-gradient(to right, ${result.prediction.category_color}88, ${result.prediction.category_color})`,
                                            }}
                                        />
                                        {/* Mean marker */}
                                        <div
                                            className="absolute top-[-4px] w-1 h-5 rounded-full bg-white shadow-lg shadow-white/30"
                                            style={{ left: `${getSeverityWidth(result.prediction.predicted_aqi)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-foreground/30 mt-2">
                                        <span>0 (Good)</span>
                                        <span>100</span>
                                        <span>200</span>
                                        <span>300</span>
                                        <span>500 (Hazardous)</span>
                                    </div>
                                </div>
                            </div>

                            {/* ============================================ */}
                            {/*  EVALUATION / TRANSPARENCY SECTION           */}
                            {/* ============================================ */}
                            <div className="glass-panel rounded-3xl overflow-hidden mb-6">
                                <button
                                    onClick={() => setShowEvaluation(!showEvaluation)}
                                    className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--veridian-primary)]/10 flex items-center justify-center">
                                            <Lock size={16} className="text-[var(--veridian-primary)]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold">How did we reach this conclusion?</p>
                                            <p className="text-foreground/40 text-sm">{result.evaluation.method}</p>
                                        </div>
                                    </div>
                                    {showEvaluation ? <ChevronUp size={20} className="text-foreground/40" /> : <ChevronDown size={20} className="text-foreground/40" />}
                                </button>

                                <AnimatePresence>
                                    {showEvaluation && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-8">
                                                <p className="text-foreground/50 text-sm mb-6 pl-11">
                                                    {result.evaluation.description}
                                                </p>

                                                {/* Step-by-step pipeline */}
                                                <div className="space-y-1 pl-4">
                                                    {result.evaluation.steps.map((step, i) => (
                                                        <motion.div
                                                            key={step.step}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.08 }}
                                                            className="flex items-start gap-4"
                                                        >
                                                            {/* Step number + connector line */}
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-8 h-8 rounded-full bg-[var(--veridian-primary)]/15 border border-[var(--veridian-primary)]/30 
                                                                                flex items-center justify-center text-xs font-bold text-[var(--veridian-primary)] flex-shrink-0">
                                                                    {step.step}
                                                                </div>
                                                                {i < result.evaluation.steps.length - 1 && (
                                                                    <div className="w-px h-6 bg-[var(--veridian-primary)]/15" />
                                                                )}
                                                            </div>
                                                            <div className="pt-1 pb-4">
                                                                <p className="text-sm font-bold text-foreground/80">{step.title}</p>
                                                                <p className="text-sm text-foreground/40">{step.detail}</p>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ============================================ */}
                            {/*  METHOD 2: COMING SOON PLACEHOLDER           */}
                            {/* ============================================ */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="glass-panel rounded-3xl p-8 border border-dashed border-[var(--veridian-accent)]/30 relative overflow-hidden"
                            >
                                {/* Subtle animated background */}
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0"
                                        style={{
                                            backgroundImage: `repeating-linear-gradient(
                                                90deg,
                                                var(--veridian-primary) 0px,
                                                transparent 1px,
                                                transparent 30px
                                            ), repeating-linear-gradient(
                                                0deg,
                                                var(--veridian-primary) 0px,
                                                transparent 1px,
                                                transparent 30px
                                            )`
                                        }}
                                    />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--veridian-accent)]/20 flex items-center justify-center">
                                            <Activity size={20} className="text-[var(--veridian-accent)]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold">{result.method2_status.name}</h3>
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                                               bg-[var(--veridian-accent)]/15 text-[var(--veridian-accent)] border border-[var(--veridian-accent)]/20">
                                                    Coming Soon
                                                </span>
                                            </div>
                                            <p className="text-foreground/40 text-sm mt-1">Method 2 — The Adaptive Brain</p>
                                        </div>
                                    </div>

                                    <p className="text-foreground/50 text-sm leading-relaxed max-w-2xl mb-6">
                                        {result.method2_status.description} This will use <span className="text-[var(--veridian-primary)] font-medium">Dynamic Time Warping (DTW)</span> to
                                        identify if the current pollution pattern matches a known seasonal trend (e.g., &ldquo;Winter Smog&rdquo;, &ldquo;Crop Burning Season&rdquo;),
                                        and will adjust the Historical Anchor prediction accordingly.
                                    </p>

                                    <div className="flex flex-wrap gap-3">
                                        <div className="px-4 py-2 rounded-lg bg-white/5 text-xs text-foreground/30 flex items-center gap-2">
                                            <ArrowRight size={12} /> Trend Shape Analysis
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-white/5 text-xs text-foreground/30 flex items-center gap-2">
                                            <ArrowRight size={12} /> Subsequence Matching
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-white/5 text-xs text-foreground/30 flex items-center gap-2">
                                            <ArrowRight size={12} /> Prediction Refinement
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ============================================ */}
                {/*  EMPTY STATE (no result yet)                 */}
                {/* ============================================ */}
                {!result && !loading && !error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                            <Search size={32} className="text-foreground/20" />
                        </div>
                        <p className="text-foreground/30 text-lg mb-2">Select a date in 2026 to begin</p>
                        <p className="text-foreground/15 text-sm max-w-md mx-auto">
                            Our ML engine will analyze 10 years of historical pollution data to give you
                            a probabilistic forecast with full transparency.
                        </p>
                    </motion.div>
                )}
            </div>
        </main>
    );
}

/* =========================================== */
/*  Reusable Stat Card Component               */
/* =========================================== */
function StatCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) {
    return (
        <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2 text-foreground/40 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
            {sublabel && <p className="text-xs text-foreground/30 mt-1">{sublabel}</p>}
        </div>
    );
}
