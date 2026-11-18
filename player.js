"use strict";
const $ = id => document.getElementById(id);
const audio = $("audio"), lesson = $("lesson"), scene = $("scene"), mode = $("mode"), status = $("status");
let data, index = 0, sourceVersion = 0;

function currentLesson() { return data.lessons[index]; }
function selectedScene() { return currentLesson().segments[Number(scene.value) || 0]; }
function durationLabel(seconds) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function resetButton() { $("play").textContent = "再生 / Play"; }
function updateSelection() {
  const l = currentLesson(), s = selectedScene(), isScene = mode.value === "scene";
  const selected = isScene ? s : l;
  $("scene-control").hidden = !isScene;
  $("segment-help").textContent = isScene
    ? `場面 ${s.part} / ${l.segments.length} · ${s.subtitle} · ${durationLabel(s.duration_seconds)}${l.segments.length === 1 ? "（この課は1場面です）" : ""}`
    : `${mode.value === "all" ? "この課から順に連続再生" : "この課の会話を最初から再生"} · ${durationLabel(l.duration_seconds)}`;
  const params = new URLSearchParams({lesson: l.lesson_id, scene: s.spread_id, mode: mode.value});
  history.replaceState(null, "", `?${params}`);
  $("direct").href = selected.stream_url;
  $("download").href = l.download_url;
  sourceVersion++;
  audio.pause();
  // Same-origin audio/mpeg files support byte ranges without download redirects.
  // Scene files contain only that scene, so native controls cannot cross its end.
  audio.src = selected.stream_url;
  audio.load();
  resetButton();
  status.textContent = "再生ボタンを押してください。";
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
    status.textContent = error.name === "NotAllowedError"
      ? "再生ボタンを押してください。端末が自動再生を停止しました。"
      : "音源を読み込めませんでした。「再生」で再試行するか、「音源だけを開く」をお試しください。";
  });
}
audio.addEventListener("play", () => {
  $("play").textContent = "一時停止 / Pause";
  status.textContent = mode.value === "all" ? "連続再生中 / Continuous play" : "再生中 / Playing";
});
audio.addEventListener("playing", () => {
  status.textContent = mode.value === "all" ? "連続再生中 / Continuous play" : "再生中 / Playing";
});
audio.addEventListener("pause", () => {
  resetButton();
  if (!audio.ended && audio.currentTime > 0) status.textContent = "一時停止中 / Paused";
});
audio.addEventListener("waiting", () => {
  if (!audio.paused) status.textContent = "音源を読み込んでいます…";
});
audio.addEventListener("ended", () => {
  resetButton();
  if (mode.value === "all" && index < data.lessons.length - 1) {
    loadLesson(index + 1);
    play();
  } else {
    status.textContent = mode.value === "scene" ? "この場面の再生が終わりました。" : "再生が終わりました。";
  }
});
audio.addEventListener("error", () => {
  resetButton();
  status.textContent = "音源を読み込めませんでした。「再生」で再試行するか、「音源だけを開く」をお試しください。";
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
  $("title").textContent = "音源一覧を読み込めませんでした。";
  status.textContent = "ページを再読み込みしてください。下のGitHubリンクからもダウンロードできます。";
});
