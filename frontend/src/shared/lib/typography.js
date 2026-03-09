export const FONT_PRIMARY_CSS_VAR = "--font-primary";
export const INTER_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap";

export const getInterFontStylesheetTag = () =>
  `<link rel="stylesheet" href="${INTER_FONT_STYLESHEET_URL}">`;

export const getPrimaryFontStack = () => {
  if (typeof window === "undefined") {
    return "sans-serif";
  }

  const fontStack = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(FONT_PRIMARY_CSS_VAR)
    .trim();

  return fontStack || "sans-serif";
};
