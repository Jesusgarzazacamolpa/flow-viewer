/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e7",
        secondary: "#8b5cf6",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        surface: "#0f172a",
        card: "#1e293b",
      },
    },
  },
  plugins: [],
};
