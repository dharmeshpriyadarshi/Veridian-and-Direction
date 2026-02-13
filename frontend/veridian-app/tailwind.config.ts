import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                veridian: {
                    primary: "var(--veridian-primary)",
                    dark: "var(--veridian-dark)",
                    black: "var(--veridian-black)",
                    accent: "var(--veridian-accent)",
                },
            },
        },
    },
    plugins: [],
};
export default config;
