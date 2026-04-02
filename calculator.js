const battingCalcForm = document.querySelector("#battingCalcForm");
const pitchingCalcForm = document.querySelector("#pitchingCalcForm");
const battingCalcResult = document.querySelector("#battingCalcResult");
const pitchingCalcResult = document.querySelector("#pitchingCalcResult");

battingCalcForm.addEventListener("input", renderBattingCalc);
pitchingCalcForm.addEventListener("input", renderPitchingCalc);

renderBattingCalc();
renderPitchingCalc();

function renderBattingCalc() {
  const fd = new FormData(battingCalcForm);
  const pa = AppCommon.numberValue(fd.get("pa"));
  const single = AppCommon.numberValue(fd.get("single"));
  const doubleHit = AppCommon.numberValue(fd.get("double"));
  const triple = AppCommon.numberValue(fd.get("triple"));
  const homeRun = AppCommon.numberValue(fd.get("homeRun"));
  const bb = AppCommon.numberValue(fd.get("bb"));
  const hbp = AppCommon.numberValue(fd.get("hbp"));
  const sh = AppCommon.numberValue(fd.get("sh"));
  const sf = AppCommon.numberValue(fd.get("sf"));
  const hits = single + doubleHit + triple + homeRun;
  const ab = pa - (bb + hbp + sh + sf);
  const tb = single + (2 * doubleHit) + (3 * triple) + (4 * homeRun);
  const avg = AppCommon.divide(hits, ab);
  const obp = AppCommon.divide(hits + bb + hbp, ab + bb + hbp + sf);
  const slg = AppCommon.divide(tb, ab);
  const ops = obp + slg;
  const woba = AppCommon.divide((0.55 * bb) + (0.58 * hbp) + (0.7 * single) + (1.04 * doubleHit) + (1.39 * triple) + (1.68 * homeRun), ab + bb + sf + hbp) * 1.25;
  battingCalcResult.innerHTML = [
    AppCommon.createMetricCard("安打", String(hits), "ヒットの合計"),
    AppCommon.createMetricCard("打数", String(ab), "打席から四死球などを引いた数"),
    AppCommon.createMetricCard("打率", AppCommon.formatDecimal(avg), "ヒットを打てた割合"),
    AppCommon.createMetricCard("出塁率", AppCommon.formatDecimal(obp), "塁に出た割合"),
    AppCommon.createMetricCard("長打率", AppCommon.formatDecimal(slg), "長打の強さ"),
    AppCommon.createMetricCard("OPS", AppCommon.formatDecimal(ops), "出塁率 + 長打率"),
    AppCommon.createMetricCard("wOBA", AppCommon.formatDecimal(woba), "得点への貢献")
  ].join("");
}

function renderPitchingCalc() {
  const fd = new FormData(pitchingCalcForm);
  const outs = AppCommon.inningsToOuts(fd.get("innings"));
  const ip = outs / 3;
  const hitsAllowed = AppCommon.numberValue(fd.get("hitsAllowed"));
  const hrAllowed = AppCommon.numberValue(fd.get("hrAllowed"));
  const strikeouts = AppCommon.numberValue(fd.get("strikeouts"));
  const walks = AppCommon.numberValue(fd.get("walks"));
  const hitByPitch = AppCommon.numberValue(fd.get("hitByPitch"));
  const earnedRuns = AppCommon.numberValue(fd.get("earnedRuns"));
  const era = AppCommon.divide(earnedRuns * 9, ip);
  const whip = AppCommon.divide(hitsAllowed + walks + hitByPitch, ip);
  const kbb = AppCommon.divide(strikeouts, walks);
  const k9 = AppCommon.divide(strikeouts * 9, ip);
  const bb9 = AppCommon.divide(walks * 9, ip);
  const fip = AppCommon.divide((13 * hrAllowed) + (3 * (walks + hitByPitch)) - (2 * strikeouts), ip);
  pitchingCalcResult.innerHTML = [
    AppCommon.createMetricCard("投球回数", AppCommon.formatInnings(outs), "入力した投球回"),
    AppCommon.createMetricCard("防御率", AppCommon.formatDecimal(era), "自責点ベース"),
    AppCommon.createMetricCard("WHIP", AppCommon.formatDecimal(whip), "1回あたりの走者数"),
    AppCommon.createMetricCard("K/BB", AppCommon.formatDecimal(kbb), "三振と四球のバランス"),
    AppCommon.createMetricCard("K/9", AppCommon.formatDecimal(k9), "9回あたりの奪三振"),
    AppCommon.createMetricCard("BB/9", AppCommon.formatDecimal(bb9), "9回あたりの与四球"),
    AppCommon.createMetricCard("FIP", AppCommon.formatDecimal(fip), "守備の影響を減らした数字")
  ].join("");
}
