const battingKey = "hokusho-batting-data-v5";
const battingTrendMetrics = [
  { key: "ops", label: "OPS", higherIsBetter: true, digits: 3 },
  { key: "woba", label: "wOBA", higherIsBetter: true, digits: 3 },
  { key: "obp", label: "出塁率", higherIsBetter: true, digits: 3 },
  { key: "slg", label: "長打率", higherIsBetter: true, digits: 3 },
  { key: "isoP", label: "IsoP", higherIsBetter: true, digits: 3 },
  { key: "kRate", label: "三振率", higherIsBetter: false, digits: 3, percent: true },
  { key: "sbRate", label: "盗塁成功率", higherIsBetter: true, digits: 3, percent: true }
];

const battingState = {
  entries: AppCommon.storage.load(battingKey, []),
  selectedPlayer: AppCommon.roster[0]?.name || "",
  dateFrom: "",
  dateTo: "",
  selectedGameId: null,
  graphOpen: false,
  trendMetric: battingTrendMetrics[0].key
};

const battingQuickSelect = document.querySelector("#battingQuickSelect");
const battingPlayerFilter = document.querySelector("#battingPlayerFilter");
const battingDateFrom = document.querySelector("#battingDateFrom");
const battingDateTo = document.querySelector("#battingDateTo");
const battingClearDates = document.querySelector("#battingClearDates");
const battingPlayerProfile = document.querySelector("#battingPlayerProfile");
const battingTotals = document.querySelector("#battingTotals");
const battingSummary = document.querySelector("#battingSummary");
const battingGameDetail = document.querySelector("#battingGameDetail");
const battingSelectedGameLabel = document.querySelector("#battingSelectedGameLabel");
const battingAnalysis = document.querySelector("#battingAnalysis");
const battingDiffChart = document.querySelector("#battingDiffChart");
const battingTableBody = document.querySelector("#battingTableBody");
const battingGraphToggle = document.querySelector("#battingGraphToggle");
const battingTrendPanel = document.querySelector("#battingTrendPanel");
const battingTrendMetric = document.querySelector("#battingTrendMetric");
const battingTrendSummary = document.querySelector("#battingTrendSummary");
const battingTrendChart = document.querySelector("#battingTrendChart");

battingQuickSelect.addEventListener("change", (event) => {
  battingState.selectedPlayer = event.target.value;
  renderBatting();
});

battingPlayerFilter.addEventListener("change", (event) => {
  battingState.selectedPlayer = event.target.value;
  renderBatting();
});

battingDateFrom.addEventListener("change", (event) => {
  battingState.dateFrom = event.target.value;
  renderBatting();
});

battingDateTo.addEventListener("change", (event) => {
  battingState.dateTo = event.target.value;
  renderBatting();
});

battingClearDates.addEventListener("click", () => {
  battingState.dateFrom = "";
  battingState.dateTo = "";
  renderBatting();
});

battingGraphToggle.addEventListener("click", () => {
  battingState.graphOpen = !battingState.graphOpen;
  renderBatting();
});

battingTrendMetric.addEventListener("change", (event) => {
  battingState.trendMetric = event.target.value;
  renderBatting();
});

renderBatting();

window.addEventListener("hokusho:remote-applied", () => {
  battingState.entries = AppCommon.storage.load(battingKey, []);
  renderBatting();
});

function renderBatting() {
  syncControls();
  renderProfile();
  const entries = getVisibleEntries();
  renderTotals(entries);
  renderSummary(entries);
  renderDetail(entries);
  renderAnalysis(entries);
  renderDiff(entries);
  renderTrend(entries);
  renderTable(entries);
}

function getOrderedPlayerNames() {
  const ordered = [];
  [...AppCommon.roster.map((player) => player.name), ...battingState.entries.map((entry) => AppCommon.normalizeName(entry.player))].forEach((name) => {
    if (name && !ordered.includes(name)) ordered.push(name);
  });
  return ordered;
}

