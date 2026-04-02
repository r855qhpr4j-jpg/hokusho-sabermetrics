const overviewBattingKey = "hokusho-batting-data-v5";
const overviewPitchingKey = "hokusho-pitching-data-v5";
const overviewCatchingKey = "hokusho-catching-data-v1";
const overviewSettingsKey = "hokusho-overview-settings-v1";

const savedSettings = AppCommon.storage.load(overviewSettingsKey, null);

const overviewState = {
  batting: AppCommon.storage.load(overviewBattingKey, []),
  pitching: AppCommon.storage.load(overviewPitchingKey, []),
  catching: AppCommon.storage.load(overviewCatchingKey, []),
  dateFrom: "",
  dateTo: "",
  grade: "all",
  selectedPitchers: new Set(savedSettings?.selectedPitchers || defaultSelectedPlayers(AppCommon.storage.load(overviewPitchingKey, []))),
  selectedCatchers: new Set(savedSettings?.selectedCatchers || defaultSelectedPlayers(AppCommon.storage.load(overviewCatchingKey, [])))
};

const overviewDateFrom = document.querySelector("#overviewDateFrom");
const overviewDateTo = document.querySelector("#overviewDateTo");
const overviewGradeFilter = document.querySelector("#overviewGradeFilter");
const overviewClearDates = document.querySelector("#overviewClearDates");
const overviewPitchingSelector = document.querySelector("#overviewPitchingSelector");
const overviewCatchingSelector = document.querySelector("#overviewCatchingSelector");
const overviewPitchingSelectAll = document.querySelector("#overviewPitchingSelectAll");
const overviewPitchingClearAll = document.querySelector("#overviewPitchingClearAll");
const overviewCatchingSelectAll = document.querySelector("#overviewCatchingSelectAll");
const overviewCatchingClearAll = document.querySelector("#overviewCatchingClearAll");
const overviewBattingBody = document.querySelector("#overviewBattingBody");
const overviewPitchingBody = document.querySelector("#overviewPitchingBody");
const overviewDefenseBody = document.querySelector("#overviewDefenseBody");
const overviewCatchingBody = document.querySelector("#overviewCatchingBody");
const resultsSummary = document.querySelector("#resultsSummary");

overviewDateFrom.addEventListener("change", (event) => {
  overviewState.dateFrom = event.target.value;
  renderOverview();
});

overviewDateTo.addEventListener("change", (event) => {
  overviewState.dateTo = event.target.value;
  renderOverview();
});

overviewGradeFilter.addEventListener("change", (event) => {
  overviewState.grade = event.target.value;
  renderOverview();
});

overviewClearDates.addEventListener("click", () => {
  overviewState.dateFrom = "";
  overviewState.dateTo = "";
  renderOverview();
});

overviewPitchingSelectAll.addEventListener("click", () => {
  overviewState.selectedPitchers = new Set(rosterPlayers().map((player) => player.name));
  saveSettings();
  renderOverview();
});

overviewPitchingClearAll.addEventListener("click", () => {
  overviewState.selectedPitchers = new Set();
  saveSettings();
  renderOverview();
});

overviewCatchingSelectAll.addEventListener("click", () => {
  overviewState.selectedCatchers = new Set(rosterPlayers().map((player) => player.name));
  saveSettings();
  renderOverview();
});

overviewCatchingClearAll.addEventListener("click", () => {
  overviewState.selectedCatchers = new Set();
  saveSettings();
  renderOverview();
});

renderOverview();

window.addEventListener("hokusho:remote-applied", () => {
  overviewState.batting = AppCommon.storage.load(overviewBattingKey, []);
  overviewState.pitching = AppCommon.storage.load(overviewPitchingKey, []);
  overviewState.catching = AppCommon.storage.load(overviewCatchingKey, []);
  renderOverview();
});

function renderOverview() {
  overviewDateFrom.value = overviewState.dateFrom;
  overviewDateTo.value = overviewState.dateTo;
  overviewGradeFilter.value = overviewState.grade;
  renderSelectors();
  renderBattingOverview();
  renderPitchingOverview();
  renderDefenseOverview();
  renderCatchingOverview();
  renderResultsSummary();
}

function rosterPlayers() {
  return AppCommon.roster.filter((player) => overviewState.grade === "all" || player.grade === overviewState.grade);
}

function inRange(date) {
  if (!date) return true;
  if (overviewState.dateFrom && date < overviewState.dateFrom) return false;
  if (overviewState.dateTo && date > overviewState.dateTo) return false;
  return true;
}

