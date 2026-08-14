/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      screens: {
        'compact': '0px',
        'standard': '380px',
        'expanded': '430px',
      },
    },
  },
  plugins: [],
}
