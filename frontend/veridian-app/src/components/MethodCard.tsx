"use client";

import React from "react";
import { motion } from "framer-motion";
import { getAqiCategoryInfo } from "./PredictionGrid";

interface MethodCardProps {
    methodNumber: number;
    title: string;
    subtitle: string;
    aqi: number | null;
    trend?: string | null;
    loading?: boolean;
}

export default function MethodCard({ methodNumber, title, subtitle, aqi, trend, loading }: MethodCardProps) {
    // Hooks must be unconditionally called before early returns
    const { category, color } = getAqiCategoryInfo(aqi ?? 0);

    if (!loading && aqi === null) return null;

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 border border-[#889063]/60 bg-gradient-to-b from-[#354024] to-[#1a2012] animate-pulse h-[180px]"
            />
        );
    }

    const trendColor = trend === "Deteriorating"
        ? "text-red-400"
        : trend === "Improving"
            ? "text-emerald-400"
            : "text-yellow-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border border-[#889063]/60 bg-gradient-to-b from-[#354024] to-[#1a2012] flex flex-col gap-3"
        >
            {/* Method Tag + Category Badge */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[#889063] text-[10px] font-medium uppercase tracking-widest mb-0.5">
                        Method {methodNumber}
                    </p>
                    <p className="text-[#E5D7C4] font-bold text-sm uppercase tracking-wide">{title}</p>
                    <p className="text-[#E5D7C4]/40 text-xs mt-0.5">{subtitle}</p>
                </div>
                <span
                    className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
                >
                    {category}
                </span>
            </div>

            {/* AQI Value */}
            <div className="text-5xl font-bold text-[#E5D7C4] tracking-tight">
                {(aqi ?? 0).toFixed(1)}
            </div>

            {/* Trend tag */}
            {trend && (
                <p className={`text-xs uppercase tracking-widest font-medium ${trendColor}`}>
                    {trend}
                </p>
            )}
        </motion.div>
    );
}
