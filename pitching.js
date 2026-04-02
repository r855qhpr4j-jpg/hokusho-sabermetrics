const pitchingKey = "hokusho-pitching-data-v5";
const pitchingTrendMetrics = [
  { key: "era", label: "防御率", higherIsBetter: false, digits: 3 },
  { key: "whip", label: "WHIP", higherIsBetter: false, digits: 3 },
  { key: "kbb", label: "K/BB", higherIsBetter: true, digits: 3 },
  { key: "k9", label: "K/9", higherIsBetter: true, digits: 3 },
  { key: "bb9", label: "BB/9", higherIsBetter: false, digits: 3 },
  { key: "hr9", label: "HR/9", higherIsBetter: false, digits: 3 },
  { key: "fip", label: "FIP", higherIsBetter: false, digits: 3 }
];

const pitchingState = {
  entries: AppCommon.storage.load(pitchingKey, []),
  selectedPlayer: "",
  dateFrom: "",
  dateTo: "",
  selectedGameId: null,
  graphOpen: false,
  trendMetric: pitchingTrendMetrics[0].key
};

const pitchingForm = document.querySelector("#pitchingForm");
const pitchingQuickSelect = document.querySelector("#pitchingQuickSelect");
const pitchingPlayerFilter = document.querySelector("#pitchingPlayerFilter");
const pitchingDateFrom = document.querySelector("#pitchingDateFrom");
const pitchingDateTo = document.querySelector("#pitchingDateTo");
const pitchingClearDates = document.querySelector("#pitchingClearDates");
const pitchingPlayerProfile = document.querySelector("#pitchingPlayerProfile");
const pitchingSummary = document.querySelector("#pitchingSummary");
const pitchingGameDetail = document.querySelector("#pitchingGameDetail");
const pitchingSelectedGameLabel = document.querySelector("#pitchingSelectedGameLabel");
const pitchingAnalysis = document.querySelector("#pitchingAnalysis");
const pitchingRateChart = document.querySelector("#pitchingRateChart");
const pitchingTableBody = document.querySelector("#pitchingTableBody");
const pitchingGraphToggle = document.querySelector("#pitchingGraphToggle");
const pitchingTrendPanel = document.querySelector("#pitchingTrendPanel");
const pitchingTrendMetric = document.querySelector("#pitchingTrendMetric");
const pitchingTrendSummary = document.querySelector("#pitchingTrendSummary");
const pitchingTrendChart = document.querySelector("#pitchingTrendChart");
const pitchingTotals = ensureTotalsHost();

pitchingQuickSelect.addEventListener("change", (event) => {
  pitchingState.selectedPlayer = event.target.value;
  renderPitching();
});

pitchingPlayerFilter.addEventListener("change", (event) => {
  pitchingState.selectedPlayer = event.target.value;
  renderPitching();
});

pitchingDateFrom.addEventListener("change", (event) => {
  pitchingState.dateFrom = event.target.value;
  renderPitching();
});

pitchingDateTo.addEventListener("change", (event) => {
  pitchingState.dateTo = event.target.value;
  renderPitching();
});

pitchingClearDates.addEventListener("click", () => {
  pitchingState.dateFrom = "";
  pitchingState.dateTo = "";
  renderPitching();
});

pitchingGraphToggle.addEventListener("click", () => {
  pitchingState.graphOpen = !pitchingState.graphOpen;
  renderPitching();
});

pitchingTrendMetric.addEventListener("change", (event) => {
  pitchingState.trendMetric = event.target.value;
  renderPitching();
});

window.addEventListener("hokusho:remote-applied", () => {
  pitchingState.entries = AppCommon.storage.load(pitchingKey, []);
  renderPitching();
});

renderPitching();

function ensureTotalsHost() {
  const existing = document.querySelector("#pitchingTotals");
  if (existing) return existing;
  const host = document.createElement("div");
  host.id = "pitchingTotals";
  host.className = "metric-grid";
  if (pitchingForm?.parentElement) {
    pitchingForm.parentElement.appendChild(host);
    pitchingForm.hidden = true;
  }
  return host;
}

