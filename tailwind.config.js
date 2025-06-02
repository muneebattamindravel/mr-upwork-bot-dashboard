const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",        // blue-500
        secondary: "#e5e7eb",      // gray-200
        background: "#ffffff",
        input: "#f9fafb",
        ring: "#3b82f6",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      }
    },
  },
  plugins: [],
}
