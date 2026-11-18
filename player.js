"use strict";
const $ = id => document.getElementById(id);
const audio = $("audio"), lesson = $("lesson"), scene = $("scene"), mode = $("mode"), status = $("status");
let data, index = 0, sourceVersion = 0, statusKey = "", titleKey = "loading";
const translations = {
  en: {
    intro: "English conversation audio · 100 lessons",
    playerLabel: "Audio player", audioLabel: "Conversation audio",
    lessonLabel: "Choose a lesson", rangeLabel: "Play range", sceneLabel: "Scene",
    sceneMode: "This scene", lessonMode: "Whole lesson", allMode: "Continue through lessons",
    play: "Play", pause: "Pause", restart: "Restart", previous: "Previous lesson", next: "Next lesson",
    download: "Download this lesson’s MP3",
    recordings: "The recordings contain dialogue only. Explanations, vocabulary notes and speaker names are not read aloud. Continuous play loads one lesson at a time; you do not need to download all 100 lessons first.",
    helpTitle: "Downloads and help", bundles: "All 100 lessons · ZIP bundles of 25",
    playHelp: "Press Play to start. If your device stops continuous playback, press Play again. To save an MP3, open its link and use your browser’s download option.",
    sceneHelp: "“This scene” plays only the selected scene and stops at its end. For lessons with two scenes, choose either scene. A lesson with one scene uses the same recording as “Whole lesson”.",
    synthetic: "Synthetic voices", availability: "Natural and additional practice recordings are not included in this collection.",
    credits: "Audio credits", loading: "Loading audio…", ready: "Press Play to start.",
    blocked: "Press Play to continue. Your device has stopped automatic playback.",
    audioError: "Could not load the audio. Press Play to try again.",
    playing: "Playing", continuous: "Continuous play", paused: "Paused",
    sceneEnded: "This scene has finished.", ended: "Playback has finished.",
    loadFailed: "Could not load the lesson list.", loadHelp: "Reload this page. You can also download recordings from the GitHub link below.",
    singleScene: " (one-scene lesson)", continuousHelp: "Continue from this lesson", wholeHelp: "Play the whole lesson from the beginning"
  },
  ja: {
    intro: "100課の英会話音源",
    playerLabel: "音声プレーヤー", audioLabel: "会話音声",
    lessonLabel: "課を選ぶ", rangeLabel: "再生範囲", sceneLabel: "場面",
    sceneMode: "この場面", lessonMode: "この課全体", allMode: "全課連続",
    play: "再生", pause: "一時停止", restart: "最初から", previous: "前の課", next: "次の課",
    download: "この課のMP3を保存",
    recordings: "会話だけを収録しています。解説・語注・話者名は読み上げません。連続再生では課ごとに読み込みます。全100課を最初からダウンロードする必要はありません。",
    helpTitle: "ダウンロードと使い方", bundles: "全100課・25課ずつのZIP",
    playHelp: "再生を開始するにはボタンを押してください。端末が連続再生を止めた場合は、もう一度「再生」を押してください。保存する場合はMP3リンクを開き、ブラウザーのダウンロード機能を使えます。",
    sceneHelp: "「この場面」は選んだ場面だけを再生し、最後で止まります。1課に2場面ある場合は前半・後半を選べます。1場面だけの課では「この課全体」と同じ音声です。",
    synthetic: "合成音声", availability: "Naturalと追加練習の音源は、この公開版には含まれていません。",
    credits: "音源の制作情報", loading: "音源を読み込んでいます…", ready: "再生ボタンを押してください。",
    blocked: "再生ボタンを押してください。端末が自動再生を停止しました。",
    audioError: "音源を読み込めませんでした。「再生」を押してもう一度お試しください。",
    playing: "再生中", continuous: "連続再生中", paused: "一時停止中",
    sceneEnded: "この場面の再生が終わりました。", ended: "再生が終わりました。",
    loadFailed: "音源一覧を読み込めませんでした。", loadHelp: "ページを再読み込みしてください。下のGitHubリンクからもダウンロードできます。",
    singleScene: "（この課は1場面です）", continuousHelp: "この課から順に連続再生", wholeHelp: "この課の会話を最初から再生"
  }
};
const languageKey = "everyday-conversations-ui-language";
function isLanguage(value) { return value === "en" || value === "ja"; }
function initialLanguage() {
  const requested = new URLSearchParams(location.search).get("lang");
  if (isLanguage(requested)) return requested;
  try {
    const saved = localStorage.getItem(languageKey);
    if (isLanguage(saved)) return saved;
  } catch (_) { /* Playback also works when browser storage is unavailable. */ }
  return (navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : "en";
}
let language = initialLanguage();
function t(key) { return translations[language][key]; }
function setStatus(key) { statusKey = key; status.textContent = key ? t(key) : ""; }
function updateUrl() {
  const params = new URLSearchParams(location.search);
  params.set("lang", language);
  if (data) {
    params.set("lesson", currentLesson().lesson_id);
    params.set("scene", selectedScene().spread_id);
    params.set("mode", mode.value);
  }
  history.replaceState(null, "", `?${params}`);
}
function updateHelp() {
  if (!data) return;
  const l = currentLesson(), s = selectedScene();
  $("segment-help").textContent = mode.value === "scene"
    ? `${t("sceneLabel")} ${s.part} / ${l.segments.length} · ${s.subtitle} · ${durationLabel(s.duration_seconds)}${l.segments.length === 1 ? t("singleScene") : ""}`
    : `${t(mode.value === "all" ? "continuousHelp" : "wholeHelp")} · ${durationLabel(l.duration_seconds)}`;
}
function setLanguage(value) {
  if (!isLanguage(value)) return;
  language = value;
  document.documentElement.lang = language;
  $("language").value = language;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel)); });
  $("play").textContent = t(audio.paused ? "play" : "pause");
  if (!data) $("title").textContent = t(titleKey);
  setStatus(statusKey);
  updateHelp();
  updateUrl();
  try { localStorage.setItem(languageKey, language); } catch (_) { /* Optional preference only. */ }
}
$("language").onchange = () => setLanguage($("language").value);
setLanguage(language);

