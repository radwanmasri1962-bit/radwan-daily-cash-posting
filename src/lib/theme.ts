export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("dcp-theme");
  // Default to dark for the premium look; respect explicit user override.
  const dark = saved ? saved === "dark" : true;
  document.documentElement.classList.toggle("dark", dark);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("dcp-theme", isDark ? "dark" : "light");
}

export function isDark() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}