function getPlayersWithEntries() {
  const ordered = [];
  battingState.entries
    .map((entry) => AppCommon.normalizeName(entry.player))
    .forEach((name) => {
      if (name && !ordered.includes(name)) ordered.push(name);
    });
  return ordered;
}

function optionHtml(name) {
  return `<option value="${AppCommon.escapeHtml(name)}">${AppCommon.escapeHtml(name)}</option>`;
}

function syncControls() {
  const inputNames = getOrderedPlayerNames();
  const displayNames = getPlayersWithEntries();
  const selectedPool = displayNames.length ? displayNames : inputNames;
  battingState.selectedPlayer = selectedPool.includes(battingState.selectedPlayer) ? battingState.selectedPlayer : (selectedPool[0] || "");
  battingQuickSelect.innerHTML = selectedPool.map(optionHtml).join("");
  battingPlayerFilter.innerHTML = selectedPool.map(optionHtml).join("");
  battingQuickSelect.value = battingState.selectedPlayer;
  battingPlayerFilter.value = battingState.selectedPlayer;
  battingDateFrom.value = battingState.dateFrom;
  battingDateTo.value = battingState.dateTo;
  battingTrendMetric.innerHTML = battingTrendMetrics.map((metric) => `<option value="${metric.key}">${metric.label}</option>`).join("");
  battingTrendMetric.value = battingState.trendMetric;
  battingGraphToggle.textContent = battingState.graphOpen ? "グラフを閉じる" : "グラフで表示";
}

