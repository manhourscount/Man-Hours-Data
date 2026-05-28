// =========================================================================
// 1. FIREBASE INITIALIZATION & GLOBAL ELEMENT SELECTORS
// =========================================================================
import { initializeApp } from "https://gstatic.com";
import { getDatabase, ref, onValue, set } from "https://gstatic.com";

// Make sure your database URL is inside the quotation marks below!
const firebaseConfig = {
  databaseURL: "https://firebaseio.com" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global DOM Selectors
const maleInput = document.getElementById('input-male');
const femaleInput = document.getElementById('input-female');
const absentInput = document.getElementById('input-absent');
const multiplierInput = document.getElementById('input-multiplier');
const timeFilter = document.getElementById('time-filter');
const sliderValueDisplay = document.getElementById('slider-value-display');
const shiftLengthText = document.getElementById('shift-length-text');
const totalDisplay = document.getElementById('total-count-display');
const manHoursDisplay = document.getElementById('man-hours-display');
const lostHoursDisplay = document.getElementById('lost-hours-display');
const absentHoursDisplay = document.getElementById('absent-hours-display');
const ratioDisplay = document.getElementById('ratio-display');
const clockDisplay = document.getElementById('live-clock');
const dateDisplay = document.getElementById('current-date');
const statusBadge = document.getElementById('live-status');
const dayTypeStamp = document.getElementById('day-type-stamp');

// Performance Chart Components
const chartEfficiencyLabel = document.getElementById('chart-efficiency-label');
const chartEfficiencyBar = document.getElementById('chart-efficiency-bar');
const chartLossLabel = document.getElementById('chart-loss-label');
const chartLossBar = document.getElementById('chart-loss-bar');

// =========================================================================
// 2. HOLIDAY CALENDAR, RUNTIME DATABASE, & DATE HELPERS
// =========================================================================
// 2026 Public Philippine Holidays Calendar
const phHolidays2026 = {
  "1-1": "New Year's Day", "2-17": "Chinese New Year", "3-20": "Eid'l Fitr",
  "4-2": "Maundy Thursday", "4-3": "Good Friday", "4-4": "Black Saturday",
  "4-9": "Araw ng Kagitingan", "5-1": "Labor Day", "6-12": "Independence Day",
  "8-21": "Ninoy Aquino Day", "8-31": "National Heroes Day", "11-1": "All Saints' Day",
  "11-2": "All Souls' Day", "11-30": "Bonifacio Day", "12-8": "Feast of the Immaculate Conception",
  "12-24": "Christmas Eve", "12-25": "Christmas Day", "12-30": "Rizal Day", "12-31": "Last Day of the Year"
};

// Global in-memory storage synced with the cloud
let monthlyAbsenteeStorage = {};
let previousTimeFilterMode = 'LIVE';

// Helper to format date object to standard ISO string (YYYY-MM-DD)
function formatDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to sum up absent days across a range
function sumAbsentDaysInRange(startDate, endDate) {
  let sum = 0;
  let current = new Date(startDate);
  while (current <= endDate) {
    const key = formatDateKey(current);
    sum += parseInt(monthlyAbsenteeStorage[key]) || 0;
    current.setDate(current.getDate() + 1);
  }
  return sum;
}

// =========================================================================
// 3. METRICS ENGINE & TIMELINE CALCULATORS (FIXED)
// =========================================================================
function getWorkingDaysCount(mode) {
  let start = new Date(), end = new Date();
  if (mode === 'MTD') {
    start.setDate(1);
  } else if (mode === 'YTD') {
    start.setMonth(0, 1);
  } else if (mode.startsWith('M-')) {
    const targetMonth = parseInt(mode.split('-')[1]);
    start = new Date(2026, targetMonth, 1);
    if (targetMonth === new Date().getMonth()) {
      end = new Date();
    } else {
      end = new Date(2026, targetMonth + 1, 0);
    }
  } else {
    return 1;
  }
  let workingDays = 0, current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    const key = (current.getMonth() + 1) + '-' + current.getDate();
    if (day !== 0 && day !== 6 && !phHolidays2026[key]) workingDays++;
    current.setDate(current.getDate() + 1);
  }
  return workingDays || 1;
}

