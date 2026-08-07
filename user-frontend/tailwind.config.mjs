/** @type {import('tailwindcss').Config} */

/**
 * Colours come from CSS variables holding space-separated RGB channels, so
 * Tailwind can composite an alpha modifier onto them. Mapping a token to a
 * bare `var(--x)` instead makes every `/NN` utility resolve to nothing and
 * disappear from the built stylesheet without warning.
 */
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: channel("ink"),
        surface: channel("surface"),
        "surface-2": channel("surface-2"),
        text: channel("text"),
        dim: channel("text-dim"),
        brand: channel("brand"),
        "brand-deep": channel("brand-deep"),
        "brand-bright": channel("brand-bright"),
        "brand-ink": channel("brand-ink"),
        ember: channel("ember"),
        // Already carry their own alpha; never used with a modifier.
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      fontFamily: {
        display: ['"Helvetica Now Display"', '"Helvetica Now Text"', "ui-sans-serif", "sans-serif"],
        sans: ['"Helvetica Now Text"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      transitionTimingFunction: {
        out: "var(--ease)",
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