function defaultSelectedPlayers(entries) {
  return [...new Set(entries.map((entry) => AppCommon.normalizeName(entry.player)).filter(Boolean))];
}

function saveSettings() {
  AppCommon.storage.save(overviewSettingsKey, {
    selectedPitchers: [...overviewState.selectedPitchers],
    selectedCatchers: [...overviewState.selectedCatchers]
  });
}

function renderSelectors() {
  const players = rosterPlayers();
  overviewPitchingSelector.innerHTML = players.map((player) => selectorItem(player, overviewState.selectedPitchers, "pitching")).join("");
  const catchingPlayers = players.filter((player) =>
    overviewState.catching.some((entry) => AppCommon.normalizeName(entry.player) === player.name)
  );
  overviewCatchingSelector.innerHTML = catchingPlayers.map((player) => selectorItem(player, overviewState.selectedCatchers, "catching")).join("");

  overviewPitchingSelector.querySelectorAll("[data-player-name]").forEach((input) => {
    input.addEventListener("change", () => togglePlayerSelection("pitching", input.dataset.playerName, input.checked));
  });
  overviewCatchingSelector.querySelectorAll("[data-player-name]").forEach((input) => {
    input.addEventListener("change", () => togglePlayerSelection("catching", input.dataset.playerName, input.checked));
  });
}

function selectorItem(player, selectedSet, prefix) {
  const checked = selectedSet.has(player.name) ? "checked" : "";
  return `
    <label class="selector-item">
      <input type="checkbox" data-player-name="${AppCommon.escapeHtml(player.name)}" data-selector="${prefix}" ${checked}>
      <span>${AppCommon.escapeHtml(player.grade)} ${AppCommon.escapeHtml(player.name)}</span>
    </label>
  `;
}

function togglePlayerSelection(type, name, checked) {
  const targetSet = type === "pitching" ? overviewState.selectedPitchers : overviewState.selectedCatchers;
  if (checked) targetSet.add(name);
  else targetSet.delete(name);
  saveSettings();
  renderOverview();
}

function number(value) {
  return AppCommon.numberValue(value);
}

