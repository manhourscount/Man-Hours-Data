// =========================================================================
// 1. FIREBASE SETUP & GLOBAL ELEMENT SELECTORS
// =========================================================================
 const firebaseConfig = {
  apiKey: "AIzaSyA8IQoTkkV_rCW8GpHYxH9-NRT0jnLRqhs",
  authDomain: "man-hours-data.firebaseapp.com",
  databaseURL: "https://man-hours-data-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "man-hours-data",
  storageBucket: "man-hours-data.firebasestorage.app",
  messagingSenderId: "72349451353",
  appId: "1:72349451353:web:7d7dce29a6d9ba6c44dd48",
  measurementId: "G-XN3ZB7PXP6"
 databaseURL: "https://man-hours-data-default-rtdb.asia-southeast1.firebasedatabase.app/" 
};
// Initialize Firebase using the global window variables
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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
  // Convert inputs safely to Date objects and extract their primitive timestamp values
  let current = new Date(startDate);
  const endLimit = new Date(endDate).getTime();

  // Compare using primitive numerical timestamps to prevent infinite loops
  while (current.getTime() <= endLimit) {
    const key = formatDateKey(current);
    
    // Check if key exists first, then parse safely
    if (monthlyAbsenteeStorage[key]) {
      sum += parseInt(monthlyAbsenteeStorage[key], 10) || 0;
    }
    
    // Correctly increments the day
    current.setDate(current.getDate() + 1);
  }
  return sum;
}
// =========================================================================
// 3. METRICS ENGINE & TIMELINE CALCULATORS
// =========================================================================
function getWorkingDaysCount(mode) {
  let start = new Date(), end = new Date();
  const currentYear = new Date().getFullYear();

  if (mode === 'MTD') {
    start.setDate(1);
  } else if (mode === 'YTD') {
    start.setMonth(0, 1);
  } else if (mode.startsWith('M-')) {
    // Correcting 1-based string conversion to 0-based JS Month
    const targetMonth = parseInt(mode.split('-')[1], 10) - 1;
    start = new Date(currentYear, targetMonth, 1);
    
    if (targetMonth === new Date().getMonth()) {
      end = new Date();
    } else {
      end = new Date(currentYear, targetMonth + 1, 0);
    }
  } else {
    return 1;
  }
  
  let workingDays = 0;
  let current = new Date(start);
  const endLimit = end.getTime();

  while (current.getTime() <= endLimit) {
    const day = current.getDay();
    const key = (current.getMonth() + 1) + '-' + current.getDate();
    // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6 && !phHolidays2026[key]) workingDays++;
    current.setDate(current.getDate() + 1);
  }
  return workingDays || 1;
}

