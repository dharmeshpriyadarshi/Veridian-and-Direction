"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User } from "lucide-react";
import { useState } from "react";

const navItems = [
    { name: "Insights", path: "/insights" },
    { name: "Little Ahead", path: "/little-ahead" },
    { name: "Simulate", path: "/simulate" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isResearcher, setIsResearcher] = useState(false); // Mock auth state

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4"
        >
            <div className="glass-panel px-8 py-4 flex items-center gap-12 rounded-full">
                {/* Logo */}
                <Link href="/" className="text-2xl font-bold tracking-tighter text-white hover:text-[#00FF94] transition-colors">
                    Veridian.
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-8 hidden md:flex">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`relative text-sm font-medium transition-colors hover:text-[#00FF94] ${pathname === item.path ? "text-[#00FF94]" : "text-white/70"
                                }`}
                        >
                            {item.name}
                            {pathname === item.path && (
                                <motion.div
                                    layoutId="underline"
                                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#00FF94]"
                                />
                            )}
                        </Link>
                    ))}
                </div>

                {/* Research / Auth */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/research"
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isResearcher
                                ? "bg-[#00FF94] text-[#050A07] hover:bg-[#00FF94]/90"
                                : "bg-white/5 text-white/50 border border-white/10 hover:border-[#00FF94]/50 hover:text-[#00FF94]"
                            }`}
                    >
                        {isResearcher ? (
                            <>
                                <User size={14} /> Researcher
                            </>
                        ) : (
                            <>
                                <Lock size={14} /> Research
                            </>
                        )}
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
