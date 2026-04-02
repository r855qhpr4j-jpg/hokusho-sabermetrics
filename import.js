const battingImportKey = "hokusho-batting-data-v5";
const pitchingImportKey = "hokusho-pitching-data-v5";
const catchingImportKey = "hokusho-catching-data-v1";
const resultsImportKey = "hokusho-game-results-v1";

const SHEET_GAME_INFO = "試合情報";
const SHEET_BATTING = "打撃成績入力用";
const SHEET_PITCHING = "投手成績入力用";
const SHEET_CATCHING = "捕手成績入力用";

const importMode = document.querySelector("#importMode");
const workbookImportFile = document.querySelector("#workbookImportFile");
const workbookImportButton = document.querySelector("#workbookImportButton");
const workbookImportStatus = document.querySelector("#workbookImportStatus");
const resultsTableBody = document.querySelector("#resultsTableBody");
const resultsSummary = document.querySelector("#resultsSummary");
const resultEditorPanel = document.querySelector("#resultEditorPanel");
const resultEditorForm = document.querySelector("#resultEditorForm");
const resultEditorId = document.querySelector("#resultEditorId");
const resultEditorDate = document.querySelector("#resultEditorDate");
const resultEditorCompetition = document.querySelector("#resultEditorCompetition");
const resultEditorOpponent = document.querySelector("#resultEditorOpponent");
const resultEditorHokushoScore = document.querySelector("#resultEditorHokushoScore");
const resultEditorOpponentScore = document.querySelector("#resultEditorOpponentScore");
const resultEditorCancel = document.querySelector("#resultEditorCancel");

if (workbookImportButton) {
  workbookImportButton.addEventListener("click", importWorkbookFile);
}

if (resultEditorForm) {
  resultEditorForm.addEventListener("submit", saveEditedResult);
}

if (resultEditorCancel) {
  resultEditorCancel.addEventListener("click", closeResultEditor);
}

renderResultsTable();

window.addEventListener("hokusho:remote-applied", () => {
  renderResultsTable();
});

async function importWorkbookFile() {
  const file = workbookImportFile?.files?.[0];
  if (!file) {
    setStatus("Excelファイルを選んでください。", "error");
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = await parseXlsxWorkbook(buffer);
    const gameInfo = readGameInfoSheet(workbook.sheets[SHEET_GAME_INFO] || []);
    const battingEntries = mapBattingSheet(workbook.sheets[SHEET_BATTING] || [], gameInfo);
    const pitchingEntries = mapPitchingSheet(workbook.sheets[SHEET_PITCHING] || [], gameInfo);
    const catchingEntries = mapCatchingSheet(workbook.sheets[SHEET_CATCHING] || [], gameInfo);
    const resultEntry = createResultEntry(gameInfo);

    if (!battingEntries.length && !pitchingEntries.length && !catchingEntries.length) {
      throw new Error("打撃・投手・捕手のどのシートにも取り込める成績がありませんでした。");
    }

    const replaceMode = importMode?.value === "replace";
    const currentBatting = replaceMode ? [] : AppCommon.storage.load(battingImportKey, []);
    const currentPitching = replaceMode ? [] : AppCommon.storage.load(pitchingImportKey, []);
    const currentCatching = replaceMode ? [] : AppCommon.storage.load(catchingImportKey, []);
    const currentResults = replaceMode ? [] : AppCommon.storage.load(resultsImportKey, []);

    AppCommon.storage.save(battingImportKey, mergeUniqueEntries(currentBatting, battingEntries, battingEntryKey));
    AppCommon.storage.save(pitchingImportKey, mergeUniqueEntries(currentPitching, pitchingEntries, pitchingEntryKey));
    AppCommon.storage.save(catchingImportKey, mergeUniqueEntries(currentCatching, catchingEntries, catchingEntryKey));
    AppCommon.storage.save(resultsImportKey, resultEntry ? mergeUniqueEntries(currentResults, [resultEntry], resultEntryKey) : currentResults);

    renderResultsTable();
    setStatus(
      `取込完了: 打撃 ${battingEntries.length}件 / 投手 ${pitchingEntries.length}件 / 捕手 ${catchingEntries.length}件${resultEntry ? " / 試合結果 1件" : ""}`,
      "success"
    );
    workbookImportFile.value = "";
  } catch (error) {
    setStatus(error.message || "ファイルの取込に失敗しました。", "error");
  }
}

