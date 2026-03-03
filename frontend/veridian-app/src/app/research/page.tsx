"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Lock, Search, Filter, Cpu, Brain, Activity, Download, ChevronRight, Wind, Thermometer, Droplets, TreePine, Calendar, Eye, EyeOff } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart, ComposedChart,
    BarChart, Bar, Cell, Tooltip
} from 'recharts';

interface ForecastPoint {
    date: string;
    predicted_aqi: number;
    lower_bound: number;
    upper_bound: number;
    pulse_width: number;
    pulse_pct: number;
}

interface CausalityWeights {
    exogenous: {
        Wind_Speed: number;
        Temperature: number;
        Humidity: number;
    };
    system_memory: number;
    note: string;
}

interface DriverDominance {
    date: string;
    wind_pct: number;
    temp_pct: number;
    humid_pct: number;
    ar_pct: number;
}

interface SarimaxData {
    model_name: string;
    city: string;
    target_date: string;
    timeseries: ForecastPoint[];
    causality_weights: CausalityWeights;
    causality_narrative: string;
    driver_dominance: DriverDominance[];
    metrics_on_test_set: {
        rmse: number;
        mae: number;
        mape: number;
    };
}

interface TsmartData {
    city: string;
    target_date: string;
    intensity_adjustment: {
        factor: number;
        percentage: number;
        historical_base_year: string;
    };
    insight_narrative: {
        trajectory_name: string;
        drift_summary: string;
        narrative_notes: string[];
        confidence_score: string;
        drift_velocity: number;
        drift_direction: string;
        shock_intensity: number;
    };
    signature_comparison: {
        date: string;
        current_window: number;
        historical_match: number;
    }[];
    historical_ancestry: {
        date: string;
        matched_year: string;
    }[];
    timeseries: {
        date: string;
        predicted_aqi: number;
    }[];
    sarimax_overlay: {
        date: string;
        sarimax_aqi: number;
    }[];
}

interface XGBoostCityMetrics {
    training_range: string;
    testing_range: string;
    best_iteration: number;
    metrics: { rmse: number; mape: number };
    top_10_features: { feature: string; importance: number }[];
}

interface ComparisonEntry {
    sarimax_rmse: number | null;
    sarimax_mape: number | null;
    xgboost_rmse: number;
    xgboost_mape: number;
    winner_rmse: string;
    winner_mape: string;
}

interface XGBoostData {
    model: string;
    cities: Record<string, XGBoostCityMetrics>;
    comparison_matrix: Record<string, ComparisonEntry>;
}

interface XGBoostForecastPoint {
    date: string;
    predicted_aqi: number;
}

interface XGBoostForecast {
    model: string;
    city: string;
    timeseries: XGBoostForecastPoint[];
}

interface ShapFeature {
    feature: string;
    value: number;
    shap_value: number;
}

interface ShapData {
    city: string;
    date: string;
    base_value: number;
    features: ShapFeature[];
}

const CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bangalore"];
const TARGET_DATE = "2026-12-31"; // Default forecast horizon for the dashboard

