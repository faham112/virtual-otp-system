/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        line: "var(--border)",
        fg: "var(--text)",
        muted: "var(--muted)",
        header: "var(--header)",
        aside: "var(--aside)",
      },
    },
  },
  plugins: [],
};
