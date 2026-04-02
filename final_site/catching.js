const catchingKey = "hokusho-catching-data-v1";
const catchingState = {
  entries: AppCommon.storage.load(catchingKey, []),
  selectedPlayer: AppCommon.roster[0]?.name || "",
  dateFrom: "",
  dateTo: "",
  selectedGameId: null,
  editingId: null
};

const catchingForm = document.querySelector("#catchingForm");
const catchingPlayerInput = document.querySelector("#catchingPlayerInput");
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
const catchingSubmitButton = document.querySelector("#catchingSubmitButton");
const catchingCancelEdit = document.querySelector("#catchingCancelEdit");

catchingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fd = new FormData(catchingForm);
  const entry = {
    id: catchingState.editingId || (crypto.randomUUID ? crypto.randomUUID() : `catching-${Date.now()}`),
    date: fd.get("date"),
    opponent: AppCommon.textValue(fd.get("opponent")),
    competition: AppCommon.textValue(fd.get("competition")),
    player: AppCommon.normalizeName(fd.get("player")),
    caughtStealing: AppCommon.numberValue(fd.get("caughtStealing")),
    stolenBaseAllowed: AppCommon.numberValue(fd.get("stolenBaseAllowed")),
    passedBall: AppCommon.numberValue(fd.get("passedBall")),
    note: AppCommon.textValue(fd.get("note"))
  };
  catchingState.entries = catchingState.editingId
    ? catchingState.entries.map((item) => item.id === catchingState.editingId ? entry : item)
    : [...catchingState.entries, entry];
  catchingState.selectedPlayer = entry.player;
  catchingState.selectedGameId = entry.id;
  AppCommon.storage.save(catchingKey, catchingState.entries);
  catchingForm.reset();
  catchingState.editingId = null;
  renderCatching();
});

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

catchingCancelEdit.addEventListener("click", () => {
  catchingForm.reset();
  catchingState.editingId = null;
  renderCatching();
});

renderCatching();

window.addEventListener("hokusho:remote-applied", () => {
  catchingState.entries = AppCommon.storage.load(catchingKey, []);
  renderCatching();
});

function renderCatching() {
  syncControls();
  renderProfile();
  const entries = getVisibleEntries();
  renderSummary(entries);
  renderDetail(entries);
  renderAnalysis(entries);
  renderChart(entries);
  renderTable(entries);
}

function getOrderedPlayerNames() {
  const ordered = [];
  [...AppCommon.roster.map((player) => player.name), ...catchingState.entries.map((entry) => AppCommon.normalizeName(entry.player))].forEach((name) => {
    if (name && !ordered.includes(name)) ordered.push(name);
  });
  return ordered;
}

function getPlayersWithEntries() {
  const ordered = [];
  catchingState.entries
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
  catchingState.selectedPlayer = selectedPool.includes(catchingState.selectedPlayer) ? catchingState.selectedPlayer : (selectedPool[0] || "");
  catchingPlayerInput.innerHTML = inputNames.map(optionHtml).join("");
  catchingQuickSelect.innerHTML = selectedPool.map(optionHtml).join("");
  catchingPlayerFilter.innerHTML = selectedPool.map(optionHtml).join("");
  catchingPlayerInput.value = catchingState.selectedPlayer;
  catchingQuickSelect.value = catchingState.selectedPlayer;
  catchingPlayerFilter.value = catchingState.selectedPlayer;
  catchingDateFrom.value = catchingState.dateFrom;
  catchingDateTo.value = catchingState.dateTo;
  if (catchingSubmitButton) catchingSubmitButton.textContent = catchingState.editingId ? "更新する" : "登録する";
  if (catchingCancelEdit) catchingCancelEdit.hidden = !catchingState.editingId;
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
    catchingPlayerProfile.innerHTML = `<div class="empty-box">選手を選ぶとプロフィールが表示されます。</div>`;
    return;
  }
  catchingPlayerProfile.innerHTML = `
    <img class="player-profile-image" src="${player.photoUrl}" alt="${AppCommon.escapeHtml(player.name)}">
    <div class="player-profile-copy">
      <p class="eyebrow">${AppCommon.escapeHtml(player.grade)}</p>
      <h3>${AppCommon.escapeHtml(player.name)}</h3>
      <p>捕手成績と試合ごとの変化をここで確認できます。</p>
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

function getPlayerErrorEntries() {
  return AppCommon.storage.load("hokusho-batting-data-v5", [])
    .filter((entry) => AppCommon.normalizeName(entry.player) === catchingState.selectedPlayer)
    .filter((entry) => inDateRange(entry.date));
}

function getPlayerErrors() {
  return getPlayerErrorEntries().reduce((sum, entry) => sum + AppCommon.numberValue(entry.errors), 0);
}

function getTeamErrors() {
  return AppCommon.storage.load("hokusho-batting-data-v5", [])
    .filter((entry) => inDateRange(entry.date))
    .reduce((sum, entry) => sum + AppCommon.numberValue(entry.errors), 0);
}

function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(1)}%`;
}

function metricCards(metric) {
  return [
    AppCommon.createMetricCard("盗塁阻止率", formatPercent(metric.csRate), "盗塁アウト / 盗塁企図"),
    AppCommon.createMetricCard("盗塁アウト", String(metric.caughtStealing), "刺した数"),
    AppCommon.createMetricCard("盗塁セーフ", String(metric.stolenBaseAllowed), "許した数"),
    AppCommon.createMetricCard("逸球", String(metric.passedBall), "後ろにそらした数"),
    AppCommon.createMetricCard("失策", String(getPlayerErrors()), "この選手の守備エラー"),
    AppCommon.createMetricCard("チーム総失策", String(getTeamErrors()), "表示期間内の合計")
  ].join("");
}

