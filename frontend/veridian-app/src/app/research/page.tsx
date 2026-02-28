"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Lock, Search, Filter, Cpu, Brain, Activity, Download, ChevronRight, Wind, Thermometer, Droplets } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart,
    BarChart, Bar, Cell, Tooltip
} from 'recharts';

interface ForecastPoint {
    date: string;
    predicted_aqi: number;
    lower_bound: number;
    upper_bound: number;
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

interface SarimaxData {
    model_name: string;
    city: string;
    target_date: string;
    timeseries: ForecastPoint[];
    causality_weights: CausalityWeights;
    metrics_on_test_set: {
        rmse: number;
        mae: number;
        mape: number;
    };
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
    const [activeModel, setActiveModel] = useState<"SARIMAX" | "T-SMART">("SARIMAX");
    const [sarimaxData, setSarimaxData] = useState<SarimaxData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
            const res = await fetch(`http://localhost:8000/predict/sarimax?city=${city}&target_date=${TARGET_DATE}`, {
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

    useEffect(() => {
        if (isLoggedIn && activeModel === "SARIMAX") {
            fetchSarimaxData(selectedCity);
        }
    }, [isLoggedIn, selectedCity, activeModel]);

    // Data Transformation for the Bar Chart
    const formatCausalityData = () => {
        if (!sarimaxData) return [];
        const w = sarimaxData.causality_weights.exogenous;
        return [
            { name: "Wind Speed", weight: w.Wind_Speed, raw: Math.abs(w.Wind_Speed) },
            { name: "Temperature", weight: w.Temperature, raw: Math.abs(w.Temperature) },
            { name: "Humidity", weight: w.Humidity, raw: Math.abs(w.Humidity) }
        ].sort((a, b) => b.raw - a.raw); // Sort by absolute magnitude
    };

    // Calculate dynamic narrative
    const generateNarrative = () => {
        if (!sarimaxData) return "";
        const w = sarimaxData.causality_weights.exogenous;
        const absWeights = [
            { name: "Wind Speed", val: Math.abs(w.Wind_Speed), real: w.Wind_Speed },
            { name: "Temperature", val: Math.abs(w.Temperature), real: w.Temperature },
            { name: "Humidity", val: Math.abs(w.Humidity), real: w.Humidity }
        ];
        absWeights.sort((a, b) => b.val - a.val);
        const topDriver = absWeights[0];

        let direction = topDriver.real < 0 ? "dispersing" : "trapping";
        if (topDriver.name === "Temperature" && topDriver.real > 0) direction = "exacerbating";

        return `High Transparency: For ${sarimaxData.city}, ${topDriver.name} is the dominant weather driver ${direction} pollution spikes (Weight: ${topDriver.real}).`;
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
                    {/* T-SMART PLACEHOLDER */}
                    {activeModel === "T-SMART" && (
                        <div className="w-full h-full min-h-[500px] glass-panel rounded-2xl border border-[#00FF94]/20 flex flex-col items-center justify-center p-12 text-center bg-[#00FF94]/5">
                            <Brain size={64} className="text-[#00FF94] mb-6 opacity-80" />
                            <h2 className="text-2xl font-bold mb-3">T-SMART Module Integration Pending</h2>
                            <p className="text-white/60 max-w-xl">
                                The Adaptive Deep Learning Engine (Model 2) dashboard is structurally prepared.
                                It will be mapped to visualize dynamic non-linear trend matching once the comparative layer is fully constructed.
                            </p>
                        </div>
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
                                    </div>

                                    {/* Transparency & Causality Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Exogenous Feature Weights */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                            <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                                                <Cpu size={18} className="text-[#00FF94]" /> Feature Significance
                                            </h3>
                                            <p className="text-xs text-white/40 mb-6">{sarimaxData.causality_weights.note}</p>

                                            <div className="h-[180px] w-full mb-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={formatCausalityData()} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                                                        <XAxis type="number" stroke="#ffffff50" tick={{ fontSize: 10 }} />
                                                        <YAxis dataKey="name" type="category" stroke="#ffffff50" tick={{ fontSize: 12, fill: '#fff' }} width={80} />
                                                        <Tooltip
                                                            cursor={{ fill: '#ffffff05' }}
                                                            contentStyle={{ backgroundColor: '#050A07', borderColor: '#ffffff20', borderRadius: '8px' }}
                                                        />
                                                        <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                                                            {formatCausalityData().map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.weight < 0 ? '#4ade80' : '#ef4444'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="bg-[#00FF94]/10 border border-[#00FF94]/20 p-3 rounded-xl text-sm leading-relaxed text-[#00FF94]">
                                                {generateNarrative()}
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
                </div>
            </div>
        </main>
    );
}
