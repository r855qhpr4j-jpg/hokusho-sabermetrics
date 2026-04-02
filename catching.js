const catchingKey = "hokusho-catching-data-v1";

const catchingState = {
  entries: AppCommon.storage.load(catchingKey, []),
  selectedPlayer: "",
  dateFrom: "",
  dateTo: "",
  selectedGameId: null
};

const catchingForm = document.querySelector("#catchingForm");
const catchingQuickSelect = document.querySelector("#catchingQuickSelect");
const catchingPlayerFilter = document.querySelector("#catchingPlayerFilter");
const catchingDateFrom = document.querySelector("#catchingDateFrom");
const catchingDateTo = document.querySelector("#catchingDateTo");
const catchingClearDates = document.querySelector("#catchingClearDates");
const catchingPlayerProfile = document.querySelector("#catchingPlayerProfile");
const catchingSummary = document.querySelector("#catchingSummary");
const catchingGameDetail = document.querySelector("#catchingGameDetail");
const catchingSelectedGameLabel = document.querySelector("#catchingSelectedGameLabel");
const catchingAnalysis = document.querySelector("#catchingAnalysis");
const catchingRateChart = document.querySelector("#catchingRateChart");
const catchingTableBody = document.querySelector("#catchingTableBody");
const catchingTotals = ensureTotalsHost();

catchingQuickSelect.addEventListener("change", (event) => {
  catchingState.selectedPlayer = event.target.value;
  renderCatching();
});

catchingPlayerFilter.addEventListener("change", (event) => {
  catchingState.selectedPlayer = event.target.value;
  renderCatching();
});

catchingDateFrom.addEventListener("change", (event) => {
  catchingState.dateFrom = event.target.value;
  renderCatching();
});

catchingDateTo.addEventListener("change", (event) => {
  catchingState.dateTo = event.target.value;
  renderCatching();
});

catchingClearDates.addEventListener("click", () => {
  catchingState.dateFrom = "";
  catchingState.dateTo = "";
  renderCatching();
});

window.addEventListener("hokusho:remote-applied", () => {
  catchingState.entries = AppCommon.storage.load(catchingKey, []);
  renderCatching();
});

renderCatching();

function ensureTotalsHost() {
  const existing = document.querySelector("#catchingTotals");
  if (existing) return existing;
  const host = document.createElement("div");
  host.id = "catchingTotals";
  host.className = "metric-grid";
  if (catchingForm?.parentElement) {
    catchingForm.parentElement.appendChild(host);
    catchingForm.hidden = true;
  }
  return host;
}

function renderCatching() {
  syncControls();
  renderProfile();
  const entries = getVisibleEntries();
  renderTotals(entries);
  renderSummary(entries);
  renderDetail(entries);
  renderAnalysis(entries);
  renderChart(entries);
  renderTable(entries);
}