function safeMetric(value, digits = 3) {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

function safePercent(value) {
  return value == null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(1)}%`;
}

function battingMetrics(entries) {
  const total = {
    pa: 0, ab: 0, single: 0, double: 0, triple: 0, homeRun: 0, so: 0, bb: 0, hbp: 0, sf: 0, sb: 0, cs: 0,
    pickedOff: 0, gdp: 0, errors: 0
  };
  entries.forEach((entry) => {
    total.pa += number(entry.pa);
    total.ab += number(entry.ab);
    total.single += number(entry.single);
    total.double += number(entry.double);
    total.triple += number(entry.triple);
    total.homeRun += number(entry.homeRun);
    total.so += number(entry.so);
    total.bb += number(entry.bb);
    total.hbp += number(entry.hbp);
    total.sf += number(entry.sf);
    total.sb += number(entry.sb);
    total.cs += number(entry.cs);
    total.pickedOff += number(entry.pickedOff);
    total.gdp += number(entry.gdp);
    total.errors += number(entry.errors);
  });
  const hits = total.single + total.double + total.triple + total.homeRun;
  const tb = total.single + (2 * total.double) + (3 * total.triple) + (4 * total.homeRun);
  const avg = AppCommon.divide(hits, total.ab);
  const obp = AppCommon.divide(hits + total.bb + total.hbp, total.ab + total.bb + total.hbp + total.sf);
  const slg = AppCommon.divide(tb, total.ab);
  const woba = AppCommon.divide((0.69 * total.bb) + (0.72 * total.hbp) + (0.89 * total.single) + (1.27 * total.double) + (1.62 * total.triple) + (2.1 * total.homeRun), total.ab + total.bb + total.hbp + total.sf);
  const rcBase = AppCommon.divide((hits + total.bb + total.hbp) * tb, total.ab + total.bb + total.hbp);
  const outsMade = Math.max(0, total.ab - hits);
  return {
    games: entries.length,
    pa: total.pa,
    avg,
    sbRate: AppCommon.divide(total.sb, total.sb + total.cs),
    obp,
    kRate: AppCommon.divide(total.so, total.pa),
    slg,
    woba,
    noi: ((obp + slg) / 3) * 1000,
    ops: obp + slg,
    rc27: outsMade ? (rcBase * 27) / outsMade : 0,
    isoP: slg - avg,
    isoD: obp - avg,
    abPerHr: total.homeRun ? total.ab / total.homeRun : null,
    bbPerK: total.so ? total.bb / total.so : null,
    secA: AppCommon.divide((tb - hits) + total.bb + total.sb - total.cs - total.pickedOff, total.ab),
    ta: AppCommon.divide(hits + tb + total.bb + total.hbp + total.sb, Math.max(1, (total.ab - hits) + total.cs + total.gdp)),
    ps: null,
    paPerK: total.so ? total.pa / total.so : null,
    errors: total.errors
  };
}

function pitchingMetrics(entries) {
  const total = {
    games: 0, battersFaced: 0, hitsAllowed: 0, hrAllowed: 0, strikeouts: 0, walks: 0, hitByPitch: 0, intentionalDeadBall: 0, earnedRuns: 0, outs: 0
  };
  entries.forEach((entry) => {
    total.games += number(entry.games);
    total.battersFaced += number(entry.battersFaced);
    total.hitsAllowed += number(entry.hitsAllowed);
    total.hrAllowed += number(entry.hrAllowed);
    total.strikeouts += number(entry.strikeouts);
    total.walks += number(entry.walks);
    total.hitByPitch += number(entry.hitByPitch);
    total.intentionalDeadBall += number(entry.intentionalDeadBall);
    total.earnedRuns += number(entry.earnedRuns);
    total.outs += AppCommon.inningsToOuts(entry.innings);
  });
  const ip = total.outs / 3;
  return {
    games: entries.length,
    innings: AppCommon.formatInnings(total.outs),
    era: AppCommon.divide(total.earnedRuns * 9, ip),
    whip: AppCommon.divide(total.hitsAllowed + total.walks + total.hitByPitch, ip),
    kbb: AppCommon.divide(total.strikeouts, total.walks),
    k9: AppCommon.divide(total.strikeouts * 9, ip),
    bb9: AppCommon.divide(total.walks * 9, ip),
    fip: AppCommon.divide((13 * total.hrAllowed) + (3 * (total.walks + total.hitByPitch + total.intentionalDeadBall)) - (2 * total.strikeouts), ip)
  };
}

function catchingMetrics(entries, battingEntries = []) {
  const total = { caughtStealing: 0, stolenBaseAllowed: 0, passedBall: 0, errors: 0 };
  entries.forEach((entry) => {
    total.caughtStealing += number(entry.caughtStealing);
    total.stolenBaseAllowed += number(entry.stolenBaseAllowed);
    total.passedBall += number(entry.passedBall);
  });
  battingEntries.forEach((entry) => {
    total.errors += number(entry.errors);
  });
  return {
    games: entries.length,
    errors: total.errors,
    caughtStealing: total.caughtStealing,
    stolenBaseAllowed: total.stolenBaseAllowed,
    passedBall: total.passedBall,
    csRate: AppCommon.divide(total.caughtStealing, total.caughtStealing + total.stolenBaseAllowed)
  };
}

function renderBattingOverview() {
  const players = rosterPlayers();
  overviewBattingBody.innerHTML = players.map((player) => {
    const entries = overviewState.batting
      .filter((entry) => AppCommon.normalizeName(entry.player) === player.name)
      .filter((entry) => inRange(entry.date));
    const metrics = battingMetrics(entries);
    return `
      <tr>
        <td>${AppCommon.escapeHtml(player.grade)}</td>
        <td>${AppCommon.escapeHtml(player.name)}</td>
        <td>${metrics.games}</td>
        <td>${metrics.pa}</td>
        <td>${safeMetric(metrics.avg)}</td>
        <td>${safePercent(metrics.sbRate)}</td>
        <td>${safeMetric(metrics.obp)}</td>
        <td>${safePercent(metrics.kRate)}</td>
        <td>${safeMetric(metrics.slg)}</td>
        <td>${safeMetric(metrics.woba)}</td>
        <td>${safeMetric(metrics.noi, 0)}</td>
        <td>${safeMetric(metrics.ops)}</td>
        <td>${safeMetric(metrics.rc27, 2)}</td>
        <td>${safeMetric(metrics.isoP)}</td>
        <td>${safeMetric(metrics.isoD)}</td>
        <td>${safeMetric(metrics.abPerHr, 2)}</td>
        <td>${safeMetric(metrics.bbPerK, 2)}</td>
        <td>${safeMetric(metrics.secA)}</td>
        <td>${safeMetric(metrics.ta, 2)}</td>
        <td>-</td>
        <td>${safeMetric(metrics.paPerK, 2)}</td>
        <td>${metrics.errors}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="22"><div class="empty-box">表示できる選手がいません。</div></td></tr>`;
}

function renderPitchingOverview() {
  const players = rosterPlayers().filter((player) => overviewState.selectedPitchers.has(player.name));
  overviewPitchingBody.innerHTML = players.map((player) => {
    const entries = overviewState.pitching
      .filter((entry) => AppCommon.normalizeName(entry.player) === player.name)
      .filter((entry) => inRange(entry.date));
    const metrics = pitchingMetrics(entries);
    return `
      <tr>
        <td>${AppCommon.escapeHtml(player.grade)}</td>
        <td>${AppCommon.escapeHtml(player.name)}</td>
        <td>${metrics.games}</td>
        <td>${AppCommon.escapeHtml(metrics.innings)}</td>
        <td>${safeMetric(metrics.era)}</td>
        <td>${safeMetric(metrics.whip)}</td>
        <td>${safeMetric(metrics.kbb)}</td>
        <td>${safeMetric(metrics.k9)}</td>
        <td>${safeMetric(metrics.bb9)}</td>
        <td>${safeMetric(metrics.fip)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="10"><div class="empty-box">表示する投手が選ばれていません。</div></td></tr>`;
}

function renderCatchingOverview() {
  const players = rosterPlayers()
    .filter((player) => overviewState.selectedCatchers.has(player.name))
    .filter((player) => overviewState.catching.some((entry) => AppCommon.normalizeName(entry.player) === player.name));
  overviewCatchingBody.innerHTML = players.map((player) => {
    const entries = overviewState.catching
      .filter((entry) => AppCommon.normalizeName(entry.player) === player.name)
      .filter((entry) => inRange(entry.date));
    const metrics = catchingMetrics(entries);
    return `
      <tr>
        <td>${AppCommon.escapeHtml(player.grade)}</td>
        <td>${AppCommon.escapeHtml(player.name)}</td>
        <td>${metrics.games}</td>
        <td>${metrics.caughtStealing}</td>
        <td>${metrics.stolenBaseAllowed}</td>
        <td>${metrics.passedBall}</td>
        <td>${safePercent(metrics.csRate)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="7"><div class="empty-box">表示する捕手がいません。</div></td></tr>`;
}

function renderDefenseOverview() {
  const players = rosterPlayers();
  overviewDefenseBody.innerHTML = players.map((player) => {
    const battingEntries = overviewState.batting
      .filter((entry) => AppCommon.normalizeName(entry.player) === player.name)
      .filter((entry) => inRange(entry.date));
    const games = battingEntries.length;
    const errors = battingEntries.reduce((sum, entry) => sum + number(entry.errors), 0);
    return `
      <tr>
        <td>${AppCommon.escapeHtml(player.grade)}</td>
        <td>${AppCommon.escapeHtml(player.name)}</td>
        <td>${games}</td>
        <td>${errors}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="4"><div class="empty-box">表示できる守備データがありません。</div></td></tr>`;
}

function renderResultsSummary() {
  if (!resultsSummary) return;
  const results = AppCommon.storage.load("hokusho-game-results-v1", []);
  const wins = results.filter((item) => Number(item.hokushoScore) > Number(item.opponentScore)).length;
  const losses = results.filter((item) => Number(item.hokushoScore) < Number(item.opponentScore)).length;
  const draws = results.filter((item) => Number(item.hokushoScore) === Number(item.opponentScore)).length;
  const decisions = wins + losses;
  const winPct = decisions ? wins / decisions : 0;
  const teamErrors = overviewState.batting.reduce((sum, entry) => sum + number(entry.errors), 0);
  resultsSummary.innerHTML = [
    AppCommon.createMetricCard("勝利数", String(wins), "試合結果一覧ベース"),
    AppCommon.createMetricCard("敗戦数", String(losses), "試合結果一覧ベース"),
    AppCommon.createMetricCard("引分数", String(draws), "試合結果一覧ベース"),
    AppCommon.createMetricCard("勝率", decisions ? `${winPct.toFixed(3)}` : "-", "引分を除く"),
    AppCommon.createMetricCard("チーム総失策", String(teamErrors), "打撃成績の失策入力を集計")
  ].join("");
}