function renderPitching() {
  syncControls();
  renderProfile();
  const entries = getVisibleEntries();
  renderTotals(entries);
  renderSummary(entries);
  renderDetail(entries);
  renderAnalysis(entries);
  renderRateChart(entries);
  renderTrend(entries);
  renderTable(entries);
}

function getPlayersWithEntries() {
  const names = [];
  pitchingState.entries.forEach((entry) => {
    const name = AppCommon.normalizeName(entry.player);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function syncControls() {
  const displayNames = getPlayersWithEntries();
  pitchingState.selectedPlayer = displayNames.includes(pitchingState.selectedPlayer) ? pitchingState.selectedPlayer : (displayNames[0] || "");
  pitchingQuickSelect.innerHTML = displayNames.map(optionHtml).join("");
  pitchingPlayerFilter.innerHTML = displayNames.map(optionHtml).join("");
  pitchingQuickSelect.value = pitchingState.selectedPlayer;
  pitchingPlayerFilter.value = pitchingState.selectedPlayer;
  pitchingDateFrom.value = pitchingState.dateFrom;
  pitchingDateTo.value = pitchingState.dateTo;
  pitchingTrendMetric.innerHTML = pitchingTrendMetrics.map((metric) => `<option value="${metric.key}">${metric.label}</option>`).join("");
  pitchingTrendMetric.value = pitchingState.trendMetric;
  pitchingGraphToggle.textContent = pitchingState.graphOpen ? "グラフを閉じる" : "グラフで表示";
  if (pitchingForm) pitchingForm.hidden = true;
}

function optionHtml(name) {
  return `<option value="${AppCommon.escapeHtml(name)}">${AppCommon.escapeHtml(name)}</option>`;
}

function inDateRange(date) {
  if (!date) return true;
  if (pitchingState.dateFrom && date < pitchingState.dateFrom) return false;
  if (pitchingState.dateTo && date > pitchingState.dateTo) return false;
  return true;
}

function getVisibleEntries() {
  return pitchingState.entries
    .filter((entry) => AppCommon.normalizeName(entry.player) === pitchingState.selectedPlayer)
    .filter((entry) => inDateRange(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderProfile() {
  const player = AppCommon.findRosterPlayer(pitchingState.selectedPlayer);
  if (!player) {
    pitchingPlayerProfile.innerHTML = `<div class="empty-box">表示できる投手データがありません。</div>`;
    return;
  }
  pitchingPlayerProfile.innerHTML = `
    <img class="player-profile-image" src="${player.photoUrl}" alt="${AppCommon.escapeHtml(player.name)}">
    <div class="player-profile-copy">
      <p class="eyebrow">${AppCommon.escapeHtml(player.grade)}</p>
      <h3>${AppCommon.escapeHtml(player.name)}</h3>
      <p>投手成績と指標を期間指定で確認できます。</p>
    </div>
  `;
}

function calcPitching(entry) {
  const outs = AppCommon.inningsToOuts(entry.innings);
  const ip = outs / 3;
  const walks = AppCommon.numberValue(entry.walks);
  const hitByPitch = AppCommon.numberValue(entry.hitByPitch);
  const intentionalDeadBall = AppCommon.numberValue(entry.intentionalDeadBall);
  const strikeouts = AppCommon.numberValue(entry.strikeouts);
  const hitsAllowed = AppCommon.numberValue(entry.hitsAllowed);
  const hrAllowed = AppCommon.numberValue(entry.hrAllowed);
  const earnedRuns = AppCommon.numberValue(entry.earnedRuns);
  const battersFaced = AppCommon.numberValue(entry.battersFaced);
  return {
    outs,
    innings: AppCommon.formatInnings(outs),
    era: AppCommon.divide(earnedRuns * 9, ip),
    whip: AppCommon.divide(hitsAllowed + walks + hitByPitch, ip),
    kbb: AppCommon.divide(strikeouts, walks),
    k9: AppCommon.divide(strikeouts * 9, ip),
    bb9: AppCommon.divide(walks * 9, ip),
    hr9: AppCommon.divide(hrAllowed * 9, ip),
    fip: AppCommon.divide((13 * hrAllowed) + (3 * (walks + hitByPitch + intentionalDeadBall)) - (2 * strikeouts), ip),
    kRate: AppCommon.divide(strikeouts, battersFaced),
    bbRate: AppCommon.divide(walks, battersFaced)
  };
}

function aggregate(entries) {
  return entries.reduce((total, entry) => {
    total.games += AppCommon.numberValue(entry.games);
    total.completeGames += AppCommon.numberValue(entry.completeGames);
    total.shutouts += AppCommon.numberValue(entry.shutouts);
    total.noWalkGames += AppCommon.numberValue(entry.noWalkGames);
    total.wins += AppCommon.numberValue(entry.wins);
    total.losses += AppCommon.numberValue(entry.losses);
    total.battersFaced += AppCommon.numberValue(entry.battersFaced);
    total.hitsAllowed += AppCommon.numberValue(entry.hitsAllowed);
    total.hrAllowed += AppCommon.numberValue(entry.hrAllowed);
    total.strikeouts += AppCommon.numberValue(entry.strikeouts);
    total.walks += AppCommon.numberValue(entry.walks);
    total.hitByPitch += AppCommon.numberValue(entry.hitByPitch);
    total.intentionalDeadBall += AppCommon.numberValue(entry.intentionalDeadBall);
    total.pickoffKills += AppCommon.numberValue(entry.pickoffKills);
    total.sacrificeKills += AppCommon.numberValue(entry.sacrificeKills);
    total.wildPitches += AppCommon.numberValue(entry.wildPitches);
    total.balks += AppCommon.numberValue(entry.balks);
    total.earnedRuns += AppCommon.numberValue(entry.earnedRuns);
    total.irScored += AppCommon.numberValue(entry.irScored);
    total.inheritedRunners += AppCommon.numberValue(entry.inheritedRunners);
    total.reliefGames += AppCommon.numberValue(entry.reliefGames);
    total.outs += AppCommon.inningsToOuts(entry.innings);
    return total;
  }, {
    games: 0, completeGames: 0, shutouts: 0, noWalkGames: 0, wins: 0, losses: 0, battersFaced: 0,
    hitsAllowed: 0, hrAllowed: 0, strikeouts: 0, walks: 0, hitByPitch: 0, intentionalDeadBall: 0,
    pickoffKills: 0, sacrificeKills: 0, wildPitches: 0, balks: 0, earnedRuns: 0, irScored: 0,
    inheritedRunners: 0, reliefGames: 0, outs: 0
  });
}

function metric(value, digits = 3) {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

function renderTotals(entries) {
  if (!pitchingTotals) return;
  if (!entries.length) {
    pitchingTotals.innerHTML = `<div class="empty-box">この期間の投手データはありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  pitchingTotals.innerHTML = [
    AppCommon.createMetricCard("登板", String(total.games), "表示期間の合計"),
    AppCommon.createMetricCard("完投", String(total.completeGames), "表示期間の合計"),
    AppCommon.createMetricCard("完封", String(total.shutouts), "表示期間の合計"),
    AppCommon.createMetricCard("無四球", String(total.noWalkGames), "表示期間の合計"),
    AppCommon.createMetricCard("勝数", String(total.wins), "表示期間の合計"),
    AppCommon.createMetricCard("敗数", String(total.losses), "表示期間の合計"),
    AppCommon.createMetricCard("打者", String(total.battersFaced), "表示期間の合計"),
    AppCommon.createMetricCard("投球回", AppCommon.formatInnings(total.outs), "表示期間の合計"),
    AppCommon.createMetricCard("被安打", String(total.hitsAllowed), "表示期間の合計"),
    AppCommon.createMetricCard("被本塁打", String(total.hrAllowed), "表示期間の合計"),
    AppCommon.createMetricCard("奪三振", String(total.strikeouts), "表示期間の合計"),
    AppCommon.createMetricCard("与四球", String(total.walks), "表示期間の合計"),
    AppCommon.createMetricCard("与死球", String(total.hitByPitch), "表示期間の合計"),
    AppCommon.createMetricCard("故意死球", String(total.intentionalDeadBall), "表示期間の合計"),
    AppCommon.createMetricCard("牽制刺殺", String(total.pickoffKills), "表示期間の合計"),
    AppCommon.createMetricCard("犠打封殺・刺殺", String(total.sacrificeKills), "表示期間の合計"),
    AppCommon.createMetricCard("暴投", String(total.wildPitches), "表示期間の合計"),
    AppCommon.createMetricCard("ボーク", String(total.balks), "表示期間の合計"),
    AppCommon.createMetricCard("自責点", String(total.earnedRuns), "表示期間の合計"),
    AppCommon.createMetricCard("IR生還数", String(total.irScored), "表示期間の合計"),
    AppCommon.createMetricCard("IR", String(total.inheritedRunners), "表示期間の合計"),
    AppCommon.createMetricCard("リリーフ登板", String(total.reliefGames), "表示期間の合計")
  ].join("");
}

function renderSummary(entries) {
  if (!entries.length) {
    pitchingSummary.innerHTML = `<div class="empty-box">この期間の投手データはありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  const stats = calcPitching({
    innings: AppCommon.formatInnings(total.outs),
    battersFaced: total.battersFaced,
    hitsAllowed: total.hitsAllowed,
    hrAllowed: total.hrAllowed,
    strikeouts: total.strikeouts,
    walks: total.walks,
    hitByPitch: total.hitByPitch,
    intentionalDeadBall: total.intentionalDeadBall,
    earnedRuns: total.earnedRuns
  });
  pitchingSummary.innerHTML = [
    AppCommon.createMetricCard("防御率", metric(stats.era), `自責点 ${total.earnedRuns}`),
    AppCommon.createMetricCard("WHIP", metric(stats.whip), "1イニングあたりの走者数"),
    AppCommon.createMetricCard("K/BB", metric(stats.kbb), "奪三振 / 与四球"),
    AppCommon.createMetricCard("K/9", metric(stats.k9), "9回換算"),
    AppCommon.createMetricCard("BB/9", metric(stats.bb9), "9回換算"),
    AppCommon.createMetricCard("HR/9", metric(stats.hr9), "9回換算"),
    AppCommon.createMetricCard("FIP", metric(stats.fip), "投手責任に近い失点指標")
  ].join("");
}

function renderDetail(entries) {
  const selected = entries.find((entry) => entry.id === pitchingState.selectedGameId) || entries[entries.length - 1];
  if (!selected) {
    pitchingSelectedGameLabel.textContent = "試合を選ぶと、その試合の投手指標を表示します。";
    pitchingGameDetail.innerHTML = `<div class="empty-box">この期間の投手データはありません。</div>`;
    return;
  }
  pitchingState.selectedGameId = selected.id;
  const stats = calcPitching(selected);
  pitchingSelectedGameLabel.textContent = `${AppCommon.formatDate(selected.date)} ${selected.player} vs ${selected.opponent}`;
  pitchingGameDetail.innerHTML = [
    AppCommon.createMetricCard("防御率", metric(stats.era)),
    AppCommon.createMetricCard("WHIP", metric(stats.whip)),
    AppCommon.createMetricCard("K/BB", metric(stats.kbb)),
    AppCommon.createMetricCard("K/9", metric(stats.k9)),
    AppCommon.createMetricCard("BB/9", metric(stats.bb9)),
    AppCommon.createMetricCard("HR/9", metric(stats.hr9)),
    AppCommon.createMetricCard("FIP", metric(stats.fip))
  ].join("");
}

function renderAnalysis(entries) {
  if (!entries.length) {
    pitchingAnalysis.innerHTML = `<p>この期間の投手データがないため、分析コメントは表示できません。</p>`;
    return;
  }
  const total = aggregate(entries);
  const stats = calcPitching({
    innings: AppCommon.formatInnings(total.outs),
    battersFaced: total.battersFaced,
    hitsAllowed: total.hitsAllowed,
    hrAllowed: total.hrAllowed,
    strikeouts: total.strikeouts,
    walks: total.walks,
    hitByPitch: total.hitByPitch,
    intentionalDeadBall: total.intentionalDeadBall,
    earnedRuns: total.earnedRuns
  });
  const good = [];
  const bad = [];
  if (stats.kbb >= 3) good.push("K/BB が高く、空振りとゾーン管理は一定水準です。");
  if (stats.whip <= 1.2) good.push("WHIP が低く、走者をためにくいです。");
  if (stats.fip <= 3) good.push("FIP が低く、投手単体の内容は良好です。");
  if (!good.length) good.push("突出した強みはまだ数値に出ていません。");
  if (stats.bb9 >= 4) bad.push("与四球率が高く、安定感を落としています。");
  if (stats.hr9 >= 1) bad.push("被本塁打率が高く、長打許容が重いです。");
  if (stats.era >= 4.5) bad.push("防御率が高く、失点抑止は改善が必要です。");
  if (!bad.length) bad.push("大きな弱点は目立ちませんが、より上を目指すなら奪三振率を伸ばしたいです。");
  pitchingAnalysis.innerHTML = `
    <p><strong>評価できる点:</strong> ${good.join(" ")}</p>
    <p><strong>改善が必要な点:</strong> ${bad.join(" ")}</p>
  `;
}

function renderRateChart(entries) {
  if (!entries.length) {
    pitchingRateChart.innerHTML = `<div class="empty-box">比較できる投手データがありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  const stats = calcPitching({
    innings: AppCommon.formatInnings(total.outs),
    battersFaced: total.battersFaced,
    hitsAllowed: total.hitsAllowed,
    hrAllowed: total.hrAllowed,
    strikeouts: total.strikeouts,
    walks: total.walks,
    hitByPitch: total.hitByPitch,
    intentionalDeadBall: total.intentionalDeadBall,
    earnedRuns: total.earnedRuns
  });
  pitchingRateChart.innerHTML = [
    chartRow("奪三振率", stats.kRate, 0.5, true),
    chartRow("与四球率", stats.bbRate, 0.3, true),
    chartRow("K/9", stats.k9, 12, false),
    chartRow("BB/9", stats.bb9, 6, false)
  ].join("");
}

function chartRow(label, value, max, isPercent) {
  const width = `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%`;
  const display = isPercent ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
  return `<div class="chart-row"><div class="chart-label"><span>${label}</span><strong>${display}</strong></div><div class="chart-track"><div class="chart-fill" style="width:${width}"></div></div></div>`;
}

function renderTrend(entries) {
  pitchingTrendPanel.hidden = !pitchingState.graphOpen;
  if (!pitchingState.graphOpen) return;
  if (!entries.length) {
    pitchingTrendSummary.innerHTML = `<div class="empty-box">グラフにできる投手データがありません。</div>`;
    pitchingTrendChart.innerHTML = "";
    return;
  }
  const config = pitchingTrendMetrics.find((item) => item.key === pitchingState.trendMetric) || pitchingTrendMetrics[0];
  const points = entries.map((entry) => ({ label: AppCommon.formatDate(entry.date), value: calcPitching(entry)[config.key] }))
    .filter((point) => Number.isFinite(point.value));
  if (!points.length) {
    pitchingTrendSummary.innerHTML = `<div class="empty-box">この指標はグラフ表示できません。</div>`;
    pitchingTrendChart.innerHTML = "";
    return;
  }
  const mid = Math.floor(points.length / 2);
  const first = average(points.slice(0, Math.max(1, mid)).map((point) => point.value));
  const second = average(points.slice(mid).map((point) => point.value));
  const trend = judgeTrend(second - first, config.higherIsBetter);
  pitchingTrendSummary.innerHTML = `
    <span class="trend-kicker ${trend.className}">${trend.label}</span>
    <p>前半平均 ${first.toFixed(3)} / 後半平均 ${second.toFixed(3)}</p>
    <p>${config.label} は ${trend.message}</p>
  `;
  pitchingTrendChart.innerHTML = createTrendSvg(points, config);
}

function renderTable(entries) {
  if (!entries.length) {
    pitchingTableBody.innerHTML = `<tr><td colspan="13"><div class="empty-box">この期間の投手データはありません。</div></td></tr>`;
    return;
  }
  pitchingTableBody.innerHTML = [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const stats = calcPitching(entry);
    const activeClass = entry.id === pitchingState.selectedGameId ? "table-row-active" : "";
    return `
      <tr class="${activeClass}">
        <td>${AppCommon.formatDate(entry.date)}</td>
        <td>${AppCommon.escapeHtml(entry.opponent)}</td>
        <td>${AppCommon.escapeHtml(entry.player)}</td>
        <td>${stats.innings}</td>
        <td>${metric(stats.era)}</td>
        <td>${metric(stats.whip)}</td>
        <td>${metric(stats.kbb)}</td>
        <td>${metric(stats.k9)}</td>
        <td>${metric(stats.bb9)}</td>
        <td>${metric(stats.hr9)}</td>
        <td>${metric(stats.fip)}</td>
        <td><button class="table-button" type="button" data-view-id="${entry.id}">詳細</button></td>
        <td><button class="table-button" type="button" data-delete-id="${entry.id}">削除</button></td>
      </tr>
    `;
  }).join("");
  pitchingTableBody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      pitchingState.selectedGameId = button.dataset.viewId;
      renderPitching();
      pitchingGameDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  pitchingTableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      deletePitchingEntry(button.dataset.deleteId);
    });
  });
}

function deletePitchingEntry(entryId) {
  const entry = pitchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  if (!confirm(`${AppCommon.formatDate(entry.date)} ${entry.opponent} ${entry.player} の投手データを削除しますか。`)) return;
  pitchingState.entries = pitchingState.entries.filter((item) => item.id !== entryId);
  if (pitchingState.selectedGameId === entryId) pitchingState.selectedGameId = null;
  AppCommon.storage.save(pitchingKey, pitchingState.entries);
  renderPitching();
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function judgeTrend(diff, higherIsBetter) {
  const improved = higherIsBetter ? diff > 0.05 : diff < -0.05;
  const declined = higherIsBetter ? diff < -0.05 : diff > 0.05;
  if (improved) return { label: "上向き", className: "up", message: "前半より改善しています。" };
  if (declined) return { label: "下向き", className: "down", message: "前半より悪化しています。" };
  return { label: "横ばい", className: "flat", message: "前半と後半で大きな差はありません。" };
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
  const pointDots = points.map((point, index) => `<circle class="trend-point" cx="${x(index)}" cy="${y(point.value)}" r="4"></circle>`).join("");
  const labels = points.map((point, index) => `<text class="trend-label" x="${x(index)}" y="${height - 14}" text-anchor="middle">${point.label}</text>`).join("");
  return `
    <div class="trend-chart-box">
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricConfig.label}の推移">
        <line class="trend-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="trend-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        <path class="trend-line" d="${path}"></path>
        ${pointDots}
        ${labels}
      </svg>
    </div>
  `;
}
