"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Search, Calendar, TrendingUp, ShieldCheck, AlertCircle,
    ChevronDown, ChevronUp, Database, Cpu, Lock, BarChart3,
    Activity, Layers, ArrowRight, MapPin, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";

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
                            {/*  METHOD 2: COMING SOON PLACEHOLDER           */}
                            {/* ============================================ */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="glass-panel rounded-3xl p-8 border border-dashed border-[var(--veridian-accent)]/30 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: `repeating-linear-gradient(90deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px),
                                            repeating-linear-gradient(0deg, var(--veridian-primary) 0px, transparent 1px, transparent 30px)`
                                    }} />
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
