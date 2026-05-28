import { initializeApp } from "https://gstatic.com";
import { getAuth, signInWithEmailAndPassword } from "https://gstatic.com";
import { getDatabase, ref, set, onValue } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyA8IQoTkkv_rCW8GPhYXh9-NRT0jnLRqhs",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebasedatabase.app",
  projectId: "man-hours-data",
  storageBucket: "man-hours-data.firebasestorage.app",
  messagingSenderId: "72349451353",
  appId: "1:72349451353:web:7d7dce29a6d9ba6c44dd48",
  measurementId: "G-XN3ZB7PXP6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const TAB_ID = "main_tab_data";
export { set, ref, onValue, signInWithEmailAndPassword };
export const maleInput = document.getElementById('input-male');
export const femaleInput = document.getElementById('input-female');
export const absentInput = document.getElementById('input-absent');
export const multiplierInput = document.getElementById('input-multiplier');
export const timeFilter = document.getElementById('time-filter');
export const sliderValueDisplay = document.getElementById('slider-value-display');
export const shiftLengthText = document.getElementById('shift-length-text');
export const totalDisplay = document.getElementById('total-count-display');
export const manHoursDisplay = document.getElementById('man-hours-display');
export const lostHoursDisplay = document.getElementById('lost-hours-display');
export const absentHoursDisplay = document.getElementById('absent-hours-display');
export const ratioDisplay = document.getElementById('ratio-display');
export const clockDisplay = document.getElementById('live-clock');
export const dateDisplay = document.getElementById('current-date');
export const statusBadge = document.getElementById('live-status');
export const dayTypeStamp = document.getElementById('day-type-stamp');

// Performance Chart Components
export const chartEfficiencyLabel = document.getElementById('chart-efficiency-label');
export const chartEfficiencyBar = document.getElementById('chart-efficiency-bar');
export const chartLossLabel = document.getElementById('chart-loss-label');
export const chartLossBar = document.getElementById('chart-loss-bar');
export const phHolidays2026 = {
 "1-1": "New Year's Day", "2-17": "Chinese New Year", "3-20": "Eid'l Fitr",
 "4-2": "Maundy Thursday", "4-3": "Good Friday", "4-4": "Black Saturday",
 "4-9": "Araw ng Kagitingan", "5-1": "Labor Day", "6-12": "Independence Day",
 "8-21": "Ninoy Aquino Day", "8-31": "National Heroes Day", "11-1": "All Saints' Day",
 "11-2": "All Souls' Day", "11-30": "Bonifacio Day", "12-8": "Feast of the Immaculate Conception",
 "12-24": "Christmas Eve", "12-25": "Christmas Day", "12-30": "Rizal Day", "12-31": "Last Day of the Year"
};

