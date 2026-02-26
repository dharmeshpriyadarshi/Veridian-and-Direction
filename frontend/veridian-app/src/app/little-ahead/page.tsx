"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Search, Calendar, TrendingUp, ShieldCheck, AlertCircle,
    ChevronDown, ChevronUp, Database, Cpu, Lock, BarChart3,
    Activity, Layers, ArrowRight, MapPin, ArrowUpRight, ArrowDownRight, Minus, GitMerge
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

/* =========================================== */
/*  Type Definitions                           */
/* =========================================== */
interface StatBlock {
    mean: number;
    median: number;
    std_dev: number;
    ci_95: [number, number];
    likely_range: [number, number];
    sample_size: number;
}

interface YearBreakdown {
    year: number;
    exact_date: string;
    day_aqi: number | null;
    day_pm25: number | null;
    year_aqi_mean: number | null;
    year_pm25_mean: number;
    year_total_days: number;
    deviation: number;
    deviation_pct: number;
    z_score: number;
    interpretation: string;
}

interface PredictionResult {
    prediction: {
        date: string;
        city: string;
        display_date: string;
        primary_metric: string;
        predicted_aqi: number | null;
        median_aqi: number | null;
        predicted_pm25: number | null;
        median_pm25: number | null;
        category: string;
        category_color: string;
        severity: string;
        confidence_interval: { lower: number; upper: number };
        likely_range: { lower: number; upper: number };
        std_dev: number;
        aqi_stats: StatBlock | null;
        pm25_stats: StatBlock | null;
    };
    yearly_breakdown: YearBreakdown[];
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
    const [selectedCity, setSelectedCity] = useState("Delhi");
    const [cities, setCities] = useState<string[]>([]);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [showYearlyBreakdown, setShowYearlyBreakdown] = useState(false);

    // Load available cities on mount
    useEffect(() => {
        fetch("http://127.0.0.1:8000/cities")
            .then(res => res.json())
            .then(data => {
                if (data.cities) setCities(data.cities);
            })
            .catch(() => setCities(["Delhi"])); // fallback
    }, []);