function getTotalWeekdaysCount(mode) {
  let start = new Date(), end = new Date();
  if (mode === 'MTD') {
    start.setDate(1);
  } else if (mode === 'YTD') {
    start.setMonth(0, 1);
  } else if (mode.startsWith('M-')) {
    const targetMonth = parseInt(mode.split('-')[1]);
    start = new Date(2026, targetMonth, 1);
    if (targetMonth === new Date().getMonth()) {
      end = new Date();
    } else {
      end = new Date(2026, targetMonth + 1, 0);
    }
  } else {
    return 1;
  }
  let weekdayDays = 0, current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) weekdayDays++;
    current.setDate(current.getDate() + 1);
  }
  return weekdayDays || 1;
}
function isNonWorkingDay(dateObj) {
  const dayOfWeek = dateObj.getDay(); 
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isHoliday: true, name: "Weekend" };
  }
  const monthDayKey = (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
  if (phHolidays2026[monthDayKey]) {
    return { isHoliday: true, name: phHolidays2026[monthDayKey] };
  }
  return { isHoliday: false, name: "Working Day" };
}
function calculateMetrics() {
  const maleVal = parseInt(maleInput.value) || 0;
  const femaleVal = parseInt(femaleInput.value) || 0;
  const totalHeadcount = maleVal + femaleVal;
  const hoursPerDay = parseInt(multiplierInput.value) || 8;
  const mode = timeFilter.value;
  const localNow = new Date();
  const dayCheck = isNonWorkingDay(localNow);
  
  const totalDaysAbsent = parseInt(absentInput.value) || 0;
  const absentHoursDeduction = totalDaysAbsent * hoursPerDay;
  
  if (mode === 'LIVE' && dayCheck.isHoliday) {
    statusBadge.className = "status-badge holiday";
    statusBadge.textContent = dayCheck.name === "Weekend" ? "Weekend Rest" : "Holiday Closure";
    dayTypeStamp.textContent = dayCheck.name.toUpperCase();
    dayTypeStamp.style.color = "var(--accent-red)";
  } else {
    statusBadge.className = "status-badge";
    statusBadge.textContent = "System Active";
    if (mode === 'LIVE') {
      dayTypeStamp.textContent = "WORKING DAY";
    } else if (mode.startsWith('M-')) {
      const selectedOption = timeFilter.options[timeFilter.selectedIndex];
      dayTypeStamp.textContent = selectedOption.text.toUpperCase() + " 2026";
    } else {
      dayTypeStamp.textContent = mode + " ACTIVE";
    }
    dayTypeStamp.style.color = "var(--accent-bright-teal)";
  }
  
  let workingDays = getWorkingDaysCount(mode);
  let operationalWeekdays = getTotalWeekdaysCount(mode);
  if (mode === 'LIVE' && dayCheck.isHoliday) workingDays = 0;
  
  sliderValueDisplay.textContent = hoursPerDay + " Hour" + (hoursPerDay > 1 ? 's' : '');
  
  if (mode === 'LIVE') {
    shiftLengthText.textContent = "Shift Total (" + hoursPerDay + "h Avg)";
  } else if (mode.startsWith('M-')) {
    const selectedOption = timeFilter.options[timeFilter.selectedIndex];
    shiftLengthText.textContent = selectedOption.text + " Total (" + hoursPerDay + "h/d)";
  } else {
    shiftLengthText.textContent = mode + " Total (" + hoursPerDay + "h/d)";
  }
  
  if (totalHeadcount > 0) {
    ratioDisplay.textContent = Math.round((maleVal / totalHeadcount) * 100) + "% M / " + Math.round((femaleVal / totalHeadcount) * 100) + "% F";
  } else {
    ratioDisplay.textContent = "0% M / 0% F";
  }
  
  const nominalManHours = totalHeadcount * workingDays * hoursPerDay;
  const trueEstimatedHours = Math.max(0, nominalManHours - absentHoursDeduction);
  const holidayDeficitDays = Math.max(0, operationalWeekdays - workingDays);
  const holidayLostHours = totalHeadcount * holidayDeficitDays * hoursPerDay;
  
  totalDisplay.textContent = totalHeadcount.toString().padStart(3, '0');
  manHoursDisplay.textContent = trueEstimatedHours.toLocaleString() + 'h';
  lostHoursDisplay.textContent = holidayLostHours.toLocaleString() + 'h';
  absentHoursDisplay.textContent = absentHoursDeduction.toLocaleString() + 'h';
  
  const grossEstimatedHours = totalHeadcount * workingDays * hoursPerDay;
  let efficiencyPercentage = 100;
  let lossPercentage = 0;
  
  if (grossEstimatedHours > 0) {
    efficiencyPercentage = Math.round((trueEstimatedHours / grossEstimatedHours) * 100);
    const totalCombinedLoss = absentHoursDeduction + holidayLostHours;
    lossPercentage = Math.round((totalCombinedLoss / grossEstimatedHours) * 100);
    efficiencyPercentage = Math.min(100, Math.max(0, efficiencyPercentage));
    lossPercentage = Math.min(100, Math.max(0, lossPercentage));
  } else {
    efficiencyPercentage = mode === 'LIVE' && dayCheck.isHoliday ? 0 : 100;
    lossPercentage = 0;
  }
  
  chartEfficiencyLabel.textContent = efficiencyPercentage + "%";
  chartEfficiencyBar.style.width = efficiencyPercentage + "%";
  chartLossLabel.textContent = lossPercentage + "%";
  chartLossBar.style.width = lossPercentage + "%";
}

