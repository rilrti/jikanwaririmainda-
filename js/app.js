// js/app.js
// ==============================
// 1) 定数
// ==============================

const DAY_LABEL = { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金" };
const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// ==============================
// 2) 時刻ユーティリティ
// ==============================

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getNowTimeString() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesLeft(nowStr, endStr) {
  if (!nowStr || !endStr) return 0;
  return Math.max(0, toMinutes(endStr) - toMinutes(nowStr));
}

// ==============================
// 3) データ参照（教室・持ち物）
// ==============================

function getRoom(dayKey, periodNumber) {
  return rooms?.[dayKey]?.[periodNumber] || "教室未設定";
}

function getItems(dayKey, periodNumber) {
  return items?.[dayKey]?.[periodNumber] || [];
}

// ==============================
// 4) 曜日キー（mon〜fri）
// ==============================

function getNowDayKey() {
  const d = new Date().getDay(); // 0(日)〜6(土)
  const keys = [null, "mon", "tue", "wed", "thu", "fri", null];
  return keys[d] ?? null; // 土日は null
}

function getNextSchoolDayKey() {
  // 今日以降で最初に来る「授業がある日(mon-fri)」を返す（finished→翌日扱い）
  const idx = new Date().getDay(); // 0-6
  for (let step = 1; step <= 7; step++) {
    const key = DAY_ORDER[(idx + step) % 7];
    if (key && key !== "sun" && key !== "sat") return key;
  }
  return "mon";
}

// ==============================
// 5) 判定ロジック
// ==============================

function getFirstPeriodInfo(dayKey) {
  const dayTable = window.timetable?.[dayKey];
  if (!dayTable || dayTable.length === 0) return null;

  const first = dayTable[0];
  return {
    period: first.name,
    subject: first.subject || "",
    start: first.start,
    end: first.end,
  };
}

function findCurrentState(dayKey, nowStr) {
  if (!dayKey) return { type: "holiday" };

  const now = toMinutes(nowStr);

  // 昼休み
  const lunchInfo = window.lunch?.[dayKey];
  if (lunchInfo) {
    const s = toMinutes(lunchInfo.start);
    const e = toMinutes(lunchInfo.end);
    if (now >= s && now < e) return { type: "lunch", ...lunchInfo };
  }

  const dayTable = window.timetable?.[dayKey] || [];

  // 授業中
  for (const p of dayTable) {
    const s = toMinutes(p.start);
    const e = toMinutes(p.end);
    if (now >= s && now < e) {
      return { type: "class", period: p.name, subject: p.subject, start: p.start, end: p.end };
    }
  }

  // 休み時間
  for (let i = 0; i < dayTable.length - 1; i++) {
    const curEnd = toMinutes(dayTable[i].end);
    const nextStart = toMinutes(dayTable[i + 1].start);
    if (now >= curEnd && now < nextStart) {
      return { type: "break", next: dayTable[i + 1].name, nextSubject: dayTable[i + 1].subject };
    }
  }

  // 授業前 / 授業終了後の判定（ここを追加）
  if (dayTable.length > 0) {
    const firstStart = toMinutes(dayTable[0].start);
    const lastEnd = toMinutes(dayTable[dayTable.length - 1].end);

    // 授業が全部終わった後
    if (now >= lastEnd) {
      return { type: "finished" };
    }

    // 授業が始まる前（ここは out のままでOK）
    if (now < firstStart) {
      return { type: "out" };
    }
  }
  return { type: "out" };
}

// ==============================
// 6) 表示（UI）
// ==============================

function render(state, dayKey, timeStr) {
  const nowDiv = document.getElementById("now");
  const mainDiv = document.getElementById("main");
  const roomDiv = document.getElementById("room");
  const itemsDiv = document.getElementById("items");
  const leftDiv = document.getElementById("left");

  const dayName = DAY_LABEL[dayKey] ?? "";
  nowDiv.textContent = dayName ? `${dayName}曜日 ${timeStr}` : `${timeStr}`;

  switch (state.type) {
    case "class": {
      const periodNum = Number(state.period.replace("時間目", ""));
      const room = getRoom(dayKey, periodNum);
      const itemList = getItems(dayKey, periodNum);
      const left = minutesLeft(timeStr, state.end);

      mainDiv.textContent = `今は ${state.period}（${state.subject}）`;
      roomDiv.textContent = `教室：${room}`;
      itemsDiv.textContent = `持ち物：${itemList.length ? itemList.join("、") : "特になし"}`;
      leftDiv.textContent = `終了まであと ${left} 分`;
      return;
    }

   case "lunch": {
  mainDiv.textContent = "今は昼休み";

  const dayTable = window.timetable?.[dayKey] || [];
  const next = dayTable.find(p => toMinutes(p.start) >= toMinutes(state.end)); 
  // 昼休み終了時刻(state.end)以降に始まる最初の授業

  if (next) {
    const periodNum = next.period; // buildTimetableで period を入れているので確実
    const room = getRoom(dayKey, periodNum);
    const itemList = getItems(dayKey, periodNum);

    roomDiv.textContent = `次は ${next.name}（${next.subject}） ${next.start}〜`;
    itemsDiv.textContent = `教室：${room} / 持ち物：${itemList.length ? itemList.join("、") : "特になし"}`;
  } else {
    roomDiv.textContent = "";
    itemsDiv.textContent = "";
  }

  leftDiv.textContent = `残り ${minutesLeft(timeStr, state.end)} 分`;
  return;
}

    case "break": {
      mainDiv.textContent = "今は休み時間";
      roomDiv.textContent = "";
      itemsDiv.textContent = `次は ${state.next}（${state.nextSubject}）`;
      leftDiv.textContent = "";
      return;
    }

    case "finished": {
      const nextDayKey = getNextSchoolDayKey();
      const nextDayName = DAY_LABEL[nextDayKey] ?? "";
      const first = getFirstPeriodInfo(nextDayKey);

      mainDiv.textContent = "本日の授業はすべて終了しました";

      if (!first) {
        roomDiv.textContent = "";
        itemsDiv.textContent = "";
        leftDiv.textContent = `次の授業情報（${nextDayName}）が未設定です。`;
        return;
      }

      const periodNum = 1;
      const room = getRoom(nextDayKey, periodNum);
      const itemList = getItems(nextDayKey, periodNum);
      const itemsText = itemList.length ? itemList.join("、") : "特になし";

      roomDiv.textContent = `次回：${nextDayName}曜 ${first.period}（${first.start}〜）`;
      itemsDiv.textContent = `科目：${first.subject || "未設定"} / 教室：${room}`;
      leftDiv.textContent = `持ち物：${itemsText}`;
      return;
    }

    default: {
      mainDiv.textContent = "現在は授業時間外です";
      roomDiv.textContent = "";
      itemsDiv.textContent = "";
      leftDiv.textContent = "";
      return;
    }
  }
}

// ==============================
// 7) 起動・更新スケジューラ
// ==============================

function update() {
  const dayKey = getNowDayKey();
  const timeStr = getNowTimeString();
  const state = findCurrentState(dayKey, timeStr);
  render(state, dayKey, timeStr);
}

window.addEventListener("DOMContentLoaded", () => {
  update();

  // 次の「分」の境界に合わせて、その後は1分ごとに更新
  (function startMinuteAlignedReload() {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
      update();
      setInterval(update, 60000);
    }, msToNextMinute);
  })();
});