function renderTotals(entries) {
  if (!battingTotals) return;
  if (!entries.length) {
    battingTotals.innerHTML = `<div class="empty-box">この期間の集計数はありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  const hits = total.single + total.double + total.triple + total.homeRun;
  battingTotals.innerHTML = [
    AppCommon.createMetricCard("打席", String(total.pa), "表示期間の合計"),
    AppCommon.createMetricCard("打数", String(total.ab), "表示期間の合計"),
    AppCommon.createMetricCard("安打", String(hits), "単打 + 二塁打 + 三塁打 + 本塁打"),
    AppCommon.createMetricCard("単打", String(total.single), "表示期間の合計"),
    AppCommon.createMetricCard("二塁打", String(total.double), "表示期間の合計"),
    AppCommon.createMetricCard("三塁打", String(total.triple), "表示期間の合計"),
    AppCommon.createMetricCard("本塁打", String(total.homeRun), "表示期間の合計"),
    AppCommon.createMetricCard("打点", String(total.rbi), "表示期間の合計"),
    AppCommon.createMetricCard("得点", String(total.runs), "表示期間の合計"),
    AppCommon.createMetricCard("三振", String(total.so), "表示期間の合計"),
    AppCommon.createMetricCard("四球", String(total.bb), "表示期間の合計"),
    AppCommon.createMetricCard("死球", String(total.hbp), "表示期間の合計"),
    AppCommon.createMetricCard("犠打", String(total.sh), "表示期間の合計"),
    AppCommon.createMetricCard("犠打失敗", String(total.shFail), "表示期間の合計"),
    AppCommon.createMetricCard("犠飛", String(total.sf), "表示期間の合計"),
    AppCommon.createMetricCard("盗塁", String(total.sb), "表示期間の合計"),
    AppCommon.createMetricCard("盗塁失敗", String(total.cs), "表示期間の合計"),
    AppCommon.createMetricCard("牽制死", String(total.pickedOff), "表示期間の合計"),
    AppCommon.createMetricCard("併殺打", String(total.gdp), "表示期間の合計"),
    AppCommon.createMetricCard("失策", String(total.errors), "守備エラーの合計")
  ].join("");
}

function inDateRange(date) {
  if (!date) return true;
  if (battingState.dateFrom && date < battingState.dateFrom) return false;
  if (battingState.dateTo && date > battingState.dateTo) return false;
  return true;
}

function getVisibleEntries() {
  return battingState.entries
    .filter((entry) => AppCommon.normalizeName(entry.player) === battingState.selectedPlayer)
    .filter((entry) => inDateRange(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderProfile() {
  const player = AppCommon.findRosterPlayer(battingState.selectedPlayer);
  if (!player) {
    battingPlayerProfile.innerHTML = `<div class="empty-box">選手を選ぶとプロフィールが表示されます。</div>`;
    return;
  }
  battingPlayerProfile.innerHTML = `
    <img class="player-profile-image" src="${player.photoUrl}" alt="${AppCommon.escapeHtml(player.name)}">
    <div class="player-profile-copy">
      <p class="eyebrow">${AppCommon.escapeHtml(player.grade)}</p>
      <h3>${AppCommon.escapeHtml(player.name)}</h3>
      <p>打撃成績と試合ごとの推移をここで確認できます。</p>
    </div>
  `;
}

function calcBatting(entry) {
  const pa = AppCommon.numberValue(entry.pa);
  const ab = AppCommon.numberValue(entry.ab);
  const single = AppCommon.numberValue(entry.single);
  const doubleValue = AppCommon.numberValue(entry.double);
  const triple = AppCommon.numberValue(entry.triple);
  const homeRun = AppCommon.numberValue(entry.homeRun);
  const bb = AppCommon.numberValue(entry.bb);
  const hbp = AppCommon.numberValue(entry.hbp);
  const sf = AppCommon.numberValue(entry.sf);
  const sb = AppCommon.numberValue(entry.sb);
  const cs = AppCommon.numberValue(entry.cs);
  const pickedOff = AppCommon.numberValue(entry.pickedOff);
  const so = AppCommon.numberValue(entry.so);
  const gdp = AppCommon.numberValue(entry.gdp);
  const hits = single + doubleValue + triple + homeRun;
  const tb = single + (2 * doubleValue) + (3 * triple) + (4 * homeRun);
  const avg = AppCommon.divide(hits, ab);
  const obp = AppCommon.divide(hits + bb + hbp, ab + bb + hbp + sf);
  const slg = AppCommon.divide(tb, ab);
  const woba = AppCommon.divide((0.69 * bb) + (0.72 * hbp) + (0.89 * single) + (1.27 * doubleValue) + (1.62 * triple) + (2.1 * homeRun), ab + bb + hbp + sf);
  const rcBase = AppCommon.divide((hits + bb + hbp) * tb, ab + bb + hbp);
  const outsMade = Math.max(0, ab - hits);
  return {
    games: 1,
    pa,
    ab,
    hits,
    tb,
    avg,
    obp,
    slg,
    ops: obp + slg,
    woba,
    noi: ((obp + slg) / 3) * 1000,
    rc27: outsMade ? (rcBase * 27) / outsMade : 0,
    isoP: slg - avg,
    isoD: obp - avg,
    abPerHr: homeRun ? ab / homeRun : null,
    bbPerK: so ? bb / so : null,
    secA: AppCommon.divide((tb - hits) + bb + sb - cs - pickedOff, ab),
    ta: AppCommon.divide(hits + tb + bb + hbp + sb, Math.max(1, (ab - hits) + cs + gdp)),
    ps: null,
    paPerK: so ? pa / so : null,
    kRate: AppCommon.divide(so, pa),
    sbRate: AppCommon.divide(sb, sb + cs),
    so,
    bb,
    sb,
    cs
  };
}

function aggregate(entries) {
  const total = {
    games: entries.length,
    pa: 0, ab: 0, single: 0, runs: 0, double: 0, triple: 0, homeRun: 0, rbi: 0,
    so: 0, bb: 0, hbp: 0, sh: 0, shFail: 0, sf: 0, sb: 0, cs: 0, pickedOff: 0, gdp: 0, errors: 0
  };
  entries.forEach((entry) => {
    Object.keys(total).forEach((key) => {
      if (key !== "games") total[key] += AppCommon.numberValue(entry[key]);
    });
  });
  return { ...total, games: entries.length };
}

function formatMetric(value, digits = 3) {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(1)}%`;
}

function metricCards(metrics) {
  return [
    AppCommon.createMetricCard("盗塁成功率", formatPercent(metrics.sbRate), "盗塁 / 盗塁企図"),
    AppCommon.createMetricCard("出塁率", formatMetric(metrics.obp), "安打と四死球でどれだけ塁に出たか"),
    AppCommon.createMetricCard("三振率", formatPercent(metrics.kRate), "打席あたりの三振の多さ"),
    AppCommon.createMetricCard("長打率", formatMetric(metrics.slg), "長打の強さ"),
    AppCommon.createMetricCard("wOBA", formatMetric(metrics.woba), "得点価値を重みづけした打撃評価"),
    AppCommon.createMetricCard("NOI", formatMetric(metrics.noi, 0), "出塁率と長打率の簡易評価"),
    AppCommon.createMetricCard("OPS", formatMetric(metrics.ops), "出塁率 + 長打率"),
    AppCommon.createMetricCard("RC27", formatMetric(metrics.rc27, 2), "27アウトあたりの得点創出"),
    AppCommon.createMetricCard("IsoP", formatMetric(metrics.isoP), "純粋な長打力"),
    AppCommon.createMetricCard("IsoD", formatMetric(metrics.isoD), "打率を除いた出塁力"),
    AppCommon.createMetricCard("AB/HR", formatMetric(metrics.abPerHr, 2), "何打数で本塁打1本か"),
    AppCommon.createMetricCard("BB/K", formatMetric(metrics.bbPerK, 2), "選球眼と三振のバランス"),
    AppCommon.createMetricCard("SecA", formatMetric(metrics.secA), "長打と四球と盗塁の総合寄与"),
    AppCommon.createMetricCard("TA", formatMetric(metrics.ta, 2), "進塁に関わる総合力"),
    AppCommon.createMetricCard("PS", "-", "球数データがないため未計算"),
    AppCommon.createMetricCard("PA/K", formatMetric(metrics.paPerK, 2), "何打席で1三振か")
  ].join("");
}

function renderSummary(entries) {
  if (!entries.length) {
    battingSummary.innerHTML = `<div class="empty-box">この期間の打撃データはありません。</div>`;
    return;
  }
  battingSummary.innerHTML = metricCards(calcBatting(aggregate(entries)));
}

function renderDetail(entries) {
  const selected = entries.find((entry) => entry.id === battingState.selectedGameId) || entries[entries.length - 1];
  if (!selected) {
    battingSelectedGameLabel.textContent = "試合を選ぶと、その試合の指標を表示します。";
    battingGameDetail.innerHTML = `<div class="empty-box">この期間の打撃データはありません。</div>`;
    return;
  }
  battingState.selectedGameId = selected.id;
  battingSelectedGameLabel.textContent = `${AppCommon.formatDate(selected.date)} ${selected.player} vs ${selected.opponent}`;
  battingGameDetail.innerHTML = metricCards(calcBatting(selected));
}

function renderAnalysis(entries) {
  if (!entries.length) {
    battingAnalysis.innerHTML = `<p>この期間の打撃データがないため、分析は表示できません。</p>`;
    return;
  }
  const overall = calcBatting(aggregate(entries));
  const previous = battingState.entries
    .filter((entry) => AppCommon.normalizeName(entry.player) === battingState.selectedPlayer)
    .filter((entry) => !inDateRange(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const strengths = [];
  const issues = [];
  const trends = [];

  if (overall.woba >= 0.4) strengths.push("wOBA が高く、得点価値のある打席を作れている。");
  else if (overall.woba >= 0.34) strengths.push("wOBA は十分で、打線の中でプラスを出せる水準。");

  if (overall.ops >= 0.85) strengths.push("OPS が高く、出塁と長打の両方で相手に圧力をかけている。");
  if (overall.bbPerK != null && overall.bbPerK >= 0.6) strengths.push("BB/K が良く、雑な打席が少ない。");
  if (overall.sbRate >= 0.75 && (overall.sb + overall.cs) >= 4) strengths.push("盗塁成功率が高く、走塁でも得点期待値を上げている。");
  if (!strengths.length) strengths.push("数字上で強みと断言できる項目はまだ少ない。");

  if (overall.obp < 0.32) issues.push("出塁率が低く、打率か四球のどちらかを上げないと得点に結びつかない。");
  if (overall.slg < 0.38) issues.push("長打率が低く、単打偏重で得点期待値を押し上げきれていない。");
  if (overall.kRate >= 0.28) issues.push("三振率が高い。確率の低いスイングが多く、打席の質を落としている。");
  if (overall.bbPerK != null && overall.bbPerK < 0.3) issues.push("BB/K が低く、選球よりも凡打や三振に寄っている。");
  if (overall.sbRate < 0.6 && (overall.sb + overall.cs) >= 4) issues.push("盗塁成功率が低く、走塁で期待値を削っている。");
  if (!issues.length) issues.push("大きく崩れている数字は少ないが、まだ突出した強みを作りたい。");

  if (previous.length >= 3) {
    const previousMetrics = calcBatting(aggregate(previous));
    if (overall.woba - previousMetrics.woba >= 0.03) trends.push("前の期間より wOBA が上がっており、打席の質は改善している。");
    if (overall.kRate + 0.03 <= previousMetrics.kRate) trends.push("三振率が下がっており、対応力は良化している。");
    if (overall.ops + 0.05 <= previousMetrics.ops) trends.push("OPS は前の期間より下がっており、最近は打撃効率が落ちている。");
  } else {
    trends.push("比較用の過去データが少ないため、期間内の絶対値で評価している。");
  }

  battingAnalysis.innerHTML = `
    <p><strong>評価できる点:</strong> ${strengths.join(" ")}</p>
    <p><strong>改善が必要な点:</strong> ${issues.join(" ")}</p>
    <p><strong>最近の変化:</strong> ${trends.join(" ")}</p>
  `;
}

function renderDiff(entries) {
  if (!entries.length) {
    battingDiffChart.innerHTML = `<div class="empty-box">比較する打撃データがありません。</div>`;
    return;
  }
  const metrics = calcBatting(aggregate(entries));
  battingDiffChart.innerHTML = [
    chartRow("打率", metrics.avg, 1, true),
    chartRow("出塁率", metrics.obp, 1, true),
    chartRow("長打率", metrics.slg, 1, true),
    chartRow("OPS", metrics.ops, 1.5, true)
  ].join("");
}

function renderTrend(entries) {
  battingTrendPanel.hidden = !battingState.graphOpen;
  if (!battingState.graphOpen) return;
  if (!entries.length) {
    battingTrendSummary.innerHTML = `<div class="empty-box">グラフにできる打撃データがありません。</div>`;
    battingTrendChart.innerHTML = "";
    return;
  }
  const metricConfig = battingTrendMetrics.find((item) => item.key === battingState.trendMetric) || battingTrendMetrics[0];
  const points = entries.map((entry) => {
    const metric = calcBatting(entry);
    return {
      label: AppCommon.formatDate(entry.date),
      value: metric[metricConfig.key]
    };
  }).filter((point) => Number.isFinite(point.value));
  if (!points.length) {
    battingTrendSummary.innerHTML = `<div class="empty-box">この指標はグラフ化できません。</div>`;
    battingTrendChart.innerHTML = "";
    return;
  }
  const firstHalf = points.slice(0, Math.max(1, Math.floor(points.length / 2)));
  const secondHalf = points.slice(Math.floor(points.length / 2));
  const firstAvg = average(firstHalf.map((point) => point.value));
  const secondAvg = average(secondHalf.map((point) => point.value));
  const diff = secondAvg - firstAvg;
  const trend = judgeTrend(diff, metricConfig.higherIsBetter);
  battingTrendSummary.innerHTML = `
    <span class="trend-kicker ${trend.className}">${trend.label}</span>
    <p>前半平均 ${displayValue(firstAvg, metricConfig)} / 後半平均 ${displayValue(secondAvg, metricConfig)}</p>
    <p>${metricConfig.label} は ${trend.message}</p>
  `;
  battingTrendChart.innerHTML = createTrendSvg(points, metricConfig);
}

function renderTable(entries) {
  if (!entries.length) {
    battingTableBody.innerHTML = `<tr><td colspan="12"><div class="empty-box">この期間の打撃データはありません。</div></td></tr>`;
    return;
  }
  battingTableBody.innerHTML = [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const metric = calcBatting(entry);
    const activeClass = entry.id === battingState.selectedGameId ? "table-row-active" : "";
    return `
      <tr class="${activeClass}">
        <td>${AppCommon.formatDate(entry.date)}</td>
        <td>${AppCommon.escapeHtml(entry.opponent)}</td>
        <td>${AppCommon.escapeHtml(entry.player)}</td>
        <td>${metric.hits}</td>
        <td>${metric.ab}</td>
        <td>${formatPercent(metric.sbRate)}</td>
        <td>${formatMetric(metric.obp)}</td>
        <td>${formatMetric(metric.slg)}</td>
        <td>${formatMetric(metric.ops)}</td>
        <td>${formatMetric(metric.woba)}</td>
        <td><button class="table-button" type="button" data-view-id="${entry.id}">詳細</button></td>
        <td><button class="table-button" type="button" data-delete-id="${entry.id}">削除</button></td>
      </tr>
    `;
  }).join("");
  battingTableBody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      battingState.selectedGameId = button.dataset.viewId;
      renderBatting();
      document.querySelector("#battingGameDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  battingTableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteBattingEntry(button.dataset.deleteId);
    });
  });
}