async function parseXlsxWorkbook(buffer) {
  const entries = await unzipEntries(buffer);
  const sharedStrings = parseSharedStrings(entries);
  const workbookXml = getXml(entries, "xl/workbook.xml");
  const relsXml = getXml(entries, "xl/_rels/workbook.xml.rels");
  const workbookDoc = new DOMParser().parseFromString(workbookXml, "application/xml");
  const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
  const relMap = {};

  relsDoc.querySelectorAll("Relationship").forEach((node) => {
    relMap[node.getAttribute("Id")] = node.getAttribute("Target");
  });

  const sheets = {};
  workbookDoc.querySelectorAll("sheet").forEach((sheet) => {
    const name = sheet.getAttribute("name");
    const relId = sheet.getAttribute("r:id");
    const target = relMap[relId];
    if (!name || !target) return;
    const path = normalizeEntryPath(`xl/${target}`);
    const xml = getXml(entries, path);
    sheets[name] = parseWorksheet(xml, sharedStrings);
  });

  return { sheets };
}

function parseSharedStrings(entries) {
  if (!entries.has("xl/sharedStrings.xml")) return [];
  const xml = getXml(entries, "xl/sharedStrings.xml");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.querySelectorAll("sst si")].map((node) =>
    [...node.querySelectorAll("t")].map((item) => item.textContent || "").join("")
  );
}

function readGameInfoSheet(rows) {
  const info = {
    date: "",
    opponent: "",
    competition: "",
    hokushoScore: "",
    opponentScore: ""
  };

  rows.slice(1).forEach((row) => {
    const key = text(row[0]);
    const rawValue = row[1];
    const value = text(rawValue);
    if (key === "日付") info.date = normalizeImportedDate(rawValue);
    if (key === "相手") info.opponent = value;
    if (key === "大会名・区分") info.competition = value;
    if (key === "北照得点") info.hokushoScore = value;
    if (key === "相手校得点") info.opponentScore = value;
  });

  return info;
}

function createResultEntry(gameInfo) {
  if (!gameInfo.date || !gameInfo.opponent || gameInfo.hokushoScore === "" || gameInfo.opponentScore === "") {
    return null;
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `result-${Date.now()}-${Math.random()}`,
    date: gameInfo.date,
    opponent: gameInfo.opponent,
    competition: gameInfo.competition,
    hokushoScore: num(gameInfo.hokushoScore),
    opponentScore: num(gameInfo.opponentScore)
  };
}

function mapBattingSheet(rows, gameInfo) {
  if (!rows.length) return [];
  const headers = rows[0].map(text);

  return rows.slice(1)
    .map((row) => toRowObject(headers, row))
    .filter((row) => row["選手名"] && hasData(row, [
      "打席", "打数", "安打（単打）", "得点", "二塁打", "三塁打", "本塁打", "打点",
      "三振", "四球", "死球", "犠打", "犠打失敗", "犠飛", "盗塁", "盗塁失敗", "牽制死", "併殺打", "失策"
    ]))
    .map((row) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `batting-import-${Date.now()}-${Math.random()}`,
      date: gameInfo.date,
      opponent: gameInfo.opponent,
      competition: gameInfo.competition,
      player: AppCommon.normalizeName(row["選手名"]),
      pa: num(row["打席"]),
      ab: num(row["打数"]),
      single: num(row["安打（単打）"]),
      runs: num(row["得点"]),
      double: num(row["二塁打"]),
      triple: num(row["三塁打"]),
      homeRun: num(row["本塁打"]),
      rbi: num(row["打点"]),
      so: num(row["三振"]),
      bb: num(row["四球"]),
      hbp: num(row["死球"]),
      sh: num(row["犠打"]),
      shFail: num(row["犠打失敗"]),
      sf: num(row["犠飛"]),
      sb: num(row["盗塁"]),
      cs: num(row["盗塁失敗"]),
      pickedOff: num(row["牽制死"]),
      gdp: num(row["併殺打"]),
      errors: num(row["失策"]),
      note: text(row["メモ"])
    }));
}