    const handlePredict = async () => {
        if (!selectedDate) {
            setError("Please select a date in 2026.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);
        setShowEvaluation(false);
        setShowYearlyBreakdown(false);

        try {
            const res = await fetch(`http://127.0.0.1:8000/predict-anchor?date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`);
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

    const getSeverityWidth = (aqi: number) => Math.min((aqi / 500) * 100, 100);

    const getAqiGradient = (aqi: number) => {
        if (aqi <= 50) return "from-green-400 to-green-600";
        if (aqi <= 100) return "from-yellow-300 to-yellow-500";
        if (aqi <= 200) return "from-orange-400 to-orange-600";
        if (aqi <= 300) return "from-red-400 to-red-600";
        return "from-red-700 to-red-900";
    };

    const getDeviationColor = (z: number) => {
        if (z < -1) return "#4ade80";
        if (z < -0.3) return "#86efac";
        if (z < 0.3) return "#fbbf24";
        if (z < 1) return "#fb923c";
        return "#ef4444";
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
                        our ML engine analyzes pollution patterns to give you a probabilistic forecast with full transparency.
                    </p>
                </motion.div>

                {/* ============================================ */}
                {/*  SEARCH SECTION: City + Date                 */}
                {/* ============================================ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel rounded-3xl p-8 mb-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[var(--veridian-primary)]/20 flex items-center justify-center">
                            <Search size={20} className="text-[var(--veridian-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Predict Pollution</h2>
                            <p className="text-foreground/40 text-sm">Select a city and any date in 2026</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* City Dropdown */}
                        <div className="relative sm:w-56">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                                <MapPin size={18} />
                            </div>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-5 py-4 text-foreground text-lg 
                                           focus:outline-none focus:border-[var(--veridian-primary)] focus:ring-1 focus:ring-[var(--veridian-primary)]/30
                                           transition-all duration-300 appearance-none cursor-pointer"
                                style={{ colorScheme: "dark" }}
                            >
                                {cities.map(city => (
                                    <option key={city} value={city} className="bg-[#1a2012] text-foreground">{city}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/30">
                                <ChevronDown size={16} />
                            </div>
                        </div>

                        {/* Date Input */}
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                                <Calendar size={18} />
                            </div>
                            <input
                                type="date"
                                min="2026-01-01"
                                max="2026-12-31"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-5 py-4 text-foreground text-lg 
                                           focus:outline-none focus:border-[var(--veridian-primary)] focus:ring-1 focus:ring-[var(--veridian-primary)]/30
                                           transition-all duration-300 appearance-none"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>

                        {/* Predict Button */}
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
                                    <Cpu size={20} />
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
                {/*  HISTORICAL DRIFT TABLE (Module 1)           */}
                {/* ============================================ */}
                <HistoricalDriftTable />

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
                                    Method 1 — Historical Anchor for {result.prediction.city}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Big AQI Number */}
                                    <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                        <p className="text-foreground/50 text-sm mb-1">{result.prediction.city}</p>
                                        <p className="text-foreground/40 text-xs mb-3">{result.prediction.display_date}, 2026</p>
                                        <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-b ${getAqiGradient(result.prediction.predicted_aqi ?? result.prediction.predicted_pm25 ?? 0)} bg-clip-text text-transparent`}>
                                            {result.prediction.predicted_aqi ?? result.prediction.predicted_pm25}
                                        </div>
                                        <p className="text-foreground/50 text-sm mt-1">Predicted AQI</p>
                                        {result.prediction.predicted_pm25 != null && (
                                            <p className="text-foreground/30 text-xs mt-1">PM2.5: {result.prediction.predicted_pm25} µg/m³</p>
                                        )}
                                        <div
                                            className="mt-4 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
                                            style={{ backgroundColor: result.prediction.category_color + "22", color: result.prediction.category_color, border: `1px solid ${result.prediction.category_color}44` }}
                                        >
                                            {result.prediction.category}
                                        </div>
                                    </div>

                                    {/* Right: Stats Grid */}
                                    <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <StatCard icon={<BarChart3 size={16} />} label="Median AQI" value={result.prediction.median_aqi?.toString() ?? '—'} />
                                        <StatCard icon={<Activity size={16} />} label="PM2.5 Mean" value={result.prediction.predicted_pm25 != null ? `${result.prediction.predicted_pm25} µg/m³` : '—'} sublabel={result.prediction.median_pm25 != null ? `Median: ${result.prediction.median_pm25}` : undefined} />
                                        <StatCard icon={<Activity size={16} />} label="Std Deviation" value={`±${result.prediction.std_dev}`} />
                                        <StatCard icon={<Database size={16} />} label="Sample Size" value={`${result.evaluation.data_quality.sample_size} days`} />
                                        <StatCard icon={<ShieldCheck size={16} />} label="95% CI (Mean)" value={`${result.prediction.confidence_interval.lower} — ${result.prediction.confidence_interval.upper}`} />
                                        <StatCard icon={<TrendingUp size={16} />} label="Likely Range" value={`${result.prediction.likely_range.lower} — ${result.prediction.likely_range.upper}`} sublabel="10th — 90th percentile" />
                                        <StatCard icon={<Layers size={16} />} label="Years Covered" value={`${result.evaluation.data_quality.years_covered.length} yrs`} sublabel={`${Math.min(...result.evaluation.data_quality.years_covered)}–${Math.max(...result.evaluation.data_quality.years_covered)}`} />
                                    </div>
                                </div>

                                {/* AQI Range Bar */}
                                <div className="mt-8 pt-6 border-t border-white/5">
                                    <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">AQI Range Visualization</p>
                                    <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                                        <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(to right, #4ade80 0%, #a3e635 10%, #facc15 20%, #f97316 40%, #ef4444 60%, #991b1b 100%)", opacity: 0.15 }} />
                                        <div className="absolute top-0 h-full rounded-full" style={{
                                            left: `${getSeverityWidth(result.prediction.likely_range.lower)}%`,
                                            width: `${getSeverityWidth(result.prediction.likely_range.upper) - getSeverityWidth(result.prediction.likely_range.lower)}%`,
                                            background: `linear-gradient(to right, ${result.prediction.category_color}88, ${result.prediction.category_color})`,
                                        }} />
                                        <div className="absolute top-[-4px] w-1 h-5 rounded-full bg-white shadow-lg shadow-white/30" style={{ left: `${getSeverityWidth(result.prediction.predicted_aqi ?? result.prediction.predicted_pm25 ?? 0)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-foreground/30 mt-2">
                                        <span>0 (Good)</span><span>50</span><span>100</span><span>200</span><span>300</span><span>500 (Severe)</span>
                                    </div>
                                </div>
                            </div>

                            {/* ============================================ */}
                            {/*  YEAR-BY-YEAR HISTORICAL BREAKDOWN           */}
                            {/* ============================================ */}
                            <div className="glass-panel rounded-3xl overflow-hidden mb-6">
                                <button
                                    onClick={() => setShowYearlyBreakdown(!showYearlyBreakdown)}
                                    className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Database size={16} className="text-blue-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold">Year-by-Year Historical Data</p>
                                            <p className="text-foreground/40 text-sm">
                                                Exact readings for {result.prediction.display_date} from the dataset, compared to each year&apos;s average
                                            </p>
                                        </div>
                                    </div>
                                    {showYearlyBreakdown ? <ChevronUp size={20} className="text-foreground/40" /> : <ChevronDown size={20} className="text-foreground/40" />}
                                </button>

                                <AnimatePresence>
                                    {showYearlyBreakdown && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6">
                                                {/* Table Header */}
                                                {/* Table Header */}
                                                <div className="grid grid-cols-14 gap-2 text-xs text-foreground/40 uppercase tracking-wider font-medium pb-3 border-b border-white/5 mb-2" style={{ gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 2fr' }}>
                                                    <div>Year</div>
                                                    <div className="text-right">Exact AQI</div>
                                                    <div className="text-right">Exact PM2.5</div>
                                                    <div className="text-right">Year AQI Avg</div>
                                                    <div className="text-right">Deviation</div>
                                                    <div className="text-right">Z-Score</div>
                                                    <div>Assessment</div>
                                                </div>

                                                {/* Table Rows */}
                                                {result.yearly_breakdown.map((yr, i) => (
                                                    <motion.div
                                                        key={yr.year}
                                                        initial={{ opacity: 0, x: -15 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="py-3 border-b border-white/[0.03] items-center hover:bg-white/[0.02] rounded-lg transition-colors"
                                                        style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 2fr', gap: '0.5rem' }}
                                                    >
                                                        <div className="font-bold text-foreground/70">{yr.year}</div>
                                                        <div className="text-right font-mono font-bold" style={{ color: getDeviationColor(-yr.z_score + 1) }}>
                                                            {yr.day_aqi ?? '—'}
                                                        </div>
                                                        <div className="text-right font-mono text-foreground/40">
                                                            {yr.day_pm25 ?? '—'}
                                                        </div>
                                                        <div className="text-right text-foreground/50 font-mono">
                                                            {yr.year_aqi_mean ?? '—'}
                                                        </div>
                                                        <div className="text-right flex items-center justify-end gap-1">
                                                            {yr.deviation > 5 ? (
                                                                <ArrowUpRight size={14} className="text-red-400" />
                                                            ) : yr.deviation < -5 ? (
                                                                <ArrowDownRight size={14} className="text-green-400" />
                                                            ) : (
                                                                <Minus size={14} className="text-yellow-400" />
                                                            )}
                                                            <span className={`font-mono text-sm ${yr.deviation > 5 ? 'text-red-400' : yr.deviation < -5 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                {yr.deviation > 0 ? '+' : ''}{yr.deviation}
                                                            </span>
                                                            <span className="text-foreground/25 text-xs">({yr.deviation_pct > 0 ? '+' : ''}{yr.deviation_pct}%)</span>
                                                        </div>
                                                        <div className="text-right font-mono text-sm" style={{ color: getDeviationColor(yr.z_score) }}>
                                                            {yr.z_score > 0 ? '+' : ''}{yr.z_score}σ
                                                        </div>
                                                        <div>
                                                            <span className="text-xs px-2 py-1 rounded-md font-medium"
                                                                style={{
                                                                    backgroundColor: getDeviationColor(yr.z_score) + "18",
                                                                    color: getDeviationColor(yr.z_score)
                                                                }}
                                                            >
                                                                {yr.interpretation}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {/* Summary row */}
                                                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                                    <p className="text-xs text-foreground/40 mb-2 uppercase tracking-wider">Key Insight</p>
                                                    <p className="text-sm text-foreground/60">
                                                        {(() => {
                                                            const aboveCount = result.yearly_breakdown.filter(y => y.z_score > 0.5).length;
                                                            const belowCount = result.yearly_breakdown.filter(y => y.z_score < -0.5).length;
                                                            const total = result.yearly_breakdown.length;
                                                            if (aboveCount > total / 2) {
                                                                return `${result.prediction.display_date} is typically a WORSE day than the annual average — it scored above the year mean in ${aboveCount}/${total} years. This is likely a seasonally high-pollution period.`;
                                                            } else if (belowCount > total / 2) {
                                                                return `${result.prediction.display_date} is typically a BETTER day than the annual average — it scored below the year mean in ${belowCount}/${total} years. This is likely a seasonally cleaner period.`;
                                                            }
                                                            return `${result.prediction.display_date} shows mixed performance across years — sometimes better, sometimes worse than the annual average. No strong seasonal bias detected.`;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                            {/*  METHOD 2: TRAJECTORY VECTOR                 */}
                            {/* ============================================ */}
                            <TrajectoryVector city={selectedCity} targetDate={selectedDate} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ============================================ */}
                {/*  EMPTY STATE                                 */}
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
                        <p className="text-foreground/30 text-lg mb-2">Select a city and date in 2026 to begin</p>
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

/* =========================================== */
/*  Historical Drift Table                     */
/* =========================================== */
interface HistoricalSpike {
    month: number;
    year: number;
    centroid_date: string;
    peak_aqi_average: number;
}

function HistoricalDriftTable() {
    const [spikes, setSpikes] = useState<HistoricalSpike[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<number>(1);
    const [selectedCity, setSelectedCity] = useState<string>("Delhi");
    const [cities, setCities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Load available cities
    useEffect(() => {
        fetch("http://127.0.0.1:8000/cities")
            .then(res => res.json())
            .then(data => {
                if (data.cities) setCities(data.cities);
            })
            .catch(() => setCities(["Delhi"])); // fallback
    }, []);

    // Load spikes when city changes
    useEffect(() => {
        setLoading(true);
        fetch(`http://127.0.0.1:8000/tsmart/historical_spikes?city=${encodeURIComponent(selectedCity)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSpikes(data);
                } else {
                    setSpikes([]);
                }
            })
            .catch(err => {
                console.error("Could not load historical spikes:", err);
                setSpikes([]);
            })
            .finally(() => setLoading(false));
    }, [selectedCity]);

    const months = [
        { value: 1, label: "January" }, { value: 2, label: "February" },
        { value: 3, label: "March" }, { value: 4, label: "April" },
        { value: 5, label: "May" }, { value: 6, label: "June" },
        { value: 7, label: "July" }, { value: 8, label: "August" },
        { value: 9, label: "September" }, { value: 10, label: "October" },
        { value: 11, label: "November" }, { value: 12, label: "December" }
    ];

    const filteredSpikes = spikes.filter(s => s.month === selectedMonth).sort((a, b) => a.year - b.year);

    return (
        <div className="glass-panel rounded-3xl p-8 mb-8 border border-[var(--veridian-accent)]/20">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[var(--veridian-accent)]/20 flex items-center justify-center">
                            <TrendingUp size={20} className="text-[var(--veridian-accent)]" />
                        </div>
                        <h2 className="text-2xl font-bold">T-SMART: Historical Spike Drift Tracker</h2>
                    </div>
                    <p className="text-foreground/50 text-sm pl-13">
                        <span className="text-[var(--veridian-accent)] font-medium">Module 1 (Deep Observation):</span> Tracking the &quot;Highest 7-Day AQI Window&quot; for each month over the last 10 years to observe its temporal drift.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {/* City Dropdown */}
                    <div className="relative w-full sm:w-48">
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-foreground font-medium
                                       focus:outline-none focus:border-[var(--veridian-accent)] focus:ring-1 focus:ring-[var(--veridian-accent)]/30
                                       appearance-none cursor-pointer"
                            style={{ colorScheme: "dark" }}
                        >
                            {cities.map(c => (
                                <option key={c} value={c} className="bg-[#1a2012]">{c}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    {/* Month Dropdown */}
                    <div className="relative w-full sm:w-48">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-foreground font-medium
                                       focus:outline-none focus:border-[var(--veridian-accent)] focus:ring-1 focus:ring-[var(--veridian-accent)]/30
                                       appearance-none cursor-pointer"
                            style={{ colorScheme: "dark" }}
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value} className="bg-[#1a2012]">{m.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[var(--veridian-accent)]/30 border-t-[var(--veridian-accent)] rounded-full animate-spin" />
                </div>
            ) : filteredSpikes.length === 0 ? (
                <div className="text-center py-12 text-foreground/40 bg-white/5 rounded-2xl">
                    No historical spike data found for {selectedCity} in {months.find(m => m.value === selectedMonth)?.label}.
                    Ensure the dataset is processed.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-foreground/40 text-xs uppercase tracking-wider">
                                <th className="pb-4 font-medium pl-4">Year</th>
                                <th className="pb-4 font-medium">Peak Shift (Centroid Date)</th>
                                <th className="pb-4 font-medium text-right pr-4">7-Day Max AQI Average</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSpikes.map((spike, idx) => {
                                const prevSpike = idx > 0 ? filteredSpikes[idx - 1] : null;
                                let shiftDays = 0;
                                let shiftLabel = "—";

                                if (prevSpike) {
                                    // Calculate exact day shift (handling bleed into Dec/Feb correctly)
                                    const d1 = new Date(spike.centroid_date);
                                    const d2 = new Date(prevSpike.centroid_date);

                                    // Project the previous spike's logical year to the current spike's logical year
                                    // so we can see the literal drift in days regardless of if it fell in Dec or Jan
                                    d2.setFullYear(d2.getFullYear() + (spike.year - prevSpike.year));

                                    shiftDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

                                    if (Math.abs(shiftDays) > 45) {
                                        shiftLabel = `Pattern Broken (${shiftDays > 0 ? '+' : ''}${shiftDays}d)`;
                                    } else if (shiftDays > 0) {
                                        shiftLabel = `+${shiftDays} days (Forward)`;
                                    } else if (shiftDays < 0) {
                                        shiftLabel = `${shiftDays} days (Backward)`;
                                    } else {
                                        shiftLabel = "Static";
                                    }
                                }

                                return (
                                    <tr key={spike.year} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-4 pl-4 font-bold text-lg">{spike.year}</td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-[var(--veridian-primary)] bg-[var(--veridian-primary)]/10 px-3 py-1 rounded-md">
                                                    {spike.centroid_date}
                                                </span>
                                                <span className={`text-xs font-mono 
                                                    ${shiftDays > 0 ? 'text-orange-400' : shiftDays < 0 ? 'text-blue-400' : 'text-foreground/30'}
                                                    opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                    {shiftLabel}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <div className="flex justify-end items-center gap-3">
                                                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.min((spike.peak_aqi_average / 500) * 100, 100)}%`,
                                                            backgroundColor: spike.peak_aqi_average > 300 ? '#ef4444' : spike.peak_aqi_average > 200 ? '#facc15' : '#4ade80'
                                                        }}
                                                    />
                                                </div>
                                                <span className="font-mono font-bold w-12 text-right">
                                                    {spike.peak_aqi_average.toFixed(1)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* =========================================== */
/*  Trajectory Vector (Module 2)               */
/* =========================================== */
function TrajectoryVector({ city, targetDate }: { city: string; targetDate: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!city || !targetDate) return;
        setLoading(true);
        setError("");
        fetch(`http://127.0.0.1:8000/tsmart/trajectory_vector?city=${encodeURIComponent(city)}&target_date=${encodeURIComponent(targetDate)}`)
            .then(res => {
                if (!res.ok) throw new Error("Could not fetch trajectory vector.");
                return res.json();
            })
            .then(resData => {
                if (resData.detail) throw new Error(resData.detail);
                setData(resData);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [city, targetDate]);

    if (loading) {
        return (
            <div className="glass-panel p-8 rounded-3xl border border-[var(--veridian-accent)]/20 mt-8 flex justify-center py-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `repeating-linear-gradient(90deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px),
                            repeating-linear-gradient(0deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px)`
                    }} />
                </div>
                <div className="w-8 h-8 border-2 border-[var(--veridian-accent)]/30 border-t-[var(--veridian-accent)] rounded-full animate-spin relative z-10" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="glass-panel p-8 rounded-3xl border border-red-500/20 mt-8 flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <p>Trajectory Vector Unavailable: {error || "No data"}</p>
            </div>
        );
    }

    // Prepare chart data combining baseline and predicted
    const chartData = [];
    const baselineLen = data.baseline_aqi.length;

    // Add baseline
    for (let i = 0; i < baselineLen; i++) {
        chartData.push({
            day: `Day -${baselineLen - i}`,
            actual: data.baseline_aqi[i],
            predicted: null,
            isForecast: false
        });
    }

    // Connect actual to predicted
    if (baselineLen > 0) {
        const lastActual = data.baseline_aqi[baselineLen - 1];

        // Add predicted
        for (let i = 0; i < data.predicted_aqi.length; i++) {
            chartData.push({
                day: `Day +${i + 1}`,
                actual: i === 0 ? lastActual : null, // Connect the lines
                predicted: data.predicted_aqi[i],
                isForecast: true
            });
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-8 border border-[var(--veridian-accent)]/30 relative overflow-hidden mt-8"
        >
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(90deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px),
                        repeating-linear-gradient(0deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px)`
                }} />
            </div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[var(--veridian-accent)]/20 flex items-center justify-center">
                                <GitMerge size={20} className="text-[var(--veridian-accent)]" />
                            </div>
                            <h3 className="text-xl font-bold">T-SMART: Trajectory Vector</h3>
                        </div>
                        <p className="text-foreground/50 text-sm max-w-2xl pl-13">
                            <span className="text-[var(--veridian-accent)] font-medium">Module 2 (Adaptive Brain):</span> Uses Dynamic Time Warping (DTW)
                            to match the exact shape of the last 14 days against 10 years of history, deriving the most statistically probable momentum drift.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-end min-w-[160px]">
                        <p className="text-xs text-foreground/40 uppercase tracking-wider mb-1">Drift Velocity (Δd)</p>
                        <div className="flex items-center gap-2">
                            {data.drift_velocity > 0 ? (
                                <ArrowUpRight className="text-red-400" size={20} />
                            ) : data.drift_velocity < 0 ? (
                                <ArrowDownRight className="text-blue-400" size={20} />
                            ) : (
                                <Minus className="text-foreground/40" size={20} />
                            )}
                            <span className={`text-2xl font-bold ${data.drift_velocity > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                {data.drift_velocity > 0 ? '+' : ''}{data.drift_velocity}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trajectory Chart */}
                <div className="h-[250px] w-full mt-8 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="rgba(255,255,255,0.2)"
                                fontSize={12}
                                tickLine={false}
                                minTickGap={20}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.2)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a2012', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <ReferenceLine x="Day +1" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="var(--veridian-primary)"
                                strokeWidth={3}
                                dot={false}
                                name="14-Day Baseline"
                            />
                            <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="var(--veridian-accent)"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={{ r: 4, fill: "var(--veridian-accent)", strokeWidth: 0 }}
                                name="Predicted Trajectory"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Historical Matches */}
                <div>
                    <p className="text-sm font-bold mb-4 flex items-center gap-2">
                        <Database size={14} className="text-[var(--veridian-primary)]" />
                        Top Historical DTW Matches
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {data.historical_matches?.map((match: any, idx: number) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-foreground/40 font-mono">Rank #{idx + 1}</span>
                                    <span className="text-[10px] uppercase font-bold text-[var(--veridian-primary)] bg-[var(--veridian-primary)]/10 px-2 py-0.5 rounded-full">
                                        Dist: {match.distance}
                                    </span>
                                </div>
                                <p className="font-bold text-sm">
                                    {new Date(match.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <span className="text-foreground/30 mx-2">to</span>
                                    {new Date(match.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