function deleteBattingEntry(entryId) {
  const target = battingState.entries.find((entry) => entry.id === entryId);
  if (!target) return;
  const ok = confirm(`${AppCommon.formatDate(target.date)} ${target.opponent} ${target.player} の打撃データを削除しますか？`);
  if (!ok) return;
  battingState.entries = battingState.entries.filter((entry) => entry.id !== entryId);
  if (battingState.selectedGameId === entryId) battingState.selectedGameId = null;
  AppCommon.storage.save(battingKey, battingState.entries);
  renderBatting();
}

function chartRow(label, value, max, decimal = false) {
  const width = `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%`;
  const display = decimal ? value.toFixed(3) : String(value);
  return `<div class="chart-row"><div class="chart-label"><span>${label}</span><strong>${display}</strong></div><div class="chart-track"><div class="chart-fill" style="width:${width}"></div></div></div>`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function judgeTrend(diff, higherIsBetter) {
  const improved = higherIsBetter ? diff > 0.01 : diff < -0.01;
  const declined = higherIsBetter ? diff < -0.01 : diff > 0.01;
  if (improved) return { label: "上向き", className: "up", message: "前半より改善している。" };
  if (declined) return { label: "下向き", className: "down", message: "前半より悪化している。" };
  return { label: "横ばい", className: "flat", message: "前半と後半で大きな差はない。" };
}

function displayValue(value, metricConfig) {
  if (metricConfig.percent) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(metricConfig.digits ?? 3);
}

function createTrendSvg(points, metricConfig) {
  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const values = points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const xStep = points.length > 1 ? (width - padding.left - padding.right) / (points.length - 1) : 0;
  const y = (value) => padding.top + ((max - value) / (max - min)) * (height - padding.top - padding.bottom);
  const x = (index) => padding.left + (xStep * index);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`).join(" ");
  const gridLines = [0, 0.5, 1].map((ratio) => {
    const py = padding.top + ((height - padding.top - padding.bottom) * ratio);
    return `<line class="trend-grid-line" x1="${padding.left}" y1="${py}" x2="${width - padding.right}" y2="${py}"></line>`;
  }).join("");
  const pointDots = points.map((point, index) => `<circle class="trend-point" cx="${x(index)}" cy="${y(point.value)}" r="4"></circle>`).join("");
  const labels = points.map((point, index) => `<text class="trend-label" x="${x(index)}" y="${height - 14}" text-anchor="middle">${point.label}</text>`).join("");
  return `
    <div class="trend-chart-box">
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricConfig.label}の推移グラフ">
        <line class="trend-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="trend-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        ${gridLines}
        <path class="trend-line" d="${path}"></path>
        ${pointDots}
        ${labels}
      </svg>
    </div>
  `;
}
