import React from "react";
import { Cpu, BarChart3, Activity, Database, ShieldCheck, TrendingUp, Layers, GitMerge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================== */
/*  Type Definitions                           */
/* =========================================== */
export interface StatBlock {
    mean: number;
    median: number;
    std_dev: number;
    ci_95: [number, number];
    likely_range: [number, number];
    sample_size: number;
}

export interface YearBreakdown {
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

export interface PredictionResult {
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
    intensity_index: {
        value: number;
        surge_max: number;
    };
    forecast_7_day: {
        date: string;
        day_offset: number;
        baseline: number;
        surge_magnitude: number;
        is_surge: boolean;
        predicted_aqi: number;
    }[];
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

export interface PredictionGridProps {
    result: PredictionResult | null;
    tsmartResult: any;
    sarimaxResult: any;
    xgboostResult: any;
    xgbShapResult: any;
    xgbPerfResult: any;
    selectedDate: string;
    selectedCity: string;
}

/* =========================================== */
/*  Utility Functions                          */
/* =========================================== */
export const getAqiCategoryInfo = (aqi: number) => {
    if (!aqi) return { category: "Unknown", color: "#ffffff" };
    if (aqi <= 50) return { category: "Good", color: "#4ade80" };
    if (aqi <= 100) return { category: "Satisfactory", color: "#a3e635" };
    if (aqi <= 200) return { category: "Moderate", color: "#facc15" };
    if (aqi <= 300) return { category: "Poor", color: "#fb923c" };
    if (aqi <= 400) return { category: "Very Poor", color: "#ef4444" };
    return { category: "Severe", color: "#991b1b" };
};

export const getSeverityWidth = (aqi: number) => Math.min((aqi / 500) * 100, 100);

export const getAqiGradient = (aqi: number) => {
    if (aqi <= 50) return "from-green-400 to-green-600";
    if (aqi <= 100) return "from-yellow-300 to-yellow-500";
    if (aqi <= 200) return "from-orange-400 to-orange-600";
    if (aqi <= 300) return "from-red-400 to-red-600";
    return "from-red-700 to-red-900";
};

export const getDeviationColor = (z: number) => {
    if (z < -1) return "#4ade80";
    if (z < -0.3) return "#86efac";
    if (z < 0.3) return "#fbbf24";
    if (z < 1) return "#fb923c";
    return "#ef4444";
};

/* =========================================== */
/*  Reusable Stat Card Component               */
/* =========================================== */
export function StatCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) {
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
/*  Main Component Section                     */
/* =========================================== */
export default function PredictionGrid({
    result,
    tsmartResult,
    sarimaxResult,
    xgboostResult,
    xgbShapResult,
    xgbPerfResult,
    selectedDate,
    selectedCity
}: PredictionGridProps) {
    if (!result) return null;
    
    // Temporarily mark as used since we commented out Method 2
    void tsmartResult;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-6"
            >
                {/* 
                    ============================================ 
                    METHODS 1 & 2 TEMPORARILY HIDDEN
                    (Historical Anchor and T-SMART)
                    Removed for now per instructions. 
                    Will revisit in later phases of the project.
                    ============================================ 
                */}

                {/* ============================================ */}
                {/*  MODEL 3: SARIMAX (STATISTICAL)              */}
                {/* ============================================ */}
                {sarimaxResult && (
                    <div className="glass-panel rounded-3xl p-8">
                        <div className="flex items-center gap-2 text-foreground/40 text-sm uppercase tracking-widest mb-6">
                            <Layers size={14} />
                            Method 3 — SARIMAX Statistical Forecast for {result.prediction.city}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                <p className="text-foreground/50 text-sm mb-1">{result.prediction.city}</p>
                                <p className="text-foreground/40 text-xs mb-3">{result.prediction.display_date}, 2026</p>

                                {(() => {
                                    const aqi = sarimaxResult.predicted_aqi || 0;
                                    const catInfo = getAqiCategoryInfo(aqi);

                                    return (
                                        <>
                                            <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-b ${getAqiGradient(aqi)} bg-clip-text text-transparent`}>
                                                {aqi || "—"}
                                            </div>
                                            <p className="text-foreground/50 text-sm mt-1">Predicted AQI</p>
                                            <div
                                                className="mt-4 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: `${catInfo.color}22`,
                                                    color: catInfo.color,
                                                    border: `1px solid ${catInfo.color}44`
                                                }}
                                            >
                                                {catInfo.category}
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(() => {
                                    const match = sarimaxResult.timeseries?.find((t: any) => t.date === selectedDate);
                                    const pulse = match?.pulse_pct ? `${match.pulse_pct.toFixed(1)}%` : "—";
                                    const ciRange = sarimaxResult.lower_bound && sarimaxResult.upper_bound
                                        ? `${sarimaxResult.lower_bound} — ${sarimaxResult.upper_bound}`
                                        : "—";

                                    const drDom = sarimaxResult.driver_dominance?.find((d: any) => d.date === selectedDate) || sarimaxResult.driver_dominance?.[sarimaxResult.driver_dominance.length - 1];
                                    let domDriver = "—";
                                    if (drDom) {
                                        const drivers = { "Wind Speed": drDom.wind_pct, "Temperature": drDom.temp_pct, "Humidity": drDom.humid_pct, "System Memory": drDom.ar_pct };
                                        domDriver = Object.keys(drivers).reduce((a, b) => drivers[a as keyof typeof drivers] > drivers[b as keyof typeof drivers] ? a : b);
                                    }

                                    const rmse = sarimaxResult.metrics_on_test_set?.RMSE ? sarimaxResult.metrics_on_test_set.RMSE.toFixed(2) : "—";

                                    return (
                                        <>
                                            <StatCard icon={<Layers size={16} />} label="95% CI Range" value={ciRange} />
                                            <StatCard icon={<Cpu size={16} />} label="Dominant Driver" value={domDriver} />
                                            <StatCard icon={<ShieldCheck size={16} />} label="Model Confidence" value={pulse} sublabel="Pulse Metric Width" />
                                            <StatCard icon={<Activity size={16} />} label="RMSE Score" value={rmse} />
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================ */}
                {/*  MODEL 4: XGBOOST (MACHINE LEARNING)         */}
                {/* ============================================ */}
                {xgboostResult && (
                    <div className="glass-panel rounded-3xl p-8">
                        <div className="flex items-center gap-2 text-foreground/40 text-sm uppercase tracking-widest mb-6">
                            <Cpu size={14} />
                            Method 4 — XGBoost Machine Learning for {result.prediction.city}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                <p className="text-foreground/50 text-sm mb-1">{result.prediction.city}</p>
                                <p className="text-foreground/40 text-xs mb-3">{result.prediction.display_date}, 2026</p>

                                {(() => {
                                    const aqi = xgboostResult.predicted_aqi || 0;
                                    const catInfo = getAqiCategoryInfo(aqi);

                                    return (
                                        <>
                                            <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-b ${getAqiGradient(aqi)} bg-clip-text text-transparent`}>
                                                {aqi || "—"}
                                            </div>
                                            <p className="text-foreground/50 text-sm mt-1">Predicted AQI</p>
                                            <div
                                                className="mt-4 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: `${catInfo.color}22`,
                                                    color: catInfo.color,
                                                    border: `1px solid ${catInfo.color}44`
                                                }}
                                            >
                                                {catInfo.category}
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(() => {
                                    const topFeature = xgbShapResult?.features?.[0]?.feature || "—";
                                    const shapImpact = xgbShapResult?.features?.[0]?.shap_value ? `${xgbShapResult.features[0].shap_value > 0 ? '+' : ''}${xgbShapResult.features[0].shap_value.toFixed(2)}` : "—";

                                    const recurDepth = Math.floor((new Date(selectedDate).getTime() - new Date("2024-12-31").getTime()) / (1000 * 3600 * 24));

                                    const mape = xgbPerfResult?.cities?.[selectedCity]?.metrics?.mape ? `${xgbPerfResult.cities[selectedCity].metrics.mape.toFixed(1)}%` : "—";

                                    return (
                                        <>
                                            <StatCard icon={<TrendingUp size={16} />} label="Top Feature" value={topFeature} />
                                            <StatCard icon={<Activity size={16} />} label="SHAP Impact" value={shapImpact} />
                                            <StatCard icon={<Layers size={16} />} label="Recursive Depth" value={`${recurDepth > 0 ? recurDepth : 0} days`} sublabel="Since last real data" />
                                            <StatCard icon={<ShieldCheck size={16} />} label="ML Accuracy" value={mape} sublabel="MAPE Score" />
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