export function formatDateKey(dateObj) {
 const year = dateObj.getFullYear();
 const month = String(dateObj.getMonth() + 1).padStart(2, '0');
 const day = String(dateObj.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}

export function isNonWorkingDay(dateObj) {
 const dayOfWeek = dateObj.getDay(); 
 if (dayOfWeek === 0 || dayOfWeek === 6) return { isHoliday: true, name: "Weekend" };
 const monthDayKey = (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
 if (phHolidays2026[monthDayKey]) return { isHoliday: true, name: phHolidays2026[monthDayKey] };
 return { isHoliday: false, name: "Working Day" };
}

export function getWorkingDaysCount(mode) {
 let start = new Date(), end = new Date();
 if (mode === 'MTD') start.setDate(1);
 else if (mode === 'YTD') start.setMonth(0, 1);
 else if (mode.startsWith('M-')) {
   const targetMonth = parseInt(mode.split('-')[1]);
   start = new Date(2026, targetMonth, 1);
   end = (targetMonth === new Date().getMonth()) ? new Date() : new Date(2026, targetMonth + 1, 0);
 } else return 1;

 let workingDays = 0, current = new Date(start);
 while (current <= end) {
   const day = current.getDay();
   const key = (current.getMonth() + 1) + '-' + current.getDate();
   if (day !== 0 && day !== 6 && !phHolidays2026[key]) workingDays++;
   current.setDate(current.getDate() + 1);
 }
 return workingDays || 1;
}

export function getTotalWeekdaysCount(mode) {
 let start = new Date(), end = new Date();
 if (mode === 'MTD') start.setDate(1);
 else if (mode === 'YTD') start.setMonth(0, 1);
 else if (mode.startsWith('M-')) {
   const targetMonth = parseInt(mode.split('-')[1]);
   start = new Date(2026, targetMonth, 1);
   end = (targetMonth === new Date().getMonth()) ? new Date() : new Date(2026, targetMonth + 1, 0);
 } else return 1;

 let weekdayDays = 0, current = new Date(start);
 while (current <= end) {
   const day = current.getDay();
   if (day !== 0 && day !== 6) weekdayDays++;
   current.setDate(current.getDate() + 1);
 }
 return weekdayDays || 1;
}
import * as dom from "./dom-selectors.js";
import { isNonWorkingDay, getWorkingDaysCount, getTotalWeekdaysCount } from "./date-calculators.js";

export function calculateMetrics() {
 const maleVal = parseInt(dom.maleInput.value) || 0;
 const femaleVal = parseInt(dom.femaleInput.value) || 0;
 const totalHeadcount = maleVal + femaleVal;
 const hoursPerDay = parseInt(dom.multiplierInput.value) || 8;
 const mode = dom.timeFilter.value;
 const localNow = new Date();
 const dayCheck = isNonWorkingDay(localNow);
 const totalDaysAbsent = parseInt(dom.absentInput.value) || 0;
 const absentHoursDeduction = totalDaysAbsent * hoursPerDay;

 if (mode === 'LIVE' && dayCheck.isHoliday) {
   dom.statusBadge.className = "status-badge holiday";
   dom.statusBadge.textContent = dayCheck.name === "Weekend" ? "Weekend Rest" : "Holiday Closure";
   dom.dayTypeStamp.textContent = dayCheck.name.toUpperCase();
   dom.dayTypeStamp.style.color = "var(--accent-red)";
 } else {
   dom.statusBadge.className = "status-badge";
   dom.statusBadge.textContent = "System Active";
   dom.dayTypeStamp.textContent = (mode === 'LIVE') ? "WORKING DAY" : mode + " ACTIVE";
   dom.dayTypeStamp.style.color = "var(--accent-bright-teal)";
 }

 let workingDays = getWorkingDaysCount(mode);
 let operationalWeekdays = getTotalWeekdaysCount(mode);
 if (mode === 'LIVE' && dayCheck.isHoliday) workingDays = 0;

 dom.sliderValueDisplay.textContent = hoursPerDay + " Hour" + (hoursPerDay > 1 ? 's' : '');
 dom.shiftLengthText.textContent = `${mode} Total (${hoursPerDay}h/d)`;

 if (totalHeadcount > 0) {
   dom.ratioDisplay.textContent = Math.round((maleVal / totalHeadcount) * 100) + "% M / " + Math.round((femaleVal / totalHeadcount) * 100) + "% F";
 } else {
   dom.ratioDisplay.textContent = "0% M / 0% F";
 }

 const nominalManHours = totalHeadcount * workingDays * hoursPerDay;
 const trueEstimatedHours = Math.max(0, nominalManHours - absentHoursDeduction);
 const holidayDeficitDays = Math.max(0, operationalWeekdays - workingDays);
 const holidayLostHours = totalHeadcount * holidayDeficitDays * hoursPerDay;

 dom.totalDisplay.textContent = totalHeadcount.toString().padStart(3, '0');
 dom.manHoursDisplay.textContent = trueEstimatedHours.toLocaleString() + 'h';
 dom.lostHoursDisplay.textContent = holidayLostHours.toLocaleString() + 'h';
 dom.absentHoursDisplay.textContent = absentHoursDeduction.toLocaleString() + 'h';

 const grossEstimatedHours = totalHeadcount * workingDays * hoursPerDay;
 let efficiencyPercentage = grossEstimatedHours > 0 ? Math.round((trueEstimatedHours / grossEstimatedHours) * 100) : 100;
 let lossPercentage = grossEstimatedHours > 0 ? Math.round(((absentHoursDeduction + holidayLostHours) / grossEstimatedHours) * 100) : 0;

 dom.chartEfficiencyLabel.textContent = efficiencyPercentage + "%";
 dom.chartEfficiencyBar.style.width = efficiencyPercentage + "%";
 dom.chartLossLabel.textContent = lossPercentage + "%";
 dom.chartLossBar.style.width = lossPercentage + "%";
}
import * as dom from "./dom-selectors.js";
import { getWorkingDaysCount } from "./date-calculators.js";

export function exportMetrics() {
 const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
 let timelineModeText = dom.timeFilter.value;
 if (timelineModeText.startsWith('M-')) {
   const monthIdx = parseInt(timelineModeText.split('-')[1]);
   timelineModeText = monthNames[monthIdx] + " 2026 Archive";
 }

 const grossHours = (parseInt(dom.totalDisplay.textContent) * getWorkingDaysCount(dom.timeFilter.value) * parseInt(dom.multiplierInput.value)).toLocaleString() + " Hours";
 let workbookOutput = `
 <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
 <head><style>
 td { font-family: 'Segoe UI', sans-serif; padding: 6px; }
 .title-header { background-color: #0f766e; color: white; font-size: 14pt; font-weight: bold; text-align: center; }
 .section-header { background-color: #115e59; color: white; font-weight: bold; }
 .label-col { background-color: #f8fafc; color: #334155; width: 260px; border: 1px solid #e2e8f0; }
 .value-col { text-align: right; font-weight: bold; width: 160px; border: 1px solid #e2e8f0; }
 </style></head>
 <body><table>
 <tr><td colspan="2" class="title-header">ARCADIA OPERATIONS REPORT</td></tr>
 <tr><td class="label-col">Total Dynamic Headcount</td><td class="value-col">${dom.totalDisplay.textContent} Personnel</td></tr>
 <tr><td class="label-col">Gross Work Hours</td><td class="value-col">${grossHours}</td></tr>
 <tr><td class="label-col">Net Yield Hours</td><td class="value-col">${dom.manHoursDisplay.textContent}</td></tr>
 </table></body></html>`;
 
 const blob = new Blob([workbookOutput], { type: 'application/vnd.ms-excel;charset=utf-8;' });
 const link = document.createElement("a");
 link.setAttribute("href", URL.createObjectURL(blob));
 link.setAttribute("download", "Arcadia_Audited_Report_" + timelineModeText.replace(/[^a-z0-9]/gi, '_') + ".xls");
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
}
import { auth, db, TAB_ID, set, ref, onValue, signInWithEmailAndPassword } from "./firebase-config.js";
import * as dom from "./dom-selectors.js";
import { formatDateKey } from "./date-calculators.js";
import { calculateMetrics } from "./metrics-engine.js";
import { exportMetrics } from "./export-engine.js";

let monthlyAbsenteeStorage = {};

function updateClockEngine() {
 const timeObj = new Date();
 dom.clockDisplay.textContent = timeObj.getHours().toString().padStart(2, '0') + ":" + timeObj.getMinutes().toString().padStart(2, '0') + ":" + timeObj.getSeconds().toString().padStart(2, '0') + " PST";
 dom.dateDisplay.textContent = timeObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function saveAbsenteeProgressToDisk() {
 localStorage.setItem('arcadia_absentee_db', JSON.stringify(monthlyAbsenteeStorage));
 if (auth.currentUser) {
   set(ref(db, 'tabs/' + TAB_ID), { content: monthlyAbsenteeStorage })
     .then(() => console.log("☁️ Cloud database updated successfully."))
     .catch((err) => console.error("Cloud write blocked:", err));
 }
}

function loadAbsenteeInputData() {
 const currentMode = dom.timeFilter.value;
 if (currentMode === 'LIVE') {
   const todayKey = formatDateKey(new Date());
   dom.absentInput.value = monthlyAbsenteeStorage[todayKey] || 0;
 }
}

function attemptAdminAuth() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    signInWithEmailAndPassword(auth, "your-admin-email@example.com", "your-secure-password")
      .then(() => console.log("🔓 Local Admin Sync Privileges Active."))
      .catch((err) => console.warn("🔒 Viewer Mode initialized:", err.message));
  }
}

document.addEventListener('DOMContentLoaded', () => {
 updateClockEngine();
 setInterval(updateClockEngine, 1000);
 
 // Automatically fetch cloud synchronization records for every viewer
 onValue(ref(db, 'tabs/' + TAB_ID), (snapshot) => {
   const cloudSnapshot = snapshot.val();
   if (cloudSnapshot && cloudSnapshot.content) {
     monthlyAbsenteeStorage = cloudSnapshot.content;
     console.log("☁️ Realtime dataset synced.");
   }
   dom.absentInput.disabled = false;
   loadAbsenteeInputData();
   calculateMetrics();
 });
 
 attemptAdminAuth();

 dom.absentInput.addEventListener('input', () => {
   const todayKey = formatDateKey(new Date());
   monthlyAbsenteeStorage[todayKey] = parseInt(dom.absentInput.value) || 0;
   saveAbsenteeProgressToDisk();
   calculateMetrics();
 });

 dom.timeFilter.addEventListener('change', () => {
   loadAbsenteeInputData();
   calculateMetrics();
 });

 dom.maleInput.addEventListener('input', calculateMetrics);
 dom.femaleInput.addEventListener('input', calculateMetrics);
 dom.multiplierInput.addEventListener('input', calculateMetrics);
 if (document.getElementById('action-export')) {
   document.getElementById('action-export').addEventListener('click', exportMetrics);
 }
});
