// js/data.js

/* ===== 基本設定 ===== */

const settings = {
  breakMinutes: 10,
  classMinutes: {
    mon: 45,
    tue: 50,
    wed: 50,
    thu: 50,
    fri: 50
  }
};

// 各曜日の開始時刻・コマ数
const dayPlan = {
  mon: { firstStart: "08:55", periods: 7 },
  tue: { firstStart: "08:55", periods: 6 },
  wed: { firstStart: "08:55", periods: 6 },
  thu: { firstStart: "08:55", periods: 6 },
  fri: { firstStart: "08:55", periods: 6 }
};

// 昼休み（必ず定義する）
window.lunch = {
  mon: { start: "12:25", end: "13:10" },
  tue: { start: "12:45", end: "13:30" }, // 必要なら後で修正
  wed: { start: "12:45", end: "13:30" },
  thu: { start: "12:45", end: "13:30" },
  fri: { start: "12:45", end: "13:30" }
};

/* ===== 科目データ ===== */

const details = {
  mon: {
    1: { subject: "保健" },
    2: { subject: "英1" },
    3: { subject: "情数" },
    4: { subject: "数学" },
    5: { subject: "家庭" },
    6: { subject: "家庭" },
    7: { subject: "科学" }
  },
  tue: {
    1: { subject: "数学" },
    2: { subject: "体育" },
    3: { subject: "プログラミング技術" },
    4: { subject: "プログラミング技術" },
    5: { subject: "総探" },
    6: { subject: "LH" }
  },
  wed: {
    1: { subject: "科学" },
    2: { subject: "地理" },
    3: { subject: "音美" },
    4: { subject: "音美" },
    5: { subject: "英コ1" },
    6: { subject: "体育" }
  },
  thu: {
    1: { subject: "英コ1" },
    2: { subject: "電回" },
    3: { subject: "言語" },
    4: { subject: "工業技術基礎" },
    5: { subject: "工業技術基礎" },
    6: { subject: "工業技術基礎" }
  },
  fri: {
    1: { subject: "言語" },
    2: { subject: "電回" },
    3: { subject: "地理" },
    4: { subject: "数学" },
    5: { subject: "情数" },
    6: { subject: "情数" }
  }
};

/* ===== 共通関数 ===== */

function timeStringToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeString(m) {
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" +
         String(m % 60).padStart(2, "0");
}

/* ===== 時間割生成 ===== */

function buildTimetableForDay(dayKey) {
  const plan = dayPlan[dayKey];
  if (!plan) return [];

  let t = timeStringToMinutes(plan.firstStart);
  const table = [];

  for (let i = 1; i <= plan.periods; i++) {
    const start = t;
    const end = t + settings.classMinutes[dayKey];

    table.push({
      name: `${i}時間目`,
      period: i,
      start: minutesToTimeString(start),
      end: minutesToTimeString(end),
      subject: details[dayKey]?.[i]?.subject || ""
    });

    // 最終コマの後は進めない
    if (i === plan.periods) break;

    // 休み時間（通常は10分、ただし4限→5限は昼休み）
    let gap = settings.breakMinutes;

    // 4限の後だけ昼休みを適用
    if (i === 4) {
      const li = window.lunch?.[dayKey];
      if (li?.start && li?.end) {
        gap = timeStringToMinutes(li.end) - timeStringToMinutes(li.start); // だいたい45分
      }
    }

    t = end + gap;
  }

  return table;
}

// ===== timetable を生成して公開 =====
window.timetable = {
  mon: buildTimetableForDay("mon"),
  tue: buildTimetableForDay("tue"),
  wed: buildTimetableForDay("wed"),
  thu: buildTimetableForDay("thu"),
  fri: buildTimetableForDay("fri"),
};

// （任意：デバッグしやすくする。不要なら消してOK）
window.settings = settings;
window.dayPlan = dayPlan;
window.details = details;
