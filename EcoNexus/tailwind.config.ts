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
        primary: "#165DFF",
        secondary: "#0FC6C2",
        accent: "#722ED1",
        success: "#00B42A",
        warning: "#FF7D00",
        danger: "#F53F3F",
      },
    },
  },
  plugins: [],
};

export default config;