function mapPitchingSheet(rows, gameInfo) {
  if (!rows.length) return [];
  const headers = rows[0].map(text);

  return rows.slice(1)
    .map((row) => toRowObject(headers, row))
    .filter((row) => row["選手名"] && hasData(row, [
      "登板", "完投", "完封", "無四球", "勝数", "敗数", "打者", "投球回", "被安打", "被本塁打",
      "奪三振", "与四球", "与死球", "故意死球", "牽制刺殺", "犠打封殺・刺殺", "暴投", "ボーク", "自責点", "IR生還数", "IR", "リリーフ登板"
    ]))
    .map((row) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `pitching-import-${Date.now()}-${Math.random()}`,
      date: gameInfo.date,
      opponent: gameInfo.opponent,
      competition: gameInfo.competition,
      player: AppCommon.normalizeName(row["選手名"]),
      games: num(row["登板"]),
      completeGames: num(row["完投"]),
      shutouts: num(row["完封"]),
      noWalkGames: num(row["無四球"]),
      wins: num(row["勝数"]),
      losses: num(row["敗数"]),
      battersFaced: num(row["打者"]),
      innings: text(row["投球回"]),
      hitsAllowed: num(row["被安打"]),
      hrAllowed: num(row["被本塁打"]),
      strikeouts: num(row["奪三振"]),
      walks: num(row["与四球"]),
      hitByPitch: num(row["与死球"]),
      intentionalDeadBall: num(row["故意死球"]),
      pickoffKills: num(row["牽制刺殺"]),
      sacrificeKills: num(row["犠打封殺・刺殺"]),
      wildPitches: num(row["暴投"]),
      balks: num(row["ボーク"]),
      earnedRuns: num(row["自責点"]),
      irScored: num(row["IR生還数"]),
      inheritedRunners: num(row["IR"]),
      reliefGames: num(row["リリーフ登板"]),
      note: text(row["メモ"])
    }));
}

function mapCatchingSheet(rows, gameInfo) {
  if (!rows.length) return [];
  const headers = rows[0].map(text);

  return rows.slice(1)
    .map((row) => toRowObject(headers, row))
    .filter((row) => row["選手名"] && hasData(row, ["盗塁アウト", "盗塁セーフ", "逸球"]))
    .map((row) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `catching-import-${Date.now()}-${Math.random()}`,
      date: gameInfo.date,
      opponent: gameInfo.opponent,
      competition: gameInfo.competition,
      player: AppCommon.normalizeName(row["選手名"]),
      caughtStealing: num(row["盗塁アウト"]),
      stolenBaseAllowed: num(row["盗塁セーフ"]),
      passedBall: num(row["逸球"]),
      note: text(row["メモ"])
    }));
}

function hasData(row, keys) {
  return keys.some((key) => text(row[key]) !== "");
}

function toRowObject(headers, row) {
  const result = {};
  headers.forEach((header, index) => {
    result[header] = row[index] ?? "";
  });
  return result;
}

function text(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeUniqueEntries(currentEntries, importedEntries, keyFn) {
  const map = new Map();
  currentEntries.forEach((entry) => {
    map.set(keyFn(entry), entry);
  });
  importedEntries.forEach((entry) => {
    map.set(keyFn(entry), entry);
  });
  return [...map.values()];
}

function battingEntryKey(entry) {
  return [
    String(entry.date || ""),
    AppCommon.normalizeName(entry.player),
    String(entry.opponent || ""),
    String(entry.competition || "")
  ].join("|");
}

function pitchingEntryKey(entry) {
  return [
    String(entry.date || ""),
    AppCommon.normalizeName(entry.player),
    String(entry.opponent || ""),
    String(entry.competition || "")
  ].join("|");
}

function catchingEntryKey(entry) {
  return [
    String(entry.date || ""),
    AppCommon.normalizeName(entry.player),
    String(entry.opponent || ""),
    String(entry.competition || "")
  ].join("|");
}

function resultEntryKey(entry) {
  return [
    String(entry.date || ""),
    String(entry.opponent || ""),
    String(entry.competition || "")
  ].join("|");
}

function normalizeImportedDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const date = excelSerialToIsoDate(serial);
    if (date) return date;
  }

  return raw;
}

