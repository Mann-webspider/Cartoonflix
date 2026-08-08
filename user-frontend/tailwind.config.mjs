/** @type {import('tailwindcss').Config} */

/**
 * Colours come from CSS variables holding space-separated RGB channels, so
 * Tailwind can composite an alpha modifier onto them. Mapping a token to a
 * bare `var(--x)` instead makes every `/NN` utility resolve to nothing and
 * disappear from the built stylesheet without warning.
 */
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
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
        dim: channel("dim"),
        "contrast-ink": channel("contrast-ink"),
        // Already carry their own alpha; never used with a modifier.
        line: "var(--line)",
        "line-strong": "var(--line-strong)",

        // shadcn's semantic names, mapped onto the same monochrome tokens so
        // its components inherit this palette instead of importing a second one.
        border: "var(--line)",
        input: "var(--line)",
        ring: channel("text"),
        background: channel("ink"),
        foreground: channel("text"),
        primary: { DEFAULT: channel("text"), foreground: channel("contrast-ink") },
        secondary: { DEFAULT: channel("surface-2"), foreground: channel("text") },
        muted: { DEFAULT: channel("surface"), foreground: channel("dim") },
        accent: { DEFAULT: channel("surface-2"), foreground: channel("text") },
        destructive: { DEFAULT: "rgb(220 70 70 / <alpha-value>)", foreground: channel("text") },
        popover: { DEFAULT: channel("surface"), foreground: channel("text") },
        card: { DEFAULT: channel("surface"), foreground: channel("text") },
      },
      fontFamily: {
        sans: ['"Archivo Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Archivo Variable"', "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "var(--radius)",
      },
      transitionTimingFunction: {
        out: "var(--ease)",
        spring: "var(--ease-spring)",
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
