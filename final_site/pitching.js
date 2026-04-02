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
  selectedPlayer: AppCommon.roster[0]?.name || "",
  dateFrom: "",
  dateTo: "",
  selectedGameId: null,
  editingId: null,
  graphOpen: false,
  trendMetric: pitchingTrendMetrics[0].key
};

const pitchingForm = document.querySelector("#pitchingForm");
const pitchingPlayerInput = document.querySelector("#pitchingPlayerInput");
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
const pitchingSubmitButton = document.querySelector("#pitchingSubmitButton");
const pitchingCancelEdit = document.querySelector("#pitchingCancelEdit");

pitchingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fd = new FormData(pitchingForm);
  const entry = {
    id: pitchingState.editingId || (crypto.randomUUID ? crypto.randomUUID() : `pitching-${Date.now()}`),
    date: fd.get("date"),
    opponent: AppCommon.textValue(fd.get("opponent")),
    competition: AppCommon.textValue(fd.get("competition")),
    player: AppCommon.normalizeName(fd.get("player")),
    games: AppCommon.numberValue(fd.get("games")),
    completeGames: AppCommon.numberValue(fd.get("completeGames")),
    shutouts: AppCommon.numberValue(fd.get("shutouts")),
    noWalkGames: AppCommon.numberValue(fd.get("noWalkGames")),
    wins: AppCommon.numberValue(fd.get("wins")),
    losses: AppCommon.numberValue(fd.get("losses")),
    battersFaced: AppCommon.numberValue(fd.get("battersFaced")),
    innings: AppCommon.textValue(fd.get("innings")),
    hitsAllowed: AppCommon.numberValue(fd.get("hitsAllowed")),
    hrAllowed: AppCommon.numberValue(fd.get("hrAllowed")),
    strikeouts: AppCommon.numberValue(fd.get("strikeouts")),
    walks: AppCommon.numberValue(fd.get("walks")),
    hitByPitch: AppCommon.numberValue(fd.get("hitByPitch")),
    intentionalDeadBall: AppCommon.numberValue(fd.get("intentionalDeadBall")),
    pickoffKills: AppCommon.numberValue(fd.get("pickoffKills")),
    sacrificeKills: AppCommon.numberValue(fd.get("sacrificeKills")),
    wildPitches: AppCommon.numberValue(fd.get("wildPitches")),
    balks: AppCommon.numberValue(fd.get("balks")),
    earnedRuns: AppCommon.numberValue(fd.get("earnedRuns")),
    irScored: AppCommon.numberValue(fd.get("irScored")),
    inheritedRunners: AppCommon.numberValue(fd.get("inheritedRunners")),
    reliefGames: AppCommon.numberValue(fd.get("reliefGames")),
    note: AppCommon.textValue(fd.get("note"))
  };
  pitchingState.entries = pitchingState.editingId
    ? pitchingState.entries.map((item) => item.id === pitchingState.editingId ? entry : item)
    : [...pitchingState.entries, entry];
  pitchingState.selectedPlayer = entry.player;
  pitchingState.selectedGameId = entry.id;
  AppCommon.storage.save(pitchingKey, pitchingState.entries);
  pitchingForm.reset();
  pitchingState.editingId = null;
  renderPitching();
});

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

pitchingCancelEdit.addEventListener("click", () => {
  pitchingForm.reset();
  pitchingState.editingId = null;
  renderPitching();
});

renderPitching();

window.addEventListener("hokusho:remote-applied", () => {
  pitchingState.entries = AppCommon.storage.load(pitchingKey, []);
  renderPitching();
});

function renderPitching() {
  syncControls();
  renderProfile();
  const entries = getVisibleEntries();
  renderSummary(entries);
  renderDetail(entries);
  renderAnalysis(entries);
  renderRateChart(entries);
  renderTrend(entries);
  renderTable(entries);
}

function getOrderedPlayerNames() {
  const ordered = [];
  [...AppCommon.roster.map((player) => player.name), ...pitchingState.entries.map((entry) => AppCommon.normalizeName(entry.player))].forEach((name) => {
    if (name && !ordered.includes(name)) ordered.push(name);
  });
  return ordered;
}

