/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",   // ← This line must include .jsx!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}