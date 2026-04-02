window.AppCommon = (() => {
  const dataKeys = {
    batting: "hokusho-batting-data-v5",
    pitching: "hokusho-pitching-data-v5",
    catching: "hokusho-catching-data-v1",
    results: "hokusho-game-results-v1",
    overviewSettings: "hokusho-overview-settings-v1"
  };

  const divide = (a, b) => (b ? a / b : 0);
  const numberValue = (value) => Number(value || 0);
  const textValue = (value) => String(value || "").trim();
  const clampRecentCount = (value) => {
    const n = Number(value || 5);
    return Math.min(50, Math.max(1, Number.isFinite(n) ? Math.floor(n) : 5));
  };
  const formatDecimal = (value) => (Number.isFinite(value) ? value.toFixed(3) : "0.000");
  const formatMetric = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : "0");
  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (value) => {
    if (!value) return "";
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${Number(year)}年${Number(month)}月${Number(day)}日`;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime())
      ? text
      : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(date);
  };
  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
  const inningsToOuts = (value) => {
    const text = String(value || "0").trim();
    if (!text.includes(".")) return numberValue(text) * 3;
    const [whole, rest] = text.split(".");
    return (numberValue(whole) * 3) + (rest === "1" ? 1 : rest === "2" ? 2 : 0);
  };
  const formatInnings = (outs) => `${Math.floor(outs / 3)}.${outs % 3}`;
  const createMetricCard = (label, value, sub = "") => `
    <article class="metric-card">
      <p class="metric-name">${label}</p>
      <p class="metric-number">${value}</p>
      <p class="metric-note">${sub}</p>
    </article>
  `;
  const normalizeName = (value) => String(value || "")
    .replaceAll("\u3000", " ")
    .replace(/\s+/g, " ")
    .trim();
  const filePathToUrl = (path) => {
    const normalized = String(path || "").replaceAll("\\", "/");
    if (!normalized) return "";
    return /^[A-Za-z]:\//.test(normalized)
      ? encodeURI(`file:///${normalized}`)
      : encodeURI(normalized);
  };

  const roster = Array.isArray(window.HOKUSHO_ROSTER) ? window.HOKUSHO_ROSTER.map((player) => ({
    ...player,
    name: normalizeName(player.name),
    photoUrl: filePathToUrl(player.photoPath)
  })) : [];

  const findRosterPlayer = (name) => {
    const normalized = normalizeName(name);
    return roster.find((player) => player.name === normalized) || null;
  };

  const emitStorageChange = (detail) => {
    window.dispatchEvent(new CustomEvent("hokusho:storage-changed", { detail }));
  };

  const storage = {
    load(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
      } catch {
        return fallback;
      }
    },
    save(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      emitStorageChange({ key, value });
    },
    remove(key) {
      localStorage.removeItem(key);
      emitStorageChange({ key, removed: true });
    }
  };

  return {
    dataKeys,
    divide,
    numberValue,
    textValue,
    clampRecentCount,
    formatDecimal,
    formatMetric,
    formatPercent,
    formatDate,
    escapeHtml,
    inningsToOuts,
    formatInnings,
    createMetricCard,
    normalizeName,
    filePathToUrl,
    roster,
    findRosterPlayer,
    storage
  };
})();