function getPlayersWithEntries() {
  const ordered = [];
  pitchingState.entries
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
  pitchingState.selectedPlayer = selectedPool.includes(pitchingState.selectedPlayer) ? pitchingState.selectedPlayer : (selectedPool[0] || "");
  pitchingPlayerInput.innerHTML = inputNames.map(optionHtml).join("");
  pitchingQuickSelect.innerHTML = selectedPool.map(optionHtml).join("");
  pitchingPlayerFilter.innerHTML = selectedPool.map(optionHtml).join("");
  pitchingPlayerInput.value = pitchingState.selectedPlayer;
  pitchingQuickSelect.value = pitchingState.selectedPlayer;
  pitchingPlayerFilter.value = pitchingState.selectedPlayer;
  pitchingDateFrom.value = pitchingState.dateFrom;
  pitchingDateTo.value = pitchingState.dateTo;
  pitchingTrendMetric.innerHTML = pitchingTrendMetrics.map((metric) => `<option value="${metric.key}">${metric.label}</option>`).join("");
  pitchingTrendMetric.value = pitchingState.trendMetric;
  pitchingGraphToggle.textContent = pitchingState.graphOpen ? "グラフを閉じる" : "グラフで表示";
  if (pitchingSubmitButton) pitchingSubmitButton.textContent = pitchingState.editingId ? "更新する" : "登録する";
  if (pitchingCancelEdit) pitchingCancelEdit.hidden = !pitchingState.editingId;
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
    pitchingPlayerProfile.innerHTML = `<div class="empty-box">選手を選ぶとプロフィールが表示されます。</div>`;
    return;
  }
  pitchingPlayerProfile.innerHTML = `
    <img class="player-profile-image" src="${player.photoUrl}" alt="${AppCommon.escapeHtml(player.name)}">
    <div class="player-profile-copy">
      <p class="eyebrow">${AppCommon.escapeHtml(player.grade)}</p>
      <h3>${AppCommon.escapeHtml(player.name)}</h3>
      <p>投手成績と登板ごとの推移をここで確認できます。</p>
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
  const total = {
    games: 0, completeGames: 0, shutouts: 0, noWalkGames: 0, wins: 0, losses: 0, battersFaced: 0,
    hitsAllowed: 0, hrAllowed: 0, strikeouts: 0, walks: 0, hitByPitch: 0, intentionalDeadBall: 0,
    pickoffKills: 0, sacrificeKills: 0, wildPitches: 0, balks: 0, earnedRuns: 0, irScored: 0,
    inheritedRunners: 0, reliefGames: 0, outs: 0
  };
  entries.forEach((entry) => {
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
  });
  return total;
}

function metric(value, digits = 3) {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

function metricCards(stats, earnedRuns) {
  return [
    AppCommon.createMetricCard("防御率", metric(stats.era), `自責点 ${earnedRuns}`),
    AppCommon.createMetricCard("WHIP", metric(stats.whip), "1イニングあたりの走者数"),
    AppCommon.createMetricCard("K/BB", metric(stats.kbb), "奪三振 / 与四球"),
    AppCommon.createMetricCard("K/9", metric(stats.k9), "9回あたりの奪三振"),
    AppCommon.createMetricCard("BB/9", metric(stats.bb9), "9回あたりの与四球"),
    AppCommon.createMetricCard("HR/9", metric(stats.hr9), "9回あたりの被本塁打"),
    AppCommon.createMetricCard("FIP", metric(stats.fip), "本塁打、与四球、死球、奪三振から計算")
  ].join("");
}

function renderSummary(entries) {
  if (!entries.length) {
    pitchingSummary.innerHTML = `<div class="empty-box">この期間の投手データはありません。</div>`;
    return;
  }
  const total = aggregate(entries);
  pitchingSummary.innerHTML = metricCards(calcPitching({
    innings: AppCommon.formatInnings(total.outs),
    battersFaced: total.battersFaced,
    hitsAllowed: total.hitsAllowed,
    hrAllowed: total.hrAllowed,
    strikeouts: total.strikeouts,
    walks: total.walks,
    hitByPitch: total.hitByPitch,
    intentionalDeadBall: total.intentionalDeadBall,
    earnedRuns: total.earnedRuns
  }), total.earnedRuns);
}

function renderDetail(entries) {
  const selected = entries.find((entry) => entry.id === pitchingState.selectedGameId) || entries[entries.length - 1];
  if (!selected) {
    pitchingSelectedGameLabel.textContent = "試合を選ぶと、その試合の投手指標を表示します。";
    pitchingGameDetail.innerHTML = `<div class="empty-box">この期間の投手データはありません。</div>`;
    return;
  }
  pitchingState.selectedGameId = selected.id;
  pitchingSelectedGameLabel.textContent = `${AppCommon.formatDate(selected.date)} ${selected.player} vs ${selected.opponent}`;
  pitchingGameDetail.innerHTML = metricCards(calcPitching(selected), selected.earnedRuns);
}

function renderAnalysis(entries) {
  if (!entries.length) {
    pitchingAnalysis.innerHTML = `<p>この期間の投手データがないため、分析は表示できません。</p>`;
    return;
  }
  const total = aggregate(entries);
  const overall = calcPitching({
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
  const strengths = [];
  const issues = [];
  const trends = [];
  const previousEntries = pitchingState.entries
    .filter((entry) => AppCommon.normalizeName(entry.player) === pitchingState.selectedPlayer)
    .filter((entry) => !inDateRange(entry.date));

  if (overall.kbb >= 3) strengths.push("K/BB が高く、投手の支配力は十分ある。");
  if (overall.k9 >= 8) strengths.push("K/9 が高く、空振りか見逃しでアウトを取れる。");
  if (overall.fip <= 3.2) strengths.push("FIP が低く、守備や運に左右されにくい内容を出している。");
  if (!strengths.length) strengths.push("数字上で明確な強みといえる項目はまだ少ない。");

  if (overall.whip >= 1.4) issues.push("WHIP が高く、走者を出し過ぎている。");
  if (overall.bb9 >= 4) issues.push("BB/9 が高く、四球で自分から苦しくしている。");
  if (overall.hr9 >= 0.8) issues.push("HR/9 が高く、長打を許す頻度が重い。");
  if (overall.era >= 4.5) issues.push("防御率が高く、結果として失点を止め切れていない。");
  if (!issues.length) issues.push("大きく崩れている数字は少ないが、決定的な強みをさらに伸ばしたい。");

  if (previousEntries.length >= 2) {
    const previous = aggregate(previousEntries);
    const prevMetrics = calcPitching({
      innings: AppCommon.formatInnings(previous.outs),
      battersFaced: previous.battersFaced,
      hitsAllowed: previous.hitsAllowed,
      hrAllowed: previous.hrAllowed,
      strikeouts: previous.strikeouts,
      walks: previous.walks,
      hitByPitch: previous.hitByPitch,
      intentionalDeadBall: previous.intentionalDeadBall,
      earnedRuns: previous.earnedRuns
    });
    if (overall.kbb - prevMetrics.kbb >= 0.5) trends.push("前の期間より K/BB が改善しており、球の強さよりも制球面の進歩が大きい。");
    if (overall.fip + 0.3 <= prevMetrics.fip) trends.push("FIP が下がっており、内容は上向いている。");
    if (overall.whip >= prevMetrics.whip + 0.15) trends.push("WHIP は悪化しており、最近は走者管理が落ちている。");
  } else {
    trends.push("比較用の過去データが少ないため、期間内の絶対値で評価している。");
  }

  pitchingAnalysis.innerHTML = `
    <p><strong>評価できる点:</strong> ${strengths.join(" ")}</p>
    <p><strong>改善が必要な点:</strong> ${issues.join(" ")}</p>
    <p><strong>最近の変化:</strong> ${trends.join(" ")}</p>
  `;
}

function renderRateChart(entries) {
  if (!entries.length) {
    pitchingRateChart.innerHTML = `<div class="empty-box">比較する投手データがありません。</div>`;
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

function renderTrend(entries) {
  pitchingTrendPanel.hidden = !pitchingState.graphOpen;
  if (!pitchingState.graphOpen) return;
  if (!entries.length) {
    pitchingTrendSummary.innerHTML = `<div class="empty-box">グラフにできる投手データがありません。</div>`;
    pitchingTrendChart.innerHTML = "";
    return;
  }
  const metricConfig = pitchingTrendMetrics.find((item) => item.key === pitchingState.trendMetric) || pitchingTrendMetrics[0];
  const points = entries.map((entry) => {
    const metric = calcPitching(entry);
    return {
      label: AppCommon.formatDate(entry.date),
      value: metric[metricConfig.key]
    };
  }).filter((point) => Number.isFinite(point.value));
  if (!points.length) {
    pitchingTrendSummary.innerHTML = `<div class="empty-box">この指標はグラフ化できません。</div>`;
    pitchingTrendChart.innerHTML = "";
    return;
  }
  const firstHalf = points.slice(0, Math.max(1, Math.floor(points.length / 2)));
  const secondHalf = points.slice(Math.floor(points.length / 2));
  const firstAvg = average(firstHalf.map((point) => point.value));
  const secondAvg = average(secondHalf.map((point) => point.value));
  const diff = secondAvg - firstAvg;
  const trend = judgeTrend(diff, metricConfig.higherIsBetter);
  pitchingTrendSummary.innerHTML = `
    <span class="trend-kicker ${trend.className}">${trend.label}</span>
    <p>前半平均 ${firstAvg.toFixed(3)} / 後半平均 ${secondAvg.toFixed(3)}</p>
    <p>${metricConfig.label} は ${trend.message}</p>
  `;
  pitchingTrendChart.innerHTML = createTrendSvg(points, metricConfig);
}

function renderTable(entries) {
  if (!entries.length) {
    pitchingTableBody.innerHTML = `<tr><td colspan="14"><div class="empty-box">この期間の投手データはありません。</div></td></tr>`;
    return;
  }
  pitchingTableBody.innerHTML = [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const metricSet = calcPitching(entry);
    const activeClass = entry.id === pitchingState.selectedGameId ? "table-row-active" : "";
    return `
      <tr class="${activeClass}">
        <td>${AppCommon.formatDate(entry.date)}</td>
        <td>${AppCommon.escapeHtml(entry.opponent)}</td>
        <td>${AppCommon.escapeHtml(entry.player)}</td>
        <td>${AppCommon.escapeHtml(metricSet.innings)}</td>
        <td>${metric(metricSet.era)}</td>
        <td>${metric(metricSet.whip)}</td>
        <td>${metric(metricSet.kbb)}</td>
        <td>${metric(metricSet.k9)}</td>
        <td>${metric(metricSet.bb9)}</td>
        <td>${metric(metricSet.hr9)}</td>
        <td>${metric(metricSet.fip)}</td>
        <td><button class="table-button" type="button" data-view-id="${entry.id}">詳細</button></td>
        <td><button class="table-button" type="button" data-edit-id="${entry.id}">編集</button></td>
        <td><button class="table-button" type="button" data-delete-id="${entry.id}">削除</button></td>
      </tr>
    `;
  }).join("");
  pitchingTableBody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      pitchingState.selectedGameId = button.dataset.viewId;
      renderPitching();
      document.querySelector("#pitchingGameDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  pitchingTableBody.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      startPitchingEdit(button.dataset.editId);
    });
  });
  pitchingTableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      deletePitchingEntry(button.dataset.deleteId);
    });
  });
}

function startPitchingEdit(entryId) {
  const entry = pitchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  pitchingState.editingId = entryId;
  setPitchingFormValues(entry);
  pitchingState.selectedPlayer = entry.player;
  pitchingState.selectedGameId = entry.id;
  renderPitching();
  pitchingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setPitchingFormValues(entry) {
  const fields = {
    date: entry.date,
    opponent: entry.opponent,
    competition: entry.competition,
    player: entry.player,
    games: entry.games,
    completeGames: entry.completeGames,
    shutouts: entry.shutouts,
    noWalkGames: entry.noWalkGames,
    wins: entry.wins,
    losses: entry.losses,
    battersFaced: entry.battersFaced,
    innings: entry.innings,
    hitsAllowed: entry.hitsAllowed,
    hrAllowed: entry.hrAllowed,
    strikeouts: entry.strikeouts,
    walks: entry.walks,
    hitByPitch: entry.hitByPitch,
    intentionalDeadBall: entry.intentionalDeadBall,
    pickoffKills: entry.pickoffKills,
    sacrificeKills: entry.sacrificeKills,
    wildPitches: entry.wildPitches,
    balks: entry.balks,
    earnedRuns: entry.earnedRuns,
    irScored: entry.irScored,
    inheritedRunners: entry.inheritedRunners,
    reliefGames: entry.reliefGames,
    note: entry.note
  };
  Object.entries(fields).forEach(([name, value]) => {
    const input = pitchingForm.querySelector(`[name="${name}"]`);
    if (input) input.value = value ?? "";
  });
}

function deletePitchingEntry(entryId) {
  const entry = pitchingState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const ok = confirm(`${AppCommon.formatDate(entry.date)} ${entry.opponent} ${entry.player} の投手データを削除しますか？`);
  if (!ok) return;
  pitchingState.entries = pitchingState.entries.filter((item) => item.id !== entryId);
  if (pitchingState.selectedGameId === entryId) pitchingState.selectedGameId = null;
  if (pitchingState.editingId === entryId) {
    pitchingState.editingId = null;
    pitchingForm.reset();
  }
  AppCommon.storage.save(pitchingKey, pitchingState.entries);
  renderPitching();
}

function chartRow(label, value, max, isPercent) {
  const width = `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%`;
  const display = isPercent ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
  return `<div class="chart-row"><div class="chart-label"><span>${label}</span><strong>${display}</strong></div><div class="chart-track"><div class="chart-fill" style="width:${width}"></div></div></div>`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function judgeTrend(diff, higherIsBetter) {
  const improved = higherIsBetter ? diff > 0.05 : diff < -0.05;
  const declined = higherIsBetter ? diff < -0.05 : diff > 0.05;
  if (improved) return { label: "上向き", className: "up", message: "前半より改善している。" };
  if (declined) return { label: "下向き", className: "down", message: "前半より悪化している。" };
  return { label: "横ばい", className: "flat", message: "前半と後半で大きな差はない。" };
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