export default function ResearchPage() {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [passcode, setPasscode] = useState("");
    const [error, setError] = useState(false);

    // Dashboard State
    const [selectedCity, setSelectedCity] = useState("Delhi");
    const [activeModel, setActiveModel] = useState<"SARIMAX" | "T-SMART" | "XGBOOST">("SARIMAX");
    const [sarimaxData, setSarimaxData] = useState<SarimaxData | null>(null);
    const [tsmartData, setTsmartData] = useState<TsmartData | null>(null);
    const [xgboostData, setXgboostData] = useState<XGBoostData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // T-SMART Features
    const [showSarimaxOverlay, setShowSarimaxOverlay] = useState(false);

    // XGBoost Forecast + SHAP
    const [xgboostForecast, setXgboostForecast] = useState<XGBoostForecast | null>(null);
    const [shapData, setShapData] = useState<ShapData | null>(null);
    const [shapDate, setShapDate] = useState("2026-06-15");
    const [showSarimaxLine, setShowSarimaxLine] = useState(false);
    const [showTsmartLine, setShowTsmartLine] = useState(false);
    const [sarimaxOverlayData, setSarimaxOverlayData] = useState<{ date: string; sarimax_aqi: number }[]>([]);
    const [tsmartOverlayData, setTsmartOverlayData] = useState<{ date: string; tsmart_aqi: number }[]>([]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === "VERIDIAN" || passcode === "admin") {
            setIsLoggedIn(true);
            setError(false);
        } else {
            setError(true);
        }
    };

    const fetchSarimaxData = async (city: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:8001/predict/sarimax?city=${city}&target_date=${TARGET_DATE}`, {
                method: "POST"
            });
            if (res.ok) {
                const data = await res.json();
                setSarimaxData(data);
            }
        } catch (err) {
            console.error("Failed to fetch SARIMAX data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTsmartData = async (city: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/predict/tsmart?city=${city}&target_date=${TARGET_DATE}`, {
                method: "POST"
            });
            if (res.ok) {
                const data = await res.json();
                setTsmartData(data);
            }
        } catch (err) {
            console.error("Failed to fetch T-SMART data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchXgboostData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:8001/model/xgboost/performance`);
            if (res.ok) {
                const data = await res.json();
                setXgboostData(data);
            }
            // Also fetch the 2026 forecast
            const forecastRes = await fetch(`http://localhost:8001/predict/xgboost?city=${selectedCity}`);
            if (forecastRes.ok) {
                const fData = await forecastRes.json();
                setXgboostForecast(fData);
            }
            // Fetch SHAP for default date
            fetchShapData(selectedCity, shapDate);
        } catch (err) {
            console.error("Failed to fetch XGBoost data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchShapData = async (city: string, date: string) => {
        try {
            const res = await fetch(`http://localhost:8001/predict/xgboost/shap?city=${city}&date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setShapData(data);
            }
        } catch (err) {
            console.error("Failed to fetch SHAP data:", err);
        }
    };

    const fetchOverlayData = async (modelType: "sarimax" | "tsmart", city: string) => {
        try {
            if (modelType === "sarimax") {
                const res = await fetch(`http://localhost:8001/predict/sarimax?city=${city}&target_date=2026-12-31`, { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    setSarimaxOverlayData(data.timeseries?.map((t: { date: string; predicted_aqi: number }) => ({ date: t.date, sarimax_aqi: t.predicted_aqi })) || []);
                }
            } else {
                const res = await fetch(`http://localhost:8000/predict/tsmart?city=${city}&target_date=2026-12-31`, { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    setTsmartOverlayData(data.timeseries?.map((t: { date: string; predicted_aqi: number }) => ({ date: t.date, tsmart_aqi: t.predicted_aqi })) || []);
                }
            }
        } catch (err) {
            console.error(`Failed to fetch ${modelType} overlay:`, err);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            if (activeModel === "SARIMAX") {
                fetchSarimaxData(selectedCity);
            } else if (activeModel === "T-SMART") {
                fetchTsmartData(selectedCity);
            } else if (activeModel === "XGBOOST") {
                fetchXgboostData();
            }
        }
    }, [isLoggedIn, selectedCity, activeModel]);

    // Data Transformation for the T-SMART Combined Chart
    const formatTsmartChartData = () => {
        if (!tsmartData) return [];
        return tsmartData.timeseries.map(pt => {
            const overlayMatch = tsmartData.sarimax_overlay.find(so => so.date === pt.date);
            const sarimax_aqi = overlayMatch ? overlayMatch.sarimax_aqi : null;
            return {
                date: pt.date,
                predicted_aqi: pt.predicted_aqi,
                sarimax_aqi: sarimax_aqi,
                delta_gap: sarimax_aqi !== null ? [Math.min(pt.predicted_aqi, sarimax_aqi), Math.max(pt.predicted_aqi, sarimax_aqi)] : null
            };
        });
    };

    // Custom Tooltip for Dominance Chart
    const DominanceTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#050A07] border border-white/20 p-3 rounded-lg shadow-xl whitespace-nowrap z-50">
                    <p className="text-[#00FF94] font-bold text-sm mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={`item-${index}`} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-mono font-bold">{entry.value}%</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };


    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center">
                <Navbar />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FF94] opacity-[0.02] blur-[120px] rounded-full" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-12 rounded-3xl w-full max-w-md relative z-10 text-center border border-white/5"
                >
                    <div className="bg-[#00FF94]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-[#00FF94]" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Researcher Access</h1>
                    <p className="text-white/50 mb-8">Restricted area for Veridian Global Collaborative Network.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder="Enter Access Code"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF94] transition-colors text-center tracking-widest"
                            />
                            {error && <p className="text-[#FF4C4C] text-xs mt-2">Invalid Access Code</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050A07] font-bold py-3 rounded-xl transition-all hover:scale-[1.02]"
                        >
                            Authenticate
                        </button>
                    </form>
                    <p className="text-xs text-white/30 mt-6 uppercase tracking-widest">Veridian Secure Protocol</p>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white relative flex flex-col pt-24 pb-12">
            <Navbar />

            {/* Title / Header */}
            <div className="px-6 lg:px-12 w-full max-w-[1600px] mx-auto mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold tracking-tight">Advanced Research Hub</h1>
                            <span className="px-2 py-1 bg-[#00FF94]/10 border border-[#00FF94]/30 text-[#00FF94] text-[10px] uppercase tracking-widest rounded-md font-bold">
                                Root Access
                            </span>
                        </div>
                        <p className="text-white/50">Comparative Study Layer: Evaluating Linear Baseline vs Adaptive Deep Learning.</p>
                    </div>

                    {/* Model Switcher */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveModel("SARIMAX")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeModel === "SARIMAX" ? "bg-[#00FF94] text-black shadow-[0_0_15px_rgba(0,255,148,0.3)]" : "text-white/50 hover:text-white"}`}
                        >
                            <Activity size={16} /> Model 3: SARIMAX
                        </button>
                        <button
                            onClick={() => setActiveModel("T-SMART")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeModel === "T-SMART" ? "bg-[#00FF94] text-black shadow-[0_0_15px_rgba(0,255,148,0.3)]" : "text-white/50 hover:text-white"}`}
                        >
                            <Brain size={16} /> Model 2: T-SMART
                        </button>
                        <button
                            onClick={() => setActiveModel("XGBOOST")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeModel === "XGBOOST" ? "bg-[#00FF94] text-black shadow-[0_0_15px_rgba(0,255,148,0.3)]" : "text-white/50 hover:text-white"}`}
                        >
                            <TreePine size={16} /> Model 4: XGBoost
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Container */}
            <div className="px-6 lg:px-12 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">

                {/* LEFT SIDEBAR (Controls & Context) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Control Panel */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Filter size={18} className="text-[#00FF94]" /> Experiment Controls</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Target Metropolis</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CITIES.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setSelectedCity(c)}
                                            className={`py-2 px-3 text-sm rounded-lg border transition-all truncate
                                                ${selectedCity === c
                                                    ? "bg-[#00FF94]/10 border-[#00FF94] text-[#00FF94]"
                                                    : "border-white/10 hover:border-white/30 text-white/70"}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Horizon</label>
                                <div className="bg-white/5 px-4 py-3 rounded-lg text-sm font-mono text-white/80">
                                    Continuous → 2026-12-31
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diagnostics Preview (Model 3 Only) */}
                    {activeModel === "SARIMAX" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-6 rounded-2xl border border-white/10 overflow-hidden"
                        >
                            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <Search size={16} /> Stationarity Diagnostics
                            </h3>
                            <p className="text-xs text-white/40 mb-3 block">ACF/PACF Partial Autocorrelation</p>
                            <div className="bg-black/50 rounded-xl overflow-hidden border border-white/5 w-full relative group">
                                <img
                                    src={`http://localhost:8000/assets/diagnostics/acf_pacf_${selectedCity.toLowerCase().replace(' ', '_')}.png`}
                                    alt={`ACF PACF ${selectedCity}`}
                                    className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT CONTENT AREA (Visualizations) */}
                <div className="lg:col-span-9 space-y-6">
                    {/* T-SMART FULL VIEW */}
                    {activeModel === "T-SMART" && (
                        <>
                            {isLoading ? (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-[#00FF94]/20 flex flex-col items-center justify-center bg-[#00FF94]/5 space-y-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF94]"></div>
                                    <p className="text-[#00FF94]/80 text-sm font-semibold tracking-wider">CALCULATING 365-DAY TRAJECTORY...</p>
                                </div>
                            ) : tsmartData ? (
                                <>
                                    {/* Main TimeSeries Chart with Overlay Toggle */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-xl font-bold">{selectedCity} - 2026 Forecast Trajectory</h2>
                                                <p className="text-sm text-white/50">T-SMART Engine | Adaptive DTW Match</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10 transition-colors hover:bg-white/10">
                                                    <input
                                                        type="checkbox"
                                                        id="sarimaxOverlay"
                                                        checked={showSarimaxOverlay}
                                                        onChange={(e) => setShowSarimaxOverlay(e.target.checked)}
                                                        className="accent-[#00FF94] w-4 h-4 cursor-pointer"
                                                    />
                                                    <label htmlFor="sarimaxOverlay" className="text-sm font-semibold cursor-pointer select-none text-white/80 hover:text-white transition-colors">Overlay SARIMAX Baseline</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-[400px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={formatTsmartChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorAqiTsmart" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#ffffff50"
                                                        tick={{ fill: '#ffffff50', fontSize: 12 }}
                                                        tickFormatter={(val) => {
                                                            const d = new Date(val);
                                                            return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                                                        }}
                                                        minTickGap={30}
                                                    />
                                                    <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} domain={[0, 'auto']} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }} />

                                                    {showSarimaxOverlay && (
                                                        <Area type="monotone" name="Prediction Gap" dataKey="delta_gap" stroke="none" fill="#ffffff15" />
                                                    )}

                                                    <Area type="monotone" name="T-SMART Adjusted Drift" dataKey="predicted_aqi" stroke="#00FF94" fill="url(#colorAqiTsmart)" strokeWidth={2} />

                                                    {showSarimaxOverlay && (
                                                        <Line type="monotone" name="SARIMAX Seasonal Mean" dataKey="sarimax_aqi" stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                                    )}
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Historical Ancestry Sparkline (Temporarily Hidden to match theme) */}
                                        {/* 
                                        {tsmartData.historical_ancestry && (
                                            <div className="mt-4 border-t border-white/10 pt-4">
                                                <div className="flex h-4 w-[calc(100%-30px)] ml-auto overflow-visible rounded-sm cursor-crosshair">
                                                    {tsmartData.historical_ancestry.map((ancestry: any, idx: number) => {
                                                        const getYearColor = (year: string) => {
                                                            const colors = { "2018": "#FF4C4C", "2019": "#FFD700", "2020": "#00FF94", "2021": "#00BFFF", "2022": "#FF00FF", "2023": "#FF8C00", "2024": "#8A2BE2" };
                                                            return colors[year as keyof typeof colors] || "#ffffff50";
                                                        }
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex-1 h-full hover:opacity-100 transition-opacity border-r border-[#050A07]/50 group relative"
                                                                style={{ backgroundColor: getYearColor(ancestry.matched_year), opacity: 0.7 }}
                                                            >
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#050A07] border border-white/20 px-3 py-1.5 rounded-md text-xs whitespace-nowrap z-50 pointer-events-none transition-opacity">
                                                                    This window mimics the atmospheric signature of {ancestry.matched_year}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <div className="flex justify-between w-[calc(100%-30px)] ml-auto mt-2 px-1">
                                                    <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Historical Ancestry Map</div>
                                                    <div className="flex gap-3">
                                                        <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-mono"><span className="w-2 h-2 rounded-full bg-[#FFD700]"></span> 2019</div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-mono"><span className="w-2 h-2 rounded-full bg-[#00FF94]"></span> 2020</div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-mono"><span className="w-2 h-2 rounded-full bg-[#00BFFF]"></span> 2021</div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-mono"><span className="w-2 h-2 rounded-full bg-[#8A2BE2]"></span> 2024</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        */}
                                    </div>

                                    {/* Pattern Match & Insight Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                                        {/* Transparency Parameters */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF94]/5 rounded-bl-full -z-10 blur-2xl"></div>

                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                    <Activity size={18} className="text-[#00FF94]" /> Adaptive Parameters
                                                </h3>
                                                <p className="text-xs text-white/50 mb-6">Real-time vector alignment metrics for the 365-day trajectory.</p>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Drift Velocity Radar */}
                                                <div className="group relative">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-white/50 font-bold uppercase tracking-widest">Temporal Drift</span>
                                                        <span className="text-lg font-mono text-white/90 font-bold">
                                                            {tsmartData.insight_narrative.drift_velocity}d <span className="text-[#00FF94] text-xs uppercase ml-1">{tsmartData.insight_narrative.drift_direction}</span>
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-white/40 mb-3 leading-snug pr-8">Tracks whether the projected pollution trajectory is arriving earlier or later than the historical seasonal baseline.</p>

                                                    <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/20 z-10 -translate-x-1/2"></div>
                                                        {tsmartData.insight_narrative.drift_direction === "Early" ? (
                                                            <div className="absolute top-0 bottom-0 right-1/2 bg-gradient-to-l from-[#00FF94] to-[#00FF94]/20 rounded-l-full" style={{ width: `${Math.min(50, (tsmartData.insight_narrative.drift_velocity / 30) * 50)}%` }}></div>
                                                        ) : (
                                                            <div className="absolute top-0 bottom-0 left-1/2 bg-gradient-to-r from-[#FF8C00] to-[#FF8C00]/20 rounded-r-full" style={{ width: `${Math.min(50, (tsmartData.insight_narrative.drift_velocity / 30) * 50)}%` }}></div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between mt-2 px-1">
                                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Early Onset</span>
                                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Late Onset</span>
                                                    </div>
                                                </div>

                                                {/* Shock Intensity Meter */}
                                                <div>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-white/50 font-bold uppercase tracking-widest">Shock Intensity</span>
                                                        <span className={`text-lg font-mono font-bold ${tsmartData.insight_narrative.shock_intensity > 20 ? "text-[#FF4C4C]" : "text-white/90"}`}>
                                                            +{tsmartData.insight_narrative.shock_intensity}%
                                                            {tsmartData.insight_narrative.shock_intensity > 20 && <span className="ml-2 text-[10px] uppercase tracking-widest bg-[#FF4C4C]/20 border border-[#FF4C4C]/50 px-2 py-1 rounded-md text-[#FF4C4C] relative -top-0.5">High Surge</span>}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-white/40 mb-3 leading-snug pr-8">Calculates the percentage by which the T-SMART adaptive peak exceeds the expected SARIMAX seasonal baseline.</p>
                                                    <div className="flex gap-1 h-3 w-full">
                                                        {[10, 20, 30, 40, 50].map((threshold) => {
                                                            const isActive = tsmartData.insight_narrative.shock_intensity >= threshold;
                                                            const isHighSurge = threshold > 20;
                                                            let bgColor = "bg-white/5";
                                                            if (isActive) {
                                                                bgColor = isHighSurge ? "bg-gradient-to-b from-[#FF4C4C] to-[#990000]" : "bg-gradient-to-b from-[#00FF94] to-[#006633]";
                                                            }
                                                            return (
                                                                <div
                                                                    key={threshold}
                                                                    className={`flex-1 rounded-sm transition-all duration-500 ease-out ${bgColor}`}
                                                                    style={{ opacity: isActive ? 1 : 0.5, boxShadow: isActive && isHighSurge ? '0 0 10px rgba(255, 76, 76, 0.4)' : 'none' }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between mt-2 px-1">
                                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Nominal</span>
                                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Severe</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Insight Engine Card */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                    <Brain size={18} className="text-[#00FF94]" /> Deep Observation
                                                </h3>
                                                <p className="text-xs text-white/50 mb-6">AI-synthesized narrative analyzing the interaction between Temporal Drift, Shock Intensity, and Historical Ancestry to explain the 2026 prediction.</p>
                                                <div className="mb-4">
                                                    <h4 className="text-[#00FF94] font-semibold text-lg">{tsmartData.insight_narrative.trajectory_name}</h4>
                                                    <p className="text-sm text-white/80 leading-relaxed mt-2">{tsmartData.insight_narrative.drift_summary}</p>
                                                </div>

                                                <div className="space-y-2 mt-6">
                                                    {tsmartData.insight_narrative.narrative_notes.map((note, idx) => (
                                                        <div key={idx} className="bg-[#00FF94]/5 border border-[#00FF94]/20 px-4 py-3 rounded-lg text-xs leading-relaxed flex items-center gap-3 text-white/90">
                                                            <div className="w-2 h-2 rounded-full bg-[#00FF94] shrink-0" />
                                                            {note}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-xs text-white/50 uppercase tracking-widest">Confidence Score</span>
                                                <span className="text-2xl font-mono text-[#00FF94] font-bold">{tsmartData.insight_narrative.confidence_score}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-[#ef4444]/20 flex flex-col items-center justify-center p-12 text-center bg-[#ef4444]/5">
                                    <h2 className="text-2xl font-bold mb-3 text-[#ef4444]">Failed to load T-SMART data</h2>
                                    <p className="text-white/60">Module integration is pending or returned an error.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* SARIMAX FULL VIEW */}
                    {activeModel === "SARIMAX" && (
                        <>
                            {isLoading ? (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-white/10 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF94]"></div>
                                </div>
                            ) : sarimaxData ? (
                                <>
                                    {/* Main TimeSeries Chart */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-xl font-bold">{selectedCity} - 2026 Forecast Trajectory</h2>
                                                <p className="text-sm text-white/50">{sarimaxData.model_name} | Baseline Seasonality Projection</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Testing RMSE</div>
                                                <div className="text-2xl font-mono text-[#00FF94]">{sarimaxData.metrics_on_test_set.rmse.toFixed(1)}</div>
                                            </div>
                                        </div>

                                        <div className="h-[400px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={sarimaxData.timeseries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#ffffff50"
                                                        tick={{ fill: '#ffffff50', fontSize: 12 }}
                                                        tickFormatter={(val) => {
                                                            const d = new Date(val);
                                                            return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                                                        }}
                                                        minTickGap={50}
                                                    />
                                                    <YAxis
                                                        stroke="#ffffff50"
                                                        tick={{ fill: '#ffffff50', fontSize: 12 }}
                                                        domain={[0, 'auto']}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#00FF94' }}
                                                        labelStyle={{ color: '#ffffff80', marginBottom: '8px' }}
                                                    />

                                                    {/* Confidence Interval Area */}
                                                    <Area
                                                        type="monotone"
                                                        dataKey="upper_bound"
                                                        stroke="none"
                                                        fill="url(#colorConfidence)"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="lower_bound"
                                                        stroke="none"
                                                        fill="#050A07" // Hides the bottom part to just show the band
                                                    />

                                                    {/* Main Prediction Line */}
                                                    <Line
                                                        type="monotone"
                                                        dataKey="predicted_aqi"
                                                        stroke="#00FF94"
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Confidence Pulse Visual Strip */}
                                        <div className="mt-4 pt-4 border-t border-white/10 group cursor-crosshair">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Confidence Pulse</span>
                                                <span className="text-[10px] text-white/50 uppercase tracking-widest">95% CI Boundary Width</span>
                                            </div>
                                            <div className="flex w-full h-3 overflow-visible rounded-sm bg-white/5 relative">
                                                {sarimaxData.timeseries.map((pt, i) => {
                                                    // Relative heatmap: pulse_pct is CI width as % of predicted AQI
                                                    // <50% = green (120), ~80% = yellow (60), >100% = red (0)
                                                    const pulsePct = pt.pulse_pct || 0;
                                                    const hue = Math.max(0, Math.min(120, 120 - (pulsePct - 40) * 2));
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="flex-1 h-full hover:opacity-100 opacity-80 transition-opacity relative group/pip"
                                                            style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
                                                        >
                                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/pip:opacity-100 bg-[#050A07] border border-white/20 px-2 py-1 rounded text-[10px] whitespace-nowrap z-50 pointer-events-none transition-opacity font-mono">
                                                                {pt.date} | CI: ±{(pt.pulse_width / 2).toFixed(0)} AQI ({pulsePct}%)
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Transparency & Causality Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Dynamic Driver Dominance Streamgraph */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                    <Cpu size={18} className="text-[#00FF94]" /> Driver Dominance
                                                </h3>
                                                <p className="text-xs text-white/40 mb-4">Daily percentage contribution of weather vs. system memory.</p>

                                                <div className="h-[180px] w-full mb-4">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={sarimaxData.driver_dominance} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                            <XAxis dataKey="date" hide={true} />
                                                            <YAxis hide={true} domain={[0, 100]} />
                                                            <Tooltip content={<DominanceTooltip />} />
                                                            <Area type="monotone" dataKey="wind_pct" stackId="1" stroke="none" fill="#00BFFF" name="Wind" />
                                                            <Area type="monotone" dataKey="temp_pct" stackId="1" stroke="none" fill="#FFBF00" name="Temperature" />
                                                            <Area type="monotone" dataKey="humid_pct" stackId="1" stroke="none" fill="#4169E1" name="Humidity" />
                                                            <Area type="monotone" dataKey="ar_pct" stackId="1" stroke="none" fill="#8A2BE2" name="AR Memory" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="bg-[#00FF94]/5 border border-[#00FF94]/20 p-4 rounded-xl text-xs leading-relaxed text-[#00FF94] flex gap-3">
                                                <div className="w-2 h-2 rounded-full bg-[#00FF94] shrink-0 mt-1" />
                                                {sarimaxData.causality_narrative}
                                            </div>
                                        </div>

                                        {/* Atmospheric Memory Gauge */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-10 blur-2xl"></div>

                                            <Activity size={32} className="text-white/40 mb-4" />
                                            <h3 className="text-lg font-bold mb-2">Atmospheric Memory</h3>
                                            <p className="text-sm text-white/50 mb-8 max-w-[250px]">
                                                The Auto-Regressive (AR) coefficient. A higher value means today's pollution is heavily dependent on yesterday's baseline.
                                            </p>

                                            <div className="relative w-40 h-40 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle
                                                        cx="80" cy="80" r="70"
                                                        stroke="#ffffff10" strokeWidth="12" fill="none"
                                                    />
                                                    <circle
                                                        cx="80" cy="80" r="70"
                                                        stroke="#00FF94" strokeWidth="12" fill="none"
                                                        strokeDasharray="440"
                                                        strokeDashoffset={440 - (440 * Math.max(0, sarimaxData.causality_weights.system_memory))}
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-mono font-bold">{sarimaxData.causality_weights.system_memory.toFixed(2)}</span>
                                                    <span className="text-xs text-white/40 uppercase tracking-widest mt-1">Weight</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-[#ef4444]/20 flex flex-col items-center justify-center p-12 text-center bg-[#ef4444]/5">
                                    <h2 className="text-2xl font-bold mb-3 text-[#ef4444]">Failed to load model data</h2>
                                    <p className="text-white/60">The backend API is unreachable or returned an error.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* XGBOOST FULL VIEW */}
                    {activeModel === "XGBOOST" && (
                        <>
                            {isLoading ? (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-white/10 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF94]"></div>
                                </div>
                            ) : xgboostData ? (
                                <>
                                    {/* Comparison Matrix */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-xl font-bold">Performance Comparison Matrix</h2>
                                                <p className="text-sm text-white/50">SARIMAX vs XGBoost — Out-of-Sample Test (2023-2024)</p>
                                            </div>
                                            <div className="px-3 py-1.5 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-lg">
                                                <span className="text-[#00FF94] text-xs font-bold uppercase tracking-widest">5 Cities</span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="text-left py-3 px-4 text-white/50 uppercase tracking-wider text-xs">City</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">SARIMAX RMSE</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">XGBoost RMSE</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">RMSE Winner</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">SARIMAX MAPE</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">XGBoost MAPE</th>
                                                        <th className="text-center py-3 px-4 text-white/50 uppercase tracking-wider text-xs">MAPE Winner</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(xgboostData.comparison_matrix).map(([city, comp]) => (
                                                        <tr key={city} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="py-3 px-4 font-semibold text-white">{city}</td>
                                                            <td className={`py-3 px-4 text-center font-mono ${comp.winner_rmse === 'SARIMAX' ? 'text-[#00FF94] font-bold' : 'text-white/60'}`}>
                                                                {comp.sarimax_rmse?.toFixed(2) ?? 'N/A'}
                                                            </td>
                                                            <td className={`py-3 px-4 text-center font-mono ${comp.winner_rmse === 'XGBoost' ? 'text-[#00FF94] font-bold' : 'text-white/60'}`}>
                                                                {comp.xgboost_rmse.toFixed(2)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${comp.winner_rmse === 'XGBoost' ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30' : 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'}`}>
                                                                    {comp.winner_rmse}
                                                                </span>
                                                            </td>
                                                            <td className={`py-3 px-4 text-center font-mono ${comp.winner_mape === 'SARIMAX' ? 'text-[#00FF94] font-bold' : 'text-white/60'}`}>
                                                                {comp.sarimax_mape?.toFixed(2) ?? 'N/A'}%
                                                            </td>
                                                            <td className={`py-3 px-4 text-center font-mono ${comp.winner_mape === 'XGBoost' ? 'text-[#00FF94] font-bold' : 'text-white/60'}`}>
                                                                {comp.xgboost_mape.toFixed(2)}%
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${comp.winner_mape === 'XGBoost' ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30' : 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'}`}>
                                                                    {comp.winner_mape}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Feature Importance + City Metrics */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Feature Importance Chart */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                            <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                <TreePine size={18} className="text-[#00FF94]" /> Feature Importance
                                            </h3>
                                            <p className="text-xs text-white/50 mb-6">Top 10 features for {selectedCity} (XGBoost gain-based split importance)</p>

                                            {xgboostData.cities[selectedCity] ? (
                                                <div className="h-[350px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={xgboostData.cities[selectedCity].top_10_features}
                                                            layout="vertical"
                                                            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                                            <XAxis type="number" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 11 }} />
                                                            <YAxis
                                                                type="category"
                                                                dataKey="feature"
                                                                stroke="#ffffff50"
                                                                tick={{ fill: '#ffffff80', fontSize: 11 }}
                                                                width={140}
                                                            />
                                                            <RechartsTooltip
                                                                contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }}
                                                                itemStyle={{ color: '#00FF94' }}
                                                            />
                                                            <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                                                                {xgboostData.cities[selectedCity].top_10_features.map((_, idx) => (
                                                                    <Cell key={idx} fill={idx === 0 ? '#00FF94' : idx < 3 ? '#00FF94aa' : '#00FF9455'} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="text-white/50 text-sm">No data for {selectedCity}</div>
                                            )}
                                        </div>

                                        {/* City XGBoost Diagnostics Card */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                    <Cpu size={18} className="text-[#00FF94]" /> {selectedCity} — XGBoost Diagnostics
                                                </h3>
                                                <p className="text-xs text-white/50 mb-6">Training &amp; evaluation summary for this city&apos;s model.</p>
                                            </div>

                                            {xgboostData.cities[selectedCity] ? (
                                                <div className="space-y-4 flex-grow">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                                                            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Test RMSE</div>
                                                            <div className="text-3xl font-mono font-bold text-[#00FF94]">{xgboostData.cities[selectedCity].metrics.rmse.toFixed(1)}</div>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                                                            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Test MAPE</div>
                                                            <div className="text-3xl font-mono font-bold text-white/90">{xgboostData.cities[selectedCity].metrics.mape.toFixed(1)}%</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Best Iteration (Early Stopping)</div>
                                                        <div className="flex items-end gap-2">
                                                            <span className="text-2xl font-mono font-bold text-white/90">{xgboostData.cities[selectedCity].best_iteration}</span>
                                                            <span className="text-sm text-white/40 mb-0.5">/ 1000</span>
                                                        </div>
                                                        <div className="mt-3 w-full bg-white/5 rounded-full h-2">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-[#00FF94] to-[#00FF94]/50"
                                                                style={{ width: `${(xgboostData.cities[selectedCity].best_iteration / 1000) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Training Range</div>
                                                            <div className="text-sm font-mono text-white/70">{xgboostData.cities[selectedCity].training_range.split(' to ').join(' → ')}</div>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Testing Range</div>
                                                            <div className="text-sm font-mono text-white/70">{xgboostData.cities[selectedCity].testing_range.split(' to ').join(' → ')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-white/50 text-sm">No model trained for {selectedCity}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2026 FORECAST CHART WITH TRIPLE OVERLAY */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">
                                                    <Activity size={20} /> 2026 Recursive Forecast
                                                </h2>
                                                <p className="text-sm text-white/50">365-day self-sustaining XGBoost trajectory with optional model overlays</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        const next = !showSarimaxLine;
                                                        setShowSarimaxLine(next);
                                                        if (next && sarimaxOverlayData.length === 0) fetchOverlayData("sarimax", selectedCity);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showSarimaxLine
                                                        ? "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/40"
                                                        : "text-white/40 border-white/10 hover:border-white/30"
                                                        }`}
                                                >
                                                    {showSarimaxLine ? <Eye size={14} /> : <EyeOff size={14} />} SARIMAX
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const next = !showTsmartLine;
                                                        setShowTsmartLine(next);
                                                        if (next && tsmartOverlayData.length === 0) fetchOverlayData("tsmart", selectedCity);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showTsmartLine
                                                        ? "bg-[#FF6B6B]/15 text-[#FF6B6B] border-[#FF6B6B]/40"
                                                        : "text-white/40 border-white/10 hover:border-white/30"
                                                        }`}
                                                >
                                                    {showTsmartLine ? <Eye size={14} /> : <EyeOff size={14} />} T-SMART
                                                </button>
                                            </div>
                                        </div>

                                        {xgboostForecast ? (
                                            <div className="h-[350px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart
                                                        data={xgboostForecast.timeseries.map(pt => {
                                                            const sarPt = sarimaxOverlayData.find(s => s.date === pt.date);
                                                            const tsPt = tsmartOverlayData.find(t => t.date === pt.date);
                                                            return {
                                                                ...pt,
                                                                sarimax_aqi: sarPt?.sarimax_aqi,
                                                                tsmart_aqi: tsPt?.tsmart_aqi,
                                                            };
                                                        })}
                                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                                        <XAxis
                                                            dataKey="date"
                                                            stroke="#ffffff30"
                                                            tick={{ fill: '#ffffff40', fontSize: 10 }}
                                                            tickFormatter={(d: string) => d.slice(5)}
                                                            interval={29}
                                                        />
                                                        <YAxis stroke="#ffffff30" tick={{ fill: '#ffffff40', fontSize: 11 }} />
                                                        <RechartsTooltip
                                                            contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }}
                                                            labelFormatter={(l) => `Date: ${l}`}
                                                        />
                                                        <Area type="monotone" dataKey="predicted_aqi" name="XGBoost" stroke="#00FF94" fill="#00FF9415" strokeWidth={2} />
                                                        {showSarimaxLine && <Line type="monotone" dataKey="sarimax_aqi" name="SARIMAX" stroke="#FFD700" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />}
                                                        {showTsmartLine && <Line type="monotone" dataKey="tsmart_aqi" name="T-SMART" stroke="#FF6B6B" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />}
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-[350px] flex items-center justify-center text-white/40">
                                                No forecast data. Run forecast_xgboost.py first.
                                            </div>
                                        )}
                                    </div>

                                    {/* SHAP WATERFALL */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">
                                                    <Search size={20} /> SHAP Transparency Layer
                                                </h2>
                                                <p className="text-sm text-white/50">Feature impact waterfall for {selectedCity} — what raised or lowered AQI on a specific day</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-white/40" />
                                                <input
                                                    type="date"
                                                    value={shapDate}
                                                    min="2026-01-01"
                                                    max="2026-12-31"
                                                    onChange={(e) => {
                                                        setShapDate(e.target.value);
                                                        fetchShapData(selectedCity, e.target.value);
                                                    }}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-[#00FF94]/50"
                                                />
                                            </div>
                                        </div>

                                        {shapData ? (
                                            <>
                                                <div className="flex items-center gap-4 mb-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded bg-[#ef4444]" />
                                                        <span className="text-white/50">Raises AQI</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded bg-[#22c55e]" />
                                                        <span className="text-white/50">Lowers AQI</span>
                                                    </div>
                                                    <div className="ml-auto text-white/40 font-mono text-xs">
                                                        Base value: {shapData.base_value} AQI
                                                    </div>
                                                </div>
                                                <div className="h-[400px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={shapData.features.slice(0, 12)}
                                                            layout="vertical"
                                                            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                                                            <XAxis
                                                                type="number"
                                                                stroke="#ffffff30"
                                                                tick={{ fill: '#ffffff50', fontSize: 11 }}
                                                                domain={['auto', 'auto']}
                                                            />
                                                            <YAxis
                                                                type="category"
                                                                dataKey="feature"
                                                                stroke="#ffffff30"
                                                                tick={{ fill: '#ffffff80', fontSize: 11 }}
                                                                width={160}
                                                            />
                                                            <RechartsTooltip
                                                                contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }}
                                                                formatter={(val, _, props) => {
                                                                    const v = typeof val === 'number' ? val : 0;
                                                                    const feat = (props as unknown as { payload: ShapFeature }).payload;
                                                                    return [`SHAP: ${v.toFixed(4)}  |  Value: ${feat.value.toFixed(2)}`, feat.feature];
                                                                }}
                                                            />
                                                            <Bar dataKey="shap_value" name="SHAP Impact" radius={[0, 4, 4, 0]}>
                                                                {shapData.features.slice(0, 12).map((feat, idx) => (
                                                                    <Cell
                                                                        key={idx}
                                                                        fill={feat.shap_value >= 0 ? '#ef4444' : '#22c55e'}
                                                                        fillOpacity={Math.min(1, 0.4 + Math.abs(feat.shap_value) / (Math.abs(shapData.features[0]?.shap_value || 1)) * 0.6)}
                                                                    />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-[300px] flex items-center justify-center text-white/40">
                                                Select a date to view SHAP feature impact.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-[400px] glass-panel rounded-2xl border border-[#ef4444]/20 flex flex-col items-center justify-center p-12 text-center bg-[#ef4444]/5">
                                    <h2 className="text-2xl font-bold mb-3 text-[#ef4444]">Failed to load XGBoost data</h2>
                                    <p className="text-white/60">Run train_xgboost.py or check the backend API.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