function getTotalWeekdaysCount(mode) {
  let start = new Date(), end = new Date();
  const currentYear = new Date().getFullYear();

  if (mode === 'MTD') {
    start.setDate(1);
  } else if (mode === 'YTD') {
    start.setMonth(0, 1);
  } else if (mode.startsWith('M-')) {
    const targetMonth = parseInt(mode.split('-')[1], 10) - 1;
    start = new Date(currentYear, targetMonth, 1);
    if (targetMonth === new Date().getMonth()) {
      end = new Date();
    } else {
      end = new Date(currentYear, targetMonth + 1, 0);
    }
  } else {
    return 1;
  }
  
  let weekdayDays = 0;
  let current = new Date(start);
  const endLimit = end.getTime();

  while (current.getTime() <= endLimit) {
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
  // Safe parsing references assuming your DOM elements are instantiated properly
  const maleVal = parseInt(maleInput.value, 10) || 0;
  const femaleVal = parseInt(femaleInput.value, 10) || 0;
  const totalHeadcount = maleVal + femaleVal;
  const hoursPerDay = parseInt(multiplierInput.value, 10) || 8;
  const mode = timeFilter.value;
  const localNow = new Date();
  const dayCheck = isNonWorkingDay(localNow);
  
  const totalDaysAbsent = parseInt(absentInput.value, 10) || 0;
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
      dayTypeStamp.textContent = selectedOption ? selectedOption.text.toUpperCase() + " 2026" : "MONTHLY";
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
    shiftLengthText.textContent = (selectedOption ? selectedOption.text : "Month") + " Total (" + hoursPerDay + "h/d)";
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
    efficiencyPercentage = (mode === 'LIVE' && dayCheck.isHoliday) ? 0 : 100;
    lossPercentage = (mode === 'LIVE' && dayCheck.isHoliday) ? 100 : 0; // Fixes inverse loss tracking logic
  }
  
  chartEfficiencyLabel.textContent = efficiencyPercentage + "%";
  chartEfficiencyBar.style.width = efficiencyPercentage + "%";
  chartLossLabel.textContent = lossPercentage + "%";
  chartLossBar.style.width = lossPercentage + "%";
}
// =========================================================================
// 4. ABSENTEE VIEW DATA VISUALIZER
// =========================================================================
function loadAbsenteeInputData() {
  const currentMode = timeFilter.value;
  const localNow = new Date();
  
  if (currentMode === 'LIVE') {
    const todayKey = formatDateKey(localNow);
    absentInput.value = monthlyAbsenteeStorage[todayKey] || 0;
  } else if (currentMode === 'MTD') {
    const startOfMonth = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
    // Passing a new date instance prevents reference mutation bugs
    absentInput.value = sumAbsentDaysInRange(startOfMonth, new Date(localNow));
  } else if (currentMode === 'YTD') {
    const startOfYear = new Date(localNow.getFullYear(), 0, 1);
    absentInput.value = sumAbsentDaysInRange(startOfYear, new Date(localNow));
  } else if (currentMode.startsWith('M-')) {
    // Fixed: Parse and subtract 1 to align with JavaScript's 0-indexed month system
    const targetMonth = parseInt(currentMode.split('-')[1], 10) - 1;
    
    // Ensure we track against the current tracking year context safely
    const currentYear = localNow.getFullYear(); 
    const startOfMonth = new Date(currentYear, targetMonth, 1);
    let endOfMonth;
    
    if (targetMonth === localNow.getMonth()) {
      endOfMonth = new Date(localNow); // Copy current day if it's the current month
    } else {
      endOfMonth = new Date(currentYear, targetMonth + 1, 0); // Last day of that specific month
    }
    
    absentInput.value = sumAbsentDaysInRange(startOfMonth, endOfMonth);
  }
}

// =========================================================================
// 5. REPORT EXPORT ENGINE & TIME UTILITIES
// =========================================================================
function exportMetrics() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let timelineModeText = timeFilter.value;
  
  if (timeFilter.value === 'LIVE') {
    timelineModeText = "Live Window Profile";
  } else if (timeFilter.value === 'MTD') {
    timelineModeText = "Month-to-Date (MTD) Summary";
  } else if (timeFilter.value === 'YTD') {
    timelineModeText = "Year-to-Date (YTD) Summary";
  } else if (timeFilter.value.startsWith('M-')) {
    // Fixed: Subtract 1 to correct JavaScript's 0-indexed array behavior
    const monthIdx = parseInt(timeFilter.value.split('-')[1], 10) - 1;
    timelineModeText = (monthNames[monthIdx] || "Unknown Month") + " 2026 Archive";
  }
  
  // Fixed: Fallback to input elements directly to guarantee clean numerical parsing
  const maleVal = parseInt(maleInput.value, 10) || 0;
  const femaleVal = parseInt(femaleInput.value, 10) || 0;
  const accurateHeadcount = maleVal + femaleVal;
  const hoursPerDay = parseInt(multiplierInput.value, 10) || 8;
  
  const grossHoursCalculated = accurateHeadcount * getWorkingDaysCount(timeFilter.value) * hoursPerDay;
  const grossHours = grossHoursCalculated.toLocaleString() + " Hours";
  
  // Fixed: Corrected the schema URI string to follow valid standard formats
  let workbookOutput = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
  <head><meta charset="utf-8"><style>
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
  <tr><td colspan="2" class="title-header">ARCADIA REPORT</td></tr>
  <tr><td class="meta-left">Generation Date: ${dateDisplay.textContent}</td><td class="meta-right">Time: ${clockDisplay.textContent}</td></tr>
  <tr><td class="meta-left">Timeline Framework Mode:</td><td class="meta-right">${timelineModeText}</td></tr>
  <tr><td colspan="2" style="background-color: #ffffff;"></td></tr>
  <tr><td colspan="2" class="section-header">1. HEADCOUNT &amp; DEMOGRAPHICS SUMMARY</td></tr>
  <tr><td class="label-col">Total Dynamic Headcount</td><td class="value-col">${totalDisplay.textContent}</td></tr>
  <tr><td class="label-col">Male Count Allocation</td><td class="value-col">${maleVal}</td></tr>
  <tr><td class="label-col">Female Count Allocation</td><td class="value-col">${femaleVal}</td></tr>
  <tr><td class="label-col">Gender Diversity Ratio</td><td class="value-col">${ratioDisplay.textContent}</td></tr>
  <tr><td colspan="2" style="background-color: #ffffff;"></td></tr>
  <tr><td colspan="2" class="section-header">2. AUDITED OPERATIONAL MAN-HOURS MATRIX</td></tr>
  <tr><td class="label-col">Shift Length Base Baseline</td><td class="value-col">${hoursPerDay} Hours/Day</td></tr>
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
  clockDisplay.textContent = timeObj.getHours().toString().padStart(2, '0') + ":" + 
                             timeObj.getMinutes().toString().padStart(2, '0') + ":" + 
                             timeObj.getSeconds().toString().padStart(2, '0') + " PST";
  dateDisplay.textContent = timeObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// =========================================================================