function currentLesson() { return data.lessons[index]; }
function selectedScene() { return currentLesson().segments[Number(scene.value) || 0]; }
function durationLabel(seconds) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function resetButton() { $("play").textContent = t("play"); }
function updateSelection() {
  const l = currentLesson(), s = selectedScene(), isScene = mode.value === "scene";
  const selected = isScene ? s : l;
  $("scene-control").hidden = !isScene;
  updateHelp();
  updateUrl();
  $("download").href = l.download_url;
  sourceVersion++;
  audio.pause();
  // Same-origin audio/mpeg files support byte ranges without download redirects.
  // Scene files contain only that scene, so native controls cannot cross its end.
  audio.src = selected.stream_url;
  audio.load();
  resetButton();
  setStatus("ready");
}
function loadLesson(i, sceneId = null) {
  index = Math.max(0, Math.min(data.lessons.length - 1, i));
  const l = currentLesson();
  lesson.value = String(index);
  scene.replaceChildren(...l.segments.map((s, j) => new Option(`${s.part}. ${s.subtitle}`, String(j))));
  scene.value = String(Math.max(0, l.segments.findIndex(s => s.spread_id === sceneId)));
  $("title").textContent = `${l.lesson_id} · ${l.title}`;
  $("prev").disabled = index === 0;
  $("next").disabled = index === data.lessons.length - 1;
  updateSelection();
}
function play() {
  if (!data) return;
  const version = sourceVersion;
  if (audio.error) audio.load();
  if (audio.ended) audio.currentTime = 0;
  // Keep play() synchronous within the user tap or ended handler on mobile.
  const promise = audio.play();
  if (promise) promise.catch(error => {
    if (version !== sourceVersion || error.name === "AbortError") return;
    resetButton();
    setStatus(error.name === "NotAllowedError" ? "blocked" : "audioError");
  });
}
audio.addEventListener("play", () => {
  $("play").textContent = t("pause");
  setStatus(mode.value === "all" ? "continuous" : "playing");
});
audio.addEventListener("playing", () => {
  setStatus(mode.value === "all" ? "continuous" : "playing");
});
audio.addEventListener("pause", () => {
  resetButton();
  if (!audio.ended && audio.currentTime > 0) setStatus("paused");
});
audio.addEventListener("waiting", () => {
  if (!audio.paused) setStatus("loading");
});
audio.addEventListener("ended", () => {
  resetButton();
  if (mode.value === "all" && index < data.lessons.length - 1) {
    loadLesson(index + 1);
    play();
  } else {
    setStatus(mode.value === "scene" ? "sceneEnded" : "ended");
  }
});
audio.addEventListener("error", () => {
  resetButton();
  setStatus("audioError");
});
$("play").onclick = () => audio.paused ? play() : audio.pause();
$("restart").onclick = () => {
  audio.pause();
  audio.currentTime = 0;
  play();
};
lesson.onchange = () => loadLesson(Number(lesson.value));
scene.onchange = updateSelection;
mode.onchange = updateSelection;
$("prev").onclick = () => loadLesson(index - 1);
$("next").onclick = () => loadLesson(index + 1);

fetch("player_data.json", {cache: "no-cache"}).then(response => {
  if (!response.ok) throw Error(response.status);
  return response.json();
}).then(d => {
  if (d.schema_version !== 2 || !d.lessons.length || d.lessons.some(l => !l.stream_url || !l.segments.length || l.segments.some(s => !s.stream_url))) throw Error("Invalid playback manifest");
  data = d;
  lesson.replaceChildren(...d.lessons.map((l, i) => new Option(`${l.lesson_id} · ${l.title}`, String(i))));
  lesson.disabled = false;
  $("play").disabled = false;
  $("restart").disabled = false;
  $("edition").textContent = d.edition;
  const params = new URLSearchParams(location.search);
  if (["scene", "lesson", "all"].includes(params.get("mode"))) mode.value = params.get("mode");
  loadLesson(Math.max(0, d.lessons.findIndex(l => l.lesson_id === params.get("lesson"))), params.get("scene"));
}).catch(() => {
  titleKey = "loadFailed";
  $("title").textContent = t(titleKey);
  setStatus("loadHelp");
});