function getPlayersWithEntries() {
  const names = [];
  catchingState.entries.forEach((entry) => {
    const name = AppCommon.normalizeName(entry.player);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function syncControls() {
  const displayNames = getPlayersWithEntries();
  catchingState.selectedPlayer = displayNames.includes(catchingState.selectedPlayer) ? catchingState.selectedPlayer : (displayNames[0] || "");
  catchingQuickSelect.innerHTML = displayNames.map(optionHtml).join("");
  catchingPlayerFilter.innerHTML = displayNames.map(optionHtml).join("");
  catchingQuickSelect.value = catchingState.selectedPlayer;
  catchingPlayerFilter.value = catchingState.selectedPlayer;
  catchingDateFrom.value = catchingState.dateFrom;
  catchingDateTo.value = catchingState.dateTo;
  if (catchingForm) catchingForm.hidden = true;
}

function optionHtml(name) {
  return `<option value="${AppCommon.escapeHtml(name)}">${AppCommon.escapeHtml(name)}</option>`;
}

function inDateRange(date) {
  if (!date) return true;
  if (catchingState.dateFrom && date < catchingState.dateFrom) return false;
  if (catchingState.dateTo && date > catchingState.dateTo) return false;
  return true;
}

function getVisibleEntries() {
  return catchingState.entries
    .filter((entry) => AppCommon.normalizeName(entry.player) === catchingState.selectedPlayer)
    .filter((entry) => inDateRange(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderProfile() {
  const player = AppCommon.findRosterPlayer(catchingState.selectedPlayer);
  if (!player) {
    catchingPlayerProfile.innerHTML = `<div class="empty-box">表示できる守備データがありません。</div>`;
    return;
  }
  catchingPlayerProfile.innerHTML = `
    <img class="player-profile-image" src="${player.photoUrl}" alt="${AppCommon.escapeHtml(player.name)}">
    <div class="player-profile-copy">
      <p class="eyebrow">${AppCommon.escapeHtml(player.grade)}</p>
      <h3>${AppCommon.escapeHtml(player.name)}</h3>
      <p>守備成績と捕手指標を期間指定で確認できます。</p>
    </div>
  `;
}

function calcCatching(entry) {
  const caughtStealing = AppCommon.numberValue(entry.caughtStealing);
  const stolenBaseAllowed = AppCommon.numberValue(entry.stolenBaseAllowed);
  const passedBall = AppCommon.numberValue(entry.passedBall);
  return {
    caughtStealing,
    stolenBaseAllowed,
    passedBall,
    attempts: caughtStealing + stolenBaseAllowed,
    csRate: AppCommon.divide(caughtStealing, caughtStealing + stolenBaseAllowed)
  };
}

function aggregate(entries) {
  return entries.reduce((acc, entry) => {
    acc.games += 1;
    acc.caughtStealing += AppCommon.numberValue(entry.caughtStealing);
    acc.stolenBaseAllowed += AppCommon.numberValue(entry.stolenBaseAllowed);
    acc.passedBall += AppCommon.numberValue(entry.passedBall);
    return acc;
  }, { games: 0, caughtStealing: 0, stolenBaseAllowed: 0, passedBall: 0 });
}

function getPlayerErrors() {
  return AppCommon.storage.load("hokusho-batting-data-v5", [])
    .filter((entry) => AppCommon.normalizeName(entry.player) === catchingState.selectedPlayer)
    .filter((entry) => inDateRange(entry.date))
    .reduce((sum, entry) => sum + AppCommon.numberValue(entry.errors), 0);
}

function getTeamErrors() {
  return AppCommon.storage.load("hokusho-batting-data-v5", [])
    .filter((entry) => inDateRange(entry.date))
    .reduce((sum, entry) => sum + AppCommon.numberValue(entry.errors), 0);
}

function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(1)}%`;
}

function renderTotals(entries) {
  if (!catchingTotals) return;
  if (!entries.length) {
    catchingTotals.innerHTML = `<div class="empty-box">この期間の守備データはありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  catchingTotals.innerHTML = [
    AppCommon.createMetricCard("試合数", String(total.games), "表示期間の合計"),
    AppCommon.createMetricCard("盗塁アウト", String(total.caughtStealing), "表示期間の合計"),
    AppCommon.createMetricCard("盗塁セーフ", String(total.stolenBaseAllowed), "表示期間の合計"),
    AppCommon.createMetricCard("逸球", String(total.passedBall), "表示期間の合計"),
    AppCommon.createMetricCard("失策", String(getPlayerErrors()), "この選手の合計"),
    AppCommon.createMetricCard("チーム総失策", String(getTeamErrors()), "表示期間の合計")
  ].join("");
}

function renderSummary(entries) {
  if (!entries.length) {
    catchingSummary.innerHTML = `<div class="empty-box">この期間の守備データはありません。</div>`;
    return;
  }
  const metric = calcCatching(aggregate(entries));
  catchingSummary.innerHTML = [
    AppCommon.createMetricCard("盗塁阻止率", formatPercent(metric.csRate), "盗塁アウト / 企図数"),
    AppCommon.createMetricCard("盗塁アウト", String(metric.caughtStealing), "表示期間の合計"),
    AppCommon.createMetricCard("盗塁セーフ", String(metric.stolenBaseAllowed), "表示期間の合計"),
    AppCommon.createMetricCard("逸球", String(metric.passedBall), "表示期間の合計"),
    AppCommon.createMetricCard("失策", String(getPlayerErrors()), "この選手の合計"),
    AppCommon.createMetricCard("チーム総失策", String(getTeamErrors()), "表示期間の合計")
  ].join("");
}

function renderDetail(entries) {
  const selected = entries.find((entry) => entry.id === catchingState.selectedGameId) || entries[entries.length - 1];
  if (!selected) {
    catchingSelectedGameLabel.textContent = "試合を選ぶと、その試合の守備指標を表示します。";
    catchingGameDetail.innerHTML = `<div class="empty-box">この期間の守備データはありません。</div>`;
    return;
  }
  catchingState.selectedGameId = selected.id;
  const metric = calcCatching(selected);
  const errorEntry = AppCommon.storage.load("hokusho-batting-data-v5", []).find((entry) =>
    AppCommon.normalizeName(entry.player) === catchingState.selectedPlayer &&
    String(entry.date) === String(selected.date) &&
    AppCommon.textValue(entry.opponent) === AppCommon.textValue(selected.opponent)
  );
  catchingSelectedGameLabel.textContent = `${AppCommon.formatDate(selected.date)} ${selected.player} vs ${selected.opponent}`;
  catchingGameDetail.innerHTML = [
    AppCommon.createMetricCard("盗塁阻止率", formatPercent(metric.csRate)),
    AppCommon.createMetricCard("盗塁アウト", String(metric.caughtStealing)),
    AppCommon.createMetricCard("盗塁セーフ", String(metric.stolenBaseAllowed)),
    AppCommon.createMetricCard("逸球", String(metric.passedBall)),
    AppCommon.createMetricCard("失策", String(errorEntry ? AppCommon.numberValue(errorEntry.errors) : 0))
  ].join("");
}

function renderAnalysis(entries) {
  if (!entries.length) {
    catchingAnalysis.innerHTML = `<p>この期間の守備データがないため、分析コメントは表示できません。</p>`;
    return;
  }
  const total = aggregate(entries);
  const metric = calcCatching(total);
  const playerErrors = getPlayerErrors();
  const good = [];
  const bad = [];
  if (metric.csRate >= 0.35 && metric.attempts >= 8) good.push("盗塁阻止率は高く、送球の質で抑止できています。");
  if (total.passedBall <= 1) good.push("逸球が少なく、捕球面は安定しています。");
  if (!good.length) good.push("明確な強みはまだ数値に出ていません。");
  if (metric.csRate < 0.2 && metric.attempts >= 5) bad.push("盗塁阻止率が低く、クイックや送球改善が必要です。");
  if (total.passedBall >= 3) bad.push("逸球が多く、失点要因になっています。");
  if (playerErrors >= 3) bad.push("失策数が多く、守備全体の精度改善が必要です。");
  if (!bad.length) bad.push("大きな穴はありませんが、阻止率をもう一段上げたいです。");
  catchingAnalysis.innerHTML = `
    <p><strong>評価できる点:</strong> ${good.join(" ")}</p>
    <p><strong>改善が必要な点:</strong> ${bad.join(" ")}</p>
  `;
}

function renderChart(entries) {
  if (!entries.length) {
    catchingRateChart.innerHTML = `<div class="empty-box">比較できる守備データがありません。</div>`;
    return;
  }
  const metric = calcCatching(aggregate(entries));
  catchingRateChart.innerHTML = [
    chartRow("盗塁阻止率", metric.csRate, 1, true),
    chartRow("盗塁アウト", metric.caughtStealing, Math.max(metric.caughtStealing, 1), false),
    chartRow("盗塁セーフ", metric.stolenBaseAllowed, Math.max(metric.stolenBaseAllowed, 1), false),
    chartRow("逸球", metric.passedBall, Math.max(metric.passedBall, 1), false)
  ].join("");
}

function chartRow(label, value, max, isPercent) {
  const width = `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%`;
  const display = isPercent ? formatPercent(value) : String(value);
  return `<div class="chart-row"><div class="chart-label"><span>${label}</span><strong>${display}</strong></div><div class="chart-track"><div class="chart-fill" style="width:${width}"></div></div></div>`;
}

function renderTable(entries) {
  if (!entries.length) {
    catchingTableBody.innerHTML = `<tr><td colspan="10"><div class="empty-box">この期間の守備データはありません。</div></td></tr>`;
    return;
  }
  catchingTableBody.innerHTML = [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const metric = calcCatching(entry);
    const battingEntry = AppCommon.storage.load("hokusho-batting-data-v5", []).find((item) =>
      AppCommon.normalizeName(item.player) === AppCommon.normalizeName(entry.player) &&
      String(item.date) === String(entry.date) &&
      AppCommon.textValue(item.opponent) === AppCommon.textValue(entry.opponent)
    );
    const errors = battingEntry ? AppCommon.numberValue(battingEntry.errors) : 0;
    const activeClass = entry.id === catchingState.selectedGameId ? "table-row-active" : "";
    return `
      <tr class="${activeClass}">
        <td>${AppCommon.formatDate(entry.date)}</td>
        <td>${AppCommon.escapeHtml(entry.opponent)}</td>
        <td>${AppCommon.escapeHtml(entry.player)}</td>
        <td>${metric.caughtStealing}</td>
        <td>${metric.stolenBaseAllowed}</td>
        <td>${metric.passedBall}</td>
        <td>${errors}</td>
        <td>${formatPercent(metric.csRate)}</td>
        <td><button class="table-button" type="button" data-view-id="${entry.id}">詳細</button></td>
        <td><button class="table-button" type="button" data-delete-id="${entry.id}">削除</button></td>
      </tr>
    `;
  }).join("");
  catchingTableBody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      catchingState.selectedGameId = button.dataset.viewId;
      renderCatching();
      catchingGameDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  catchingTableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCatchingEntry(button.dataset.deleteId);
    });
  });
}

function deleteCatchingEntry(entryId) {
  const entry = catchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  if (!confirm(`${AppCommon.formatDate(entry.date)} ${entry.opponent} ${entry.player} の守備データを削除しますか。`)) return;
  catchingState.entries = catchingState.entries.filter((item) => item.id !== entryId);
  if (catchingState.selectedGameId === entryId) catchingState.selectedGameId = null;
  AppCommon.storage.save(catchingKey, catchingState.entries);
  renderCatching();
}
