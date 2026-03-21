"use client";

import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Search, Calendar, AlertCircle, ChevronDown, Cpu, MapPin
} from "lucide-react";
import PredictionGrid, { PredictionResult } from "@/components/PredictionGrid";
import MetaLearnerHeroCard from "@/components/MetaLearnerHeroCard";
import MethodCard from "@/components/MethodCard";

/* =========================================== */
/*  Main Page Component                        */
/* =========================================== */

export default function LittleAheadPage() {
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedCity, setSelectedCity] = useState("Delhi");
    const [cities, setCities] = useState<string[]>([]);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [tsmartResult, setTsmartResult] = useState<any>(null);
    const [sarimaxResult, setSarimaxResult] = useState<any>(null);
    const [xgboostResult, setXgboostResult] = useState<any>(null);
    const [xgbShapResult, setXgbShapResult] = useState<any>(null);
    const [xgbPerfResult, setXgbPerfResult] = useState<any>(null);
    const [metaResult, setMetaResult] = useState<any>(null);
    const [trajectoryData, setTrajectoryData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
        setTsmartResult(null);
        setSarimaxResult(null);
        setXgboostResult(null);
        setXgbShapResult(null);
        setXgbPerfResult(null);
        setMetaResult(null);

        try {
            const [anchorRes, tsmartRes, sarimaxRes, xgboostRes, shapRes, perfRes, metaRes] = await Promise.all([
                fetch(`http://127.0.0.1:8000/predict-anchor?date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`),
                fetch(`http://127.0.0.1:8000/predict/tsmart?target_date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`, { method: "POST" }).catch(() => null),
                fetch(`http://127.0.0.1:8000/predict/sarimax?target_date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`, { method: "POST" }).catch(() => null),
                fetch(`http://127.0.0.1:8000/predict/xgboost?city=${encodeURIComponent(selectedCity)}`).catch(() => null),
                fetch(`http://127.0.0.1:8000/predict/xgboost/shap?date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`).catch(() => null),
                fetch(`http://127.0.0.1:8000/model/xgboost/performance`).catch(() => null),
                fetch(`http://127.0.0.1:8000/api/v1/predict/meta-ensemble?date=${selectedDate}&city=${encodeURIComponent(selectedCity)}`).catch(() => null)
            ]);

            if (!anchorRes.ok) {
                const errData = await anchorRes.json();
                throw new Error(errData.detail || "Prediction failed.");
            }
            const data: PredictionResult = await anchorRes.json();
            setResult(data);

            if (tsmartRes && tsmartRes.ok) {
                const tData = await tsmartRes.json();
                setTsmartResult(tData);
            }
            if (sarimaxRes && sarimaxRes.ok) {
                const sData = await sarimaxRes.json();
                setSarimaxResult(sData);
            }
            if (xgboostRes && xgboostRes.ok) {
                const xData = await xgboostRes.json();
                const match = xData.timeseries?.find((t: any) => t.date === selectedDate);
                if (match) {
                    setXgboostResult({ ...xData, predicted_aqi: match.predicted_aqi });
                } else {
                    setXgboostResult(xData);
                }
            }
            if (shapRes && shapRes.ok) {
                const shapData = await shapRes.json();
                setXgbShapResult(shapData);
            }
            if (perfRes && perfRes.ok) {
                const perfData = await perfRes.json();
                setXgbPerfResult(perfData);
            }
            if (metaRes && metaRes.ok) {
                const mData = await metaRes.json();
                setMetaResult(mData);
            }
        } catch (err: any) {
            setError(err.message || "Could not connect to the ML Engine. Is the API running?");
        } finally {
            setLoading(false);
        }
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

                {/* META-LEARNER HERO */}
                {(loading || metaResult) && (
                    <MetaLearnerHeroCard data={metaResult} loading={loading} />
                )}

                {/* BASE METHOD CARDS — Methods 5 & 6 */}
                {(loading || metaResult) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <MethodCard
                            methodNumber={5}
                            title="LSTM"
                            subtitle="Long-Term Temporal Memory"
                            aqi={metaResult?.lstm_aqi ?? null}
                            trend={metaResult?.trend ?? null}
                            loading={loading}
                        />
                        <MethodCard
                            methodNumber={6}
                            title="1D-CNN"
                            subtitle="Localized Pattern Recognition"
                            aqi={metaResult?.cnn_aqi ?? null}
                            trend={metaResult?.trend ?? null}
                            loading={loading}
                        />
                    </div>
                )}

                <PredictionGrid
                    result={result}
                    tsmartResult={tsmartResult}
                    sarimaxResult={sarimaxResult}
                    xgboostResult={xgboostResult}
                    xgbShapResult={xgbShapResult}
                    xgbPerfResult={xgbPerfResult}
                    selectedDate={selectedDate}
                    selectedCity={selectedCity}
                />

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


