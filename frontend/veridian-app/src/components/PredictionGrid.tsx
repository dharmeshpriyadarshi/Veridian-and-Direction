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

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
            >
                {/* Main Prediction Card (Historical Anchor) */}
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
                {/*  MODEL 2: T-SMART (ADAPTIVE BRAIN)           */}
                {/* ============================================ */}
                {tsmartResult && (
                    <div className="glass-panel rounded-3xl p-8 mb-6">
                        <div className="flex items-center gap-2 text-foreground/40 text-sm uppercase tracking-widest mb-6">
                            <GitMerge size={14} />
                            Method 2 — T-SMART (Adaptive Brain) for {result.prediction.city}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                <p className="text-foreground/50 text-sm mb-1">{result.prediction.city}</p>
                                <p className="text-foreground/40 text-xs mb-3">{result.prediction.display_date}, 2026</p>

                                {(() => {
                                    const match = tsmartResult.timeseries?.find((t: any) => t.date === selectedDate);
                                    const aqi = match?.predicted_aqi || 0;
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
                                <StatCard icon={<Database size={16} />} label="Matched Year" value={tsmartResult.intensity_adjustment?.historical_base_year || "—"} />
                                <StatCard icon={<ShieldCheck size={16} />} label="Match Confidence" value={tsmartResult.insight_narrative?.confidence_score || "—"} />
                                <StatCard icon={<TrendingUp size={16} />} label="Drift Velocity" value={tsmartResult.insight_narrative?.drift_velocity ? `${tsmartResult.insight_narrative.drift_velocity > 0 ? '+' : ''}${tsmartResult.insight_narrative.drift_velocity} days` : "—"} />
                                <StatCard icon={<Activity size={16} />} label="Intensity Adj" value={tsmartResult.intensity_adjustment?.percentage ? `${tsmartResult.intensity_adjustment.percentage > 0 ? '+' : ''}${tsmartResult.intensity_adjustment.percentage.toFixed(1)}%` : "—"} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================ */}
                {/*  MODEL 3: SARIMAX (STATISTICAL)              */}
                {/* ============================================ */}
                {sarimaxResult && (
                    <div className="glass-panel rounded-3xl p-8 mb-6">
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
                    <div className="glass-panel rounded-3xl p-8 mb-6">
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