// =========================================================================
// 4. ABSENTEE VIEW DATA SYNCHRONIZER (FIXED)
// =========================================================================
function loadAbsenteeInputData() {
  const currentMode = timeFilter.value;
  const localNow = new Date();
  if (currentMode === 'LIVE') {
    const todayKey = formatDateKey(localNow);
    absentInput.value = monthlyAbsenteeStorage[todayKey] || 0;
  } else if (currentMode === 'MTD') {
    const startOfMonth = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
    absentInput.value = sumAbsentDaysInRange(startOfMonth, localNow);
  } else if (currentMode === 'YTD') {
    const startOfYear = new Date(localNow.getFullYear(), 0, 1);
    absentInput.value = sumAbsentDaysInRange(startOfYear, localNow);
  } else if (currentMode.startsWith('M-')) {
    const targetMonth = parseInt(currentMode.split('-')[1]);
    const startOfMonth = new Date(2026, targetMonth, 1);
    let endOfMonth = new Date(2026, targetMonth + 1, 0);
    if (targetMonth === localNow.getMonth()) endOfMonth = localNow;
    absentInput.value = sumAbsentDaysInRange(startOfMonth, endOfMonth);
  }
}

// =========================================================================
// 5. DATA EXPORT REPORT ENGINE
// =========================================================================
function exportMetrics() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let timelineModeText = timeFilter.value;
  if (timeFilter.value === 'LIVE') timelineModeText = "Live Window Profile";
  else if (timeFilter.value === 'MTD') timelineModeText = "Month-to-Date (MTD) Summary";
  else if (timeFilter.value === 'YTD') timelineModeText = "Year-to-Date (YTD) Summary";
  else if (timeFilter.value.startsWith('M-')) {
    const monthIdx = parseInt(timeFilter.value.split('-')[1]);
    timelineModeText = monthNames[monthIdx] + " 2026 Archive";
  }
  const grossHours = (parseInt(totalDisplay.textContent) * getWorkingDaysCount(timeFilter.value) * parseInt(multiplierInput.value)).toLocaleString() + " Hours";
  
  let workbookOutput = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
  <head><style>
  td { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; padding: 6px; }
  .title-header { background-color: #0f766e; color: #ffffff; font-size: 14pt; font-weight: bold; text-align: center; border-bottom: 2px solid #115e59; }
  .meta-left { background-color: #f1f5f9; color: #475569; font-size: 10pt; font-style: italic; border-bottom: 1px solid #cbd5e1; }
  .meta-right { background-color: #f1f5f9; color: #0f766e; font-size: 10pt; font-weight: bold; text-align: right; border-bottom: 1px solid #cbd5e1; }
  .section-header { background-color: #115e59; color: #ffffff; font-weight: bold; font-size: 11pt; }
  .label-col { background-color: #f8fafc; color: #334155; width: 260px; border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
  .value-col { text-align: right; font-weight: bold; color: #0f172a; width: 160px; border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
  .metric-high { color: #0d9488; background-color: #ccfbf1; text-align: right; font-weight: bold; border: 1px solid #99f6e4; }
  .metric-loss { color: #e11d48; background-color: #ffe4e6; text-align: right; font-weight: bold; border: 1px solid #fecdd3; }
  </style></head><body><table>
  <tr><td colspan="2" class="title-header">ARCADIA x ENGIE AUDITED OPERATIONS REPORT</td></tr>
  <tr><td class="meta-left">Generation Date: ${dateDisplay.textContent}</td><td class="meta-right">Time: ${clockDisplay.textContent}</td></tr>
  <tr><td class="meta-left">Timeline Framework Mode:</td><td class="meta-right">${timelineModeText}</td></tr>
  <tr><td colspan="2" style="background-color: #ffffff;"></td></tr>
  <tr><td colspan="2" class="section-header">1. HEADCOUNT &amp; DEMOGRAPHICS SUMMARY</td></tr>
  <tr><td class="label-col">Total Dynamic Headcount</td><td class="value-col">${totalDisplay.textContent} Personnel</td></tr>
  <tr><td class="label-col">Male Count Allocation</td><td class="value-col">${maleInput.value || 0}</td></tr>
  <tr><td class="label-col">Female Count Allocation</td><td class="value-col">${femaleInput.value || 0}</td></tr>
  <tr><td class="label-col">Gender Diversity Ratio</td><td class="value-col">${ratioDisplay.textContent}</td></tr>
  <tr><td colspan="2" style="background-color: #ffffff;"></td></tr>
  <tr><td colspan="2" class="section-header">2. AUDITED OPERATIONAL MAN-HOURS MATRIX</td></tr>
  <tr><td class="label-col">Shift Length Base Baseline</td><td class="value-col">${multiplierInput.value} Hours/Day</td></tr>
  <tr><td class="label-col">Gross Estimated Work Hours</td><td class="value-col">${grossHours}</td></tr>
  <tr><td class="label-col">Absentee Days Logged</td><td class="value-col">${absentInput.value || 0} Days</td></tr>
  <tr><td class="label-col">Deducted Absentee Hours Loss</td><td class="value-col">${absentHoursDisplay.textContent}</td></tr>
  <tr><td class="label-col">Net Productive Yield Hours</td><td class="value-col">${manHoursDisplay.textContent}</td></tr>
  <tr><td class="label-col">Weekday Holiday Deficit Loss</td><td class="value-col">${lostHoursDisplay.textContent}</td></tr>
  <tr><td colspan="2" style="background-color: #ffffff;"></td></tr>
  <tr><td colspan="2" class="section-header">3. PERFORMANCE &amp; EFFICIENCY METRIC RATIOS</td></tr>
  <tr><td class="label-col">Net Productive Yield Rate</td><td class="metric-high">${chartEfficiencyLabel.textContent}</td></tr>
  <tr><td class="label-col">Absence &amp; Deficit Loss Rate</td><td class="metric-loss">${chartLossLabel.textContent}</td></tr>
  </table></body></html>`;
  
  const blob = new Blob([workbookOutput], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  const safeFilename = timelineModeText.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_');
  link.setAttribute("download", "Arcadia_Audited_Report_" + safeFilename + ".xls");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateClockEngine() {
  const timeObj = new Date();
  clockDisplay.textContent = timeObj.getHours().toString().padStart(2, '0') + ":" + timeObj.getMinutes().toString().padStart(2, '0') + ":" + timeObj.getSeconds().toString().padStart(2, '0') + " PST";
  dateDisplay.textContent = timeObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
// =========================================================================
// 6. REALTIME CLOCK & GLOBAL REALTIME FIREBASE EVENT LISTENERS
// =========================================================================
// Start live background clock engine loop
updateClockEngine();
setInterval(updateClockEngine, 1000);
absentInput.disabled = false;

// 1. Establish the Real-Time Cloud Listener
onValue(ref(db, 'arcadia_absentee_db'), (snapshot) => {
  const cloudData = snapshot.val() || {};
  
  // Directly swap out old offline values with matching centralized records
  monthlyAbsenteeStorage = cloudData;
  
  // Refresh layout visuals seamlessly
  loadAbsenteeInputData();
  calculateMetrics();
});

// 2. Local Input Processors (Write-Back Interceptors)
absentInput.addEventListener('input', () => {
  const currentMode = timeFilter.value;
  const localNow = new Date();
  const rawValue = parseInt(absentInput.value) || 0;
  
  if (currentMode === 'LIVE') {
    const todayKey = formatDateKey(localNow);
    monthlyAbsenteeStorage[todayKey] = rawValue;
  } else if (currentMode === 'MTD' || currentMode.startsWith('M-')) {
    let targetMonthIdx = localNow.getMonth();
    if (currentMode.startsWith('M-')) {
      targetMonthIdx = parseInt(currentMode.split('-')[1]);
    }
    const startOfMonth = new Date(2026, targetMonthIdx, 1);
    const endOfMonth = new Date(2026, targetMonthIdx + 1, 0);
    
    let scan = new Date(startOfMonth);
    while (scan <= endOfMonth) {
      delete monthlyAbsenteeStorage[formatDateKey(scan)];
      scan.setDate(scan.getDate() + 1);
    }
    monthlyAbsenteeStorage[formatDateKey(startOfMonth)] = rawValue;
  } else if (currentMode === 'YTD') {
    for (let key in monthlyAbsenteeStorage) {
      if (key.startsWith('2026-')) delete monthlyAbsenteeStorage[key];
    }
    monthlyAbsenteeStorage['2026-01-01'] = rawValue;
  }
  
  // Sync memory tree array update back to Firebase
  set(ref(db, 'arcadia_absentee_db'), monthlyAbsenteeStorage)
    .catch((err) => console.error("Database connection rule violation blocked save:", err));
});

// 3. Simple Interface Interaction Trackers
timeFilter.addEventListener('change', () => {
  loadAbsenteeInputData();
  previousTimeFilterMode = timeFilter.value;
  calculateMetrics();
});

maleInput.addEventListener('input', calculateMetrics);
femaleInput.addEventListener('input', calculateMetrics);
multiplierInput.addEventListener('input', calculateMetrics);

const exportBtn = document.getElementById('action-export');
if (exportBtn) exportBtn.addEventListener('click', exportMetrics);