// 6. INITIALIZATION & LIVE REALTIME FIREBASE SYNC LISTENERS
// =========================================================================
// Run base time clock setup
updateClockEngine();
setInterval(updateClockEngine, 1000);
absentInput.disabled = false;

// 1. Establish the Real-Time Compatibility Listener
db.ref('arcadia_absentee_db').on('value', (snapshot) => {
  const cloudData = snapshot.val() || {};
  
  // Guard against race conditions: Only re-render if the storage reference has actually changed
  if (JSON.stringify(monthlyAbsenteeStorage) !== JSON.stringify(cloudData)) {
    monthlyAbsenteeStorage = cloudData;
    loadAbsenteeInputData();
    calculateMetrics();
  }
});

// 2. Input Write-Back Listener
absentInput.addEventListener('input', () => {
  const currentMode = timeFilter.value;
  const localNow = new Date();
  const rawValue = parseInt(absentInput.value, 10) || 0;
  
  if (currentMode === 'LIVE') {
    const todayKey = formatDateKey(localNow);
    monthlyAbsenteeStorage[todayKey] = rawValue;
  } 
  else if (currentMode === 'MTD') {
    // FIX: To prevent deleting entire historical tracking histories, 
    // update the actual active day under the aggregate framework view.
    const todayKey = formatDateKey(localNow);
    monthlyAbsenteeStorage[todayKey] = rawValue;
  } 
  else if (currentMode.startsWith('M-')) {
    // FIX: Parse and correct 1-based string extraction down to 0-based month layout
    const targetMonthIdx = parseInt(currentMode.split('-')[1], 10) - 1;
    const currentYear = localNow.getFullYear();
    
    if (targetMonthIdx === localNow.getMonth()) {
      monthlyAbsenteeStorage[formatDateKey(localNow)] = rawValue;
    } else {
      // If updating a historic month archive, save to the 1st day of that month 
      // WITHOUT purging or using the 'delete' keyword on remaining days.
      const historicTargetKey = `${currentYear}-${String(targetMonthIdx + 1).padStart(2, '0')}-01`;
      monthlyAbsenteeStorage[historicTargetKey] = rawValue;
    }
  } 
  else if (currentMode === 'YTD') {
    const todayKey = formatDateKey(localNow);
    monthlyAbsenteeStorage[todayKey] = rawValue;
  }
  
  // Calculate local metrics directly to keep visual responses snap-instant
  calculateMetrics();
  
  // Save directly to the cloud path
  db.ref('arcadia_absentee_db').set(monthlyAbsenteeStorage)
    .catch((err) => console.error("Firebase connection blocked save:", err));
});

// 3. User Layout Interaction Hooks
timeFilter.addEventListener('change', () => {
  loadAbsenteeInputData();
  previousTimeFilterMode = timeFilter.value;
  calculateMetrics();
});

maleInput.addEventListener('input', calculateMetrics);
femaleInput.addEventListener('input', calculateMetrics);
multiplierInput.addEventListener('input', calculateMetrics);

const exportBtn = document.getElementById('action-export');
if (exportBtn) {
  exportBtn.addEventListener('click', exportMetrics);
}