function renderSummary(entries) {
  if (!entries.length) {
    catchingSummary.innerHTML = `<div class="empty-box">この期間の捕手データはありません。</div>`;
    return;
  }
  catchingSummary.innerHTML = metricCards(calcCatching(aggregate(entries)));
}

function renderDetail(entries) {
  const selected = entries.find((entry) => entry.id === catchingState.selectedGameId) || entries[entries.length - 1];
  if (!selected) {
    catchingSelectedGameLabel.textContent = "試合を選ぶと、その試合の捕手指標を表示します。";
    catchingGameDetail.innerHTML = `<div class="empty-box">この期間の捕手データはありません。</div>`;
    return;
  }
  catchingState.selectedGameId = selected.id;
  catchingSelectedGameLabel.textContent = `${AppCommon.formatDate(selected.date)} ${selected.player} vs ${selected.opponent}`;
  catchingGameDetail.innerHTML = metricCards(calcCatching(selected));
}

function renderAnalysis(entries) {
  if (!entries.length) {
    catchingAnalysis.innerHTML = `<p>この期間の捕手データがないため、分析は表示できません。</p>`;
    return;
  }
  const total = aggregate(entries);
  const overall = calcCatching(total);
  const playerErrors = getPlayerErrors();
  const strengths = [];
  const issues = [];

  if (overall.csRate >= 0.35 && overall.attempts >= 8) strengths.push("盗塁阻止率は高く、相手の走塁を止められている。");
  if (total.passedBall <= 1) strengths.push("逸球が少なく、捕球の安定感はある。");
  if (!strengths.length) strengths.push("数字上では明確な強みがまだ見えにくい。");

  if (overall.csRate < 0.2 && overall.attempts >= 5) issues.push("盗塁阻止率が低く、送球かクイック対応の見直しが必要。");
  if (total.passedBall >= 3) issues.push("逸球が多く、捕球の確実性が課題。");
  if (playerErrors >= 3) issues.push("失策数が多く、送球や捕球の基本精度を上げる必要がある。");
  if (total.stolenBaseAllowed > total.caughtStealing + 3) issues.push("走者を止めるより許す場面が多く、失点に直結しやすい。");
  if (!issues.length) issues.push("大きな欠点は見えにくいが、阻止率をもう一段上げたい。");

  catchingAnalysis.innerHTML = `
    <p><strong>評価できる点:</strong> ${strengths.join(" ")}</p>
    <p><strong>改善が必要な点:</strong> ${issues.join(" ")}</p>
  `;
}

function renderChart(entries) {
  if (!entries.length) {
    catchingRateChart.innerHTML = `<div class="empty-box">比較する捕手データがありません。</div>`;
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

function renderTable(entries) {
  if (!entries.length) {
    catchingTableBody.innerHTML = `<tr><td colspan="11"><div class="empty-box">この期間の守備データはありません。</div></td></tr>`;
    return;
  }
  catchingTableBody.innerHTML = [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const metric = calcCatching(entry);
    const battingEntry = getPlayerErrorEntries().find((item) => String(item.date) === String(entry.date) && AppCommon.textValue(item.opponent) === AppCommon.textValue(entry.opponent));
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
        <td><button class="table-button" type="button" data-edit-id="${entry.id}">編集</button></td>
        <td><button class="table-button" type="button" data-delete-id="${entry.id}">削除</button></td>
      </tr>
    `;
  }).join("");
  catchingTableBody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      catchingState.selectedGameId = button.dataset.viewId;
      renderCatching();
      document.querySelector("#catchingGameDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  catchingTableBody.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      startCatchingEdit(button.dataset.editId);
    });
  });
  catchingTableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCatchingEntry(button.dataset.deleteId);
    });
  });
}

function startCatchingEdit(entryId) {
  const entry = catchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  catchingState.editingId = entryId;
  setCatchingFormValues(entry);
  catchingState.selectedPlayer = entry.player;
  catchingState.selectedGameId = entry.id;
  renderCatching();
  catchingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setCatchingFormValues(entry) {
  const fields = {
    date: entry.date,
    opponent: entry.opponent,
    competition: entry.competition,
    player: entry.player,
    caughtStealing: entry.caughtStealing,
    stolenBaseAllowed: entry.stolenBaseAllowed,
    passedBall: entry.passedBall,
    note: entry.note
  };
  Object.entries(fields).forEach(([name, value]) => {
    const input = catchingForm.querySelector(`[name="${name}"]`);
    if (input) input.value = value ?? "";
  });
}

function deleteCatchingEntry(entryId) {
  const entry = catchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const ok = confirm(`${AppCommon.formatDate(entry.date)} ${entry.opponent} ${entry.player} の捕手データを削除しますか？`);
  if (!ok) return;
  catchingState.entries = catchingState.entries.filter((item) => item.id !== entryId);
  if (catchingState.selectedGameId === entryId) catchingState.selectedGameId = null;
  if (catchingState.editingId === entryId) {
    catchingState.editingId = null;
    catchingForm.reset();
  }
  AppCommon.storage.save(catchingKey, catchingState.entries);
  renderCatching();
}

function chartRow(label, value, max, isPercent) {
  const width = `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%`;
  const display = isPercent ? formatPercent(value) : String(value);
  return `<div class="chart-row"><div class="chart-label"><span>${label}</span><strong>${display}</strong></div><div class="chart-track"><div class="chart-fill" style="width:${width}"></div></div></div>`;
}
