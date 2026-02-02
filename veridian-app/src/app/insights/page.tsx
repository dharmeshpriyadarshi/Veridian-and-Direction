"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Cloud, Wind, Droplets, MapPin, AlertTriangle, Activity, Search } from "lucide-react";
import { useState, useEffect } from "react";

// Types
interface PollutionData {
    location: string;
    aqi: number;
    pm25: number;
    pm10: number;
    no2: number;
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
}

export default function InsightsPage() {
    const [data, setData] = useState<PollutionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [city, setCity] = useState("Delhi");
    const [error, setError] = useState("");

    const fetchData = async (searchCity: string) => {
        setLoading(true);
        setError("");
        try {
            // Fetch from our Python Backend
            const res = await fetch(`http://127.0.0.1:8000/current?city=${searchCity}`);
            if (!res.ok) throw new Error("Could not fetch data. City not found?");
            const jsonData = await res.json();
            setData(jsonData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData("Delhi");
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(city);
    };

    const getStatus = (aqi: number) => {
        if (aqi <= 50) return { label: "Good", color: "text-[#00FF94]" };
        if (aqi <= 100) return { label: "Moderate", color: "text-yellow-400" };
        if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "text-orange-400" };
        if (aqi <= 200) return { label: "Unhealthy", color: "text-red-500" };
        if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-500" };
        return { label: "Hazardous", color: "text-red-700" };
    };

    return (
        <main className="min-h-screen bg-black text-white relative">
            <Navbar />

            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00FF94] opacity-[0.02] blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#2E8B57] opacity-[0.04] blur-[120px] rounded-full" />
            </div>

            <div className="pt-32 px-4 max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6"
                >
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-4">Live Insights</h1>
                        <div className="flex items-center gap-2 text-white/50">
                            <MapPin size={18} />
                            <span className="uppercase tracking-widest text-sm">
                                {data ? data.location : "Locating..."}
                            </span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search City (e.g. Mumbai, London)"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-3 pl-12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FF94] transition-colors"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    </form>
                </motion.div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="w-12 h-12 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-red-400 p-8 border border-red-500/30 rounded-2xl bg-red-500/10">
                        {error}
                    </div>
                ) : data && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Primary AQI Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="glass-panel p-8 rounded-3xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Activity size={200} />
                            </div>

                            <h2 className="text-xl font-medium text-white/70 mb-2">Air Quality Index</h2>
                            <div className="flex items-end gap-4 mb-6">
                                <span className={`text-8xl font-bold ${getStatus(data.aqi).color}`}>{data.aqi}</span>
                                <span className={`text-2xl pb-4 font-medium ${getStatus(data.aqi).color}`}>{getStatus(data.aqi).label}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "PM2.5", value: data.pm25, unit: "µg/m³" },
                                    { label: "PM10", value: data.pm10, unit: "µg/m³" },
                                    { label: "NO₂", value: data.no2, unit: "ppb" },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-xl">
                                        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{item.label}</p>
                                        <p className="text-xl font-semibold">{item.value} <span className="text-sm font-normal text-white/40">{item.unit}</span></p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Weather & Recommendations */}
                        <div className="space-y-8">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="glass-panel p-8 rounded-3xl flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-lg text-white/60 mb-1">Current Weather</h3>
                                    <div className="text-4xl font-bold flex items-center gap-4">
                                        {data.temp}°C
                                        <span className="text-base font-normal px-3 py-1 bg-white/10 rounded-full">{data.condition}</span>
                                    </div>
                                </div>
                                <div className="flex gap-6 text-white/60">
                                    <div className="text-center">
                                        <Droplets className="mx-auto mb-1 text-[#00FF94]" />
                                        <span className="text-sm">{data.humidity}%</span>
                                    </div>
                                    <div className="text-center">
                                        <Wind className="mx-auto mb-1 text-[#00FF94]" />
                                        <span className="text-sm">{data.windSpeed} km/h</span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className={`glass-panel p-8 rounded-3xl border-l-4 ${data.aqi > 150 ? 'border-l-[#FF4C4C]' : 'border-l-[#00FF94]'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className={data.aqi > 150 ? 'text-[#FF4C4C]' : 'text-[#00FF94]'} size={24} />
                                    <div>
                                        <h3 className="text-lg font-bold mb-2">Health Advisory</h3>
                                        <p className="text-white/70 leading-relaxed">
                                            {data.aqi > 150
                                                ? "Pollution levels are hazardous. Avoid outdoor activities. Wear a mask if stepping out is necessary."
                                                : "Air quality is acceptable. It is safe for outdoor activities for most people."}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-white/10 pt-6">
                                    <a href={`/simulate?aqi=${data.aqi}`} className="w-full block text-center py-3 rounded-xl bg-[#00FF94] text-[#050A07] font-bold hover:scale-105 transition-transform">
                                        Simulate Mitigation
                                    </a>
                                </div>
                            </motion.div>
                        </div>

                    </div>
                )}
            </div>
        </main>
    );
}
