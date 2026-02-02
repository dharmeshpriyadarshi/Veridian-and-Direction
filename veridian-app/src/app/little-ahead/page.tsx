"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import {
    Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useState, useEffect } from "react";
import { Info, Calendar, TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";

export default function LittleAheadPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState({ trend: "", safeDays: 0, peakDay: "" });

    useEffect(() => {
        fetch("http://127.0.0.1:8000/forecast")
            .then(res => res.json())
            .then((json) => {
                setData(json);
                analyzeData(json); // Perform local analysis
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const analyzeData = (dataset: any[]) => {
        if (!dataset.length) return;

        // Simple analysis logic
        const safeDays = dataset.filter(d => d.aqi < 100).length;
        const peak = dataset.reduce((prev, current) => (prev.aqi > current.aqi) ? prev : current);

        // Trend (Last vs First)
        const first = dataset[0].aqi;
        const last = dataset[dataset.length - 1].aqi;
        const trend = last > first ? "Rising (+)" : "Falling (-)";

        setAnalysis({
            trend,
            safeDays,
            peakDay: `${peak.day} (AQI ${peak.aqi.toFixed(0)})`
        });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel p-4 rounded-xl border border-[#00FF94]/30">
                    <p className="text-white font-bold mb-1">{label}</p>
                    <p className="text-[#00FF94] text-xl font-bold">AQI: {payload[0].value.toFixed(0)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <main className="min-h-screen bg-black text-white relative">
            <Navbar />

            <div className="pt-32 px-4 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-5xl md:text-6xl font-bold mb-4">Little Ahead</h1>
                    <p className="text-white/60 text-lg max-w-2xl">
                        AI-driven forecasting powered by Prophet & Sentinel-5P satellite imagery.
                    </p>
                </motion.div>

                {loading ? (
                    <div className="text-[#00FF94] animate-pulse">Loading ML Model...</div>
                ) : (
                    <>
                        {/* Analysis Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#00FF94]">
                                <div className="flex items-center gap-3 mb-2 text-white/60">
                                    <TrendingUp size={20} />
                                    <span className="uppercase text-xs tracking-widest font-bold">10-Day Trend</span>
                                </div>
                                <p className="text-3xl font-bold">{analysis.trend}</p>
                                <p className="text-xs text-white/40 mt-1">Comparing start vs end of period</p>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-yellow-400">
                                <div className="flex items-center gap-3 mb-2 text-white/60">
                                    <AlertCircle size={20} />
                                    <span className="uppercase text-xs tracking-widest font-bold">Projected Peak</span>
                                </div>
                                <p className="text-3xl font-bold">{analysis.peakDay}</p>
                                <p className="text-xs text-white/40 mt-1">Avoid outdoor exertion</p>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-400">
                                <div className="flex items-center gap-3 mb-2 text-white/60">
                                    <ShieldCheck size={20} />
                                    <span className="uppercase text-xs tracking-widest font-bold">Safe Days</span>
                                </div>
                                <p className="text-3xl font-bold">{analysis.safeDays} <span className="text-base font-normal opacity-50">/ {data.length}</span></p>
                                <p className="text-xs text-white/40 mt-1">Days with AQI &lt; 100</p>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel p-6 md:p-12 rounded-3xl mb-12 h-[500px]"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data}>
                                    <defs>
                                        <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        stroke="rgba(255,255,255,0.3)"
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(d) => d.split('-').slice(1).join('/')} // Format M/D
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.3)"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

                                    <Area
                                        type="monotone"
                                        dataKey="aqi"
                                        stroke="#00FF94"
                                        strokeWidth={3}
                                        fill="url(#colorAqi)"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </motion.div>
                    </>
                )}
            </div>
        </main>
    );
}
