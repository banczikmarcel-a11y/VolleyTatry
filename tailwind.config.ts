import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        court: {
          ink: "#17211f",
          navy: "#17211f",
          forest: "#245149",
          blue: "#33524d",
          mint: "#18c7a7",
          cyan: "#12d6d2",
          coral: "#f36f56",
          ice: "#f4faf7",
          line: "#d6e6df"
        }
      },
      boxShadow: {
        glow: "0 0 36px rgba(24, 199, 167, 0.24)",
        panel: "0 20px 60px rgba(23, 33, 31, 0.16)"
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