function excelSerialToIsoDate(serial) {
  const wholeDays = Math.floor(serial);
  if (!Number.isFinite(wholeDays)) return "";
  const utcDays = wholeDays - 25569;
  const utcMs = utcDays * 86400 * 1000;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setStatus(message, type) {
  if (!workbookImportStatus) return;
  workbookImportStatus.textContent = message;
  workbookImportStatus.className = `import-status ${type}`;
}

function renderResultsTable() {
  if (!resultsTableBody) return;
  const results = AppCommon.storage.load(resultsImportKey, []);
  renderResultsSummary(results);
  if (!results.length) {
    resultsTableBody.innerHTML = `<tr><td colspan="7"><div class="empty-box">まだ試合結果は取り込まれていません。</div></td></tr>`;
    return;
  }

  resultsTableBody.innerHTML = [...results]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((result) => `<tr>
      <td>${AppCommon.formatDate(result.date)}</td>
      <td>${AppCommon.escapeHtml(result.competition || "-")}</td>
      <td>${AppCommon.escapeHtml(result.opponent)}</td>
      <td>${result.hokushoScore}</td>
      <td>${result.opponentScore}</td>
      <td>${resultLabel(result.hokushoScore, result.opponentScore)}</td>
      <td>
        <div class="button-row">
          <button class="table-button" type="button" data-edit-result-id="${result.id}">編集</button>
          <button class="table-button" type="button" data-delete-result-id="${result.id}">削除</button>
        </div>
      </td>
    </tr>`)
    .join("");

  resultsTableBody.querySelectorAll("[data-edit-result-id]").forEach((button) => {
    button.addEventListener("click", () => editResultEntry(button.dataset.editResultId));
  });

  resultsTableBody.querySelectorAll("[data-delete-result-id]").forEach((button) => {
    button.addEventListener("click", () => deleteResultEntry(button.dataset.deleteResultId));
  });
}

function renderResultsSummary(results) {
  if (!resultsSummary) return;
  const wins = results.filter((item) => Number(item.hokushoScore) > Number(item.opponentScore)).length;
  const losses = results.filter((item) => Number(item.hokushoScore) < Number(item.opponentScore)).length;
  const draws = results.filter((item) => Number(item.hokushoScore) === Number(item.opponentScore)).length;
  const decisions = wins + losses;
  const winPct = decisions ? wins / decisions : 0;
  const teamErrors = AppCommon.storage.load(battingImportKey, []).reduce((sum, entry) => sum + num(entry.errors), 0);
  resultsSummary.innerHTML = [
    AppCommon.createMetricCard("勝利数", String(wins), "試合結果一覧ベース"),
    AppCommon.createMetricCard("敗戦数", String(losses), "試合結果一覧ベース"),
    AppCommon.createMetricCard("引分数", String(draws), "試合結果一覧ベース"),
    AppCommon.createMetricCard("勝率", decisions ? winPct.toFixed(3) : "-", "引分を除く"),
    AppCommon.createMetricCard("チーム総失策", String(teamErrors), "打撃成績の失策入力を集計")
  ].join("");
}

function resultLabel(hokushoScore, opponentScore) {
  if (hokushoScore > opponentScore) return '<span class="tag-good">勝ち</span>';
  if (hokushoScore < opponentScore) return '<span class="tag-low">負け</span>';
  return '<span class="tag-mid">引き分け</span>';
}

function editResultEntry(resultId) {
  const results = AppCommon.storage.load(resultsImportKey, []);
  const target = results.find((item) => item.id === resultId);
  if (!target) {
    setStatus("編集する試合結果が見つかりませんでした。", "error");
    return;
  }
  if (!resultEditorPanel) return;
  resultEditorId.value = target.id;
  resultEditorDate.value = normalizeImportedDate(target.date);
  resultEditorCompetition.value = text(target.competition);
  resultEditorOpponent.value = text(target.opponent);
  resultEditorHokushoScore.value = String(target.hokushoScore ?? 0);
  resultEditorOpponentScore.value = String(target.opponentScore ?? 0);
  resultEditorPanel.hidden = false;
  resultEditorPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function deleteResultEntry(resultId) {
  const results = AppCommon.storage.load(resultsImportKey, []);
  const target = results.find((item) => item.id === resultId);
  if (!target) {
    setStatus("削除する試合結果が見つかりませんでした。", "error");
    return;
  }

  const ok = confirm(`${AppCommon.formatDate(target.date)} ${target.opponent} の試合結果を削除しますか？`);
  if (!ok) return;

  const updated = results.filter((item) => item.id !== resultId);
  AppCommon.storage.save(resultsImportKey, updated);
  deleteLinkedGameEntries(target);
  renderResultsTable();
  if (resultEditorId?.value === resultId) closeResultEditor();
  setStatus("試合結果を削除しました。", "success");
}

function saveEditedResult(event) {
  event.preventDefault();
  const resultId = resultEditorId?.value || "";
  if (!resultId) {
    setStatus("編集対象の試合結果が見つかりません。", "error");
    return;
  }

  const normalizedDate = normalizeImportedDate(resultEditorDate?.value || "");
  const competition = text(resultEditorCompetition?.value || "");
  const opponent = text(resultEditorOpponent?.value || "");
  const hokushoScore = num(resultEditorHokushoScore?.value || "");
  const opponentScore = num(resultEditorOpponentScore?.value || "");

  if (!normalizedDate || !opponent) {
    setStatus("日付と相手は必須です。", "error");
    return;
  }

  const results = AppCommon.storage.load(resultsImportKey, []);
  const original = results.find((item) => item.id === resultId);
  if (!original) {
    setStatus("編集対象の試合結果が見つかりません。", "error");
    return;
  }
  const updated = results.map((item) => {
    if (item.id !== resultId) return item;
    return {
      ...item,
      date: normalizedDate,
      competition,
      opponent,
      hokushoScore,
      opponentScore
    };
  });

  AppCommon.storage.save(resultsImportKey, updated);
  syncLinkedGameEntries(original, {
    ...original,
    date: normalizedDate,
    competition,
    opponent,
    hokushoScore,
    opponentScore
  });
  renderResultsTable();
  closeResultEditor();
  setStatus("試合結果を更新しました。", "success");
}

function closeResultEditor() {
  if (!resultEditorPanel || !resultEditorForm) return;
  resultEditorForm.reset();
  resultEditorId.value = "";
  resultEditorPanel.hidden = true;
}

function syncLinkedGameEntries(originalGame, updatedGame) {
  syncGameEntriesByKey(battingImportKey, originalGame, updatedGame);
  syncGameEntriesByKey(pitchingImportKey, originalGame, updatedGame);
  syncGameEntriesByKey(catchingImportKey, originalGame, updatedGame);
}

function syncGameEntriesByKey(storageKey, originalGame, updatedGame) {
  const entries = AppCommon.storage.load(storageKey, []);
  const updatedEntries = entries.map((entry) => {
    if (!isSameGame(entry, originalGame)) return entry;
    return {
      ...entry,
      date: updatedGame.date,
      opponent: updatedGame.opponent,
      competition: updatedGame.competition
    };
  });
  AppCommon.storage.save(storageKey, updatedEntries);
}

function deleteLinkedGameEntries(gameInfo) {
  deleteGameEntriesByKey(battingImportKey, gameInfo);
  deleteGameEntriesByKey(pitchingImportKey, gameInfo);
  deleteGameEntriesByKey(catchingImportKey, gameInfo);
}

function deleteGameEntriesByKey(storageKey, gameInfo) {
  const entries = AppCommon.storage.load(storageKey, []);
  const filtered = entries.filter((entry) => !isSameGame(entry, gameInfo));
  AppCommon.storage.save(storageKey, filtered);
}

function isSameGame(entry, gameInfo) {
  const entryDate = String(entry.date || "");
  const gameAliases = buildGameDateAliases(gameInfo.date);
  const entryAliases = buildGameDateAliases(entryDate);
  const dateMatched = [...entryAliases].some((value) => gameAliases.has(value));
  const entryCompetition = text(entry.competition);
  const gameCompetition = text(gameInfo.competition);
  const competitionMatched = !entryCompetition || !gameCompetition || entryCompetition === gameCompetition;
  return dateMatched
    && text(entry.opponent) === text(gameInfo.opponent)
    && competitionMatched;
}

function buildGameDateAliases(value) {
  const aliases = new Set();
  const raw = String(value || "").trim();
  if (!raw) return aliases;

  aliases.add(raw);

  const normalized = normalizeImportedDate(raw);
  if (normalized) {
    aliases.add(normalized);
    aliases.add(normalized.replaceAll("-", "/"));
    aliases.add(normalized.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1-$2-$3"));
    const serial = isoDateToExcelSerial(normalized);
    if (serial) {
      aliases.add(String(serial));
      aliases.add(`${serial}.0`);
    }
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const serialDate = excelSerialToIsoDate(serial);
    if (serialDate) {
      aliases.add(serialDate);
      aliases.add(serialDate.replaceAll("-", "/"));
      aliases.add(String(Math.floor(serial)));
      aliases.add(`${Math.floor(serial)}.0`);
    }
  }

  return aliases;
}

function isoDateToExcelSerial(isoDate) {
  const match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const [, year, month, day] = match;
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Math.round(utcMs / 86400000) + 25569;
}

function getXml(entries, path) {
  const normalized = normalizeEntryPath(path);
  const entry = entries.get(normalized);
  if (!entry) throw new Error(`必要なファイルが見つかりません: ${normalized}`);
  return new TextDecoder("utf-8").decode(entry);
}

function normalizeEntryPath(path) {
  return String(path || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

async function unzipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) throw new Error("Excelファイルの形式を読み取れませんでした。");

  const totalEntries = readUInt16(bytes, eocdOffset + 10);
  const centralDirOffset = readUInt32(bytes, eocdOffset + 16);
  let offset = centralDirOffset;
  const entries = new Map();

  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(bytes, offset) !== 0x02014b50) {
      throw new Error("Excelファイルの内部構造を読み取れませんでした。");
    }

    const compression = readUInt16(bytes, offset + 10);
    const compressedSize = readUInt32(bytes, offset + 20);
    const fileNameLength = readUInt16(bytes, offset + 28);
    const extraLength = readUInt16(bytes, offset + 30);
    const commentLength = readUInt16(bytes, offset + 32);
    const localHeaderOffset = readUInt32(bytes, offset + 42);
    const fileNameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLength);
    const fileName = decodeZipText(fileNameBytes);

    const localNameLength = readUInt16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUInt16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

    if (!fileName.endsWith("/")) {
      entries.set(normalizeEntryPath(fileName), await inflateZipEntry(compressedData, compression));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes) {
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65558); offset -= 1) {
    if (readUInt32(bytes, offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readUInt16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function decodeZipText(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

async function inflateZipEntry(data, compression) {
  if (compression === 0) return data;
  if (compression !== 8) throw new Error(`未対応の圧縮形式です: ${compression}`);
  if (typeof DecompressionStream === "undefined") {
    throw new Error("このブラウザでは Excel 取込に必要な機能が使えません。");
  }

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const response = new Response(stream);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function parseWorksheet(xmlText, sharedStrings) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const rows = [];
  doc.querySelectorAll("sheetData > row").forEach((rowNode) => {
    const cells = [];
    rowNode.querySelectorAll("c").forEach((cellNode) => {
      const ref = cellNode.getAttribute("r") || "";
      const columnName = ref.replace(/[0-9]/g, "");
      const columnIndex = columnLettersToIndex(columnName);
      const value = readCellValue(cellNode, sharedStrings);
      while (cells.length < columnIndex) cells.push("");
      cells[columnIndex] = value;
    });
    rows.push(cells);
  });
  return rows;
}

function readCellValue(cellNode, sharedStrings) {
  const type = cellNode.getAttribute("t");
  if (type === "inlineStr") {
    return cellNode.querySelector("is > t")?.textContent ?? "";
  }
  if (type === "s") {
    const index = Number(cellNode.querySelector("v")?.textContent ?? -1);
    return Number.isInteger(index) && index >= 0 ? (sharedStrings[index] ?? "") : "";
  }
  return cellNode.querySelector("v")?.textContent ?? "";
}

function columnLettersToIndex(letters) {
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = (index * 26) + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}
