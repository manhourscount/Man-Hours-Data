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

const phHolidays2026 = {
 "1-1": "New Year's Day", "2-17": "Chinese New Year", "3-20": "Eid'l Fitr",
 "4-2": "Maundy Thursday", "4-3": "Good Friday", "4-4": "Black Saturday",
 "4-9": "Araw ng Kagitingan", "5-1": "Labor Day", "6-12": "Independence Day",
 "8-21": "Ninoy Aquino Day", "8-31": "National Heroes Day", "11-1": "All Saints' Day",
 "11-2": "All Souls' Day", "11-30": "Bonifacio Day", "12-8": "Feast of the Immaculate Conception",
 "12-24": "Christmas Eve", "12-25": "Christmas Day", "12-30": "Rizal Day", "12-31": "Last Day of the Year"
};

function getWorkingDaysCount(mode) {
 let start = new Date(), end = new Date();
 if (mode === 'MTD') start.setDate(1);
 else if (mode === 'YTD') start.setMonth(0, 1);
 else return 1;
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
 if (mode === 'MTD') start.setDate(1);
 else if (mode === 'YTD') start.setMonth(0, 1);
 else return 1;
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
 if (dayOfWeek === 0 || dayOfWeek === 6) return { isHoliday: true, name: "Weekend" };
 const monthDayKey = (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
 if (phHolidays2026[monthDayKey]) return { isHoliday: true, name: phHolidays2026[monthDayKey] };
 return { isHoliday: false, name: "Working Day" };
}

function calculateMetrics() {
 const maleVal = parseInt(maleInput.value) || 0;
 const femaleVal = parseInt(femaleInput.value) || 0;
 const totalHeadcount = maleVal + femaleVal;
 const hoursPerDay = parseInt(multiplierInput.value) || 8;
 const totalDaysAbsent = parseInt(absentInput.value) || 0;
 const mode = timeFilter.value;

 const localNow = new Date();
 const dayCheck = isNonWorkingDay(localNow);

 if (mode === 'LIVE' && dayCheck.isHoliday) {
  statusBadge.className = "status-badge holiday";
  statusBadge.textContent = dayCheck.name === "Weekend" ? "Weekend Rest" : "Holiday Closure";
  dayTypeStamp.textContent = dayCheck.name.toUpperCase();
  dayTypeStamp.style.color = "var(--accent-red)";
 } else {
  statusBadge.className = "status-badge";
  statusBadge.textContent = "System Active";
  dayTypeStamp.textContent = mode === 'LIVE' ? "WORKING DAY" : mode + " ACTIVE";
  dayTypeStamp.style.color = "var(--accent-bright-teal)";
 }

 let workingDays = getWorkingDaysCount(mode);
 let operationalWeekdays = getTotalWeekdaysCount(mode);
 
 if (mode === 'LIVE' && dayCheck.isHoliday) {
  workingDays = 0;
 }

 sliderValueDisplay.textContent = hoursPerDay + " Hour" + (hoursPerDay > 1 ? 's' : '');
 shiftLengthText.textContent = mode === 'LIVE' ? "Shift Total (" + hoursPerDay + "h Avg)" : mode + " Total (" + hoursPerDay + "h/d)";

 if (totalHeadcount > 0) {
  ratioDisplay.textContent = Math.round((maleVal / totalHeadcount) * 100) + "% M / " + Math.round((femaleVal / totalHeadcount) * 100) + "% F";
 } else {
  ratioDisplay.textContent = "0% M / 0% F";
 }

 const nominalManHours = totalHeadcount * workingDays * hoursPerDay;
 const absentHoursDeduction = totalDaysAbsent * hoursPerDay;
 const trueEstimatedHours = Math.max(0, nominalManHours - absentHoursDeduction);
 
 const holidayDeficitDays = Math.max(0, operationalWeekdays - workingDays);
 const holidayLostHours = totalHeadcount * holidayDeficitDays * hoursPerDay;

 totalDisplay.textContent = totalHeadcount.toString().padStart(3, '0');
 manHoursDisplay.textContent = trueEstimatedHours.toLocaleString() + 'h';
 lostHoursDisplay.textContent = holidayLostHours.toLocaleString() + 'h';
 absentHoursDisplay.textContent = absentHoursDeduction.toLocaleString() + 'h';
}

function updateClockEngine() {
 const timeObj = new Date();
 clockDisplay.textContent = timeObj.getHours().toString().padStart(2, '0') + ":" + timeObj.getMinutes().toString().padStart(2, '0') + ":" + timeObj.getSeconds().toString().padStart(2, '0') + " PST";
 dateDisplay.textContent = timeObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function exportMetrics() {
 const csvRows = [
  ["========================================================================="],
  [" ARCADIA x ENGIE - AUDITED OPERATIONS REPORT"],
  ["========================================================================="],
  ["Generation Date", dateDisplay.textContent],
  ["Generation Time", clockDisplay.textContent],
  ["Timeline Mode", timeFilter.value],
  [],
  ["1. HEADCOUNT & DEMOGRAPHICS SUMMARY"],
  ["-------------------------------------------------------------------------"],
  ["Total Dynamic Headcount", totalDisplay.textContent + " Personnel"],
  ["Male Count Allocation", maleInput.value || 0],
  ["Female Count Allocation", femaleInput.value || 0],
  ["Gender Diversity Ratio", ratioDisplay.textContent],
  [],
  ["2. AUDITED OPERATIONAL MAN-HOURS MATRIX"],
  ["-------------------------------------------------------------------------"],
  ["Shift Length Base Baseline", multiplierInput.value + " Hours/Day"],
  ["Gross Estimated Work Hours", (parseInt(totalDisplay.textContent) * getWorkingDaysCount(timeFilter.value) * parseInt(multiplierInput.value)).toLocaleString() + " Hours"],
  ["Absentee Days Logged", absentInput.value || 0],
  ["Deducted Absentee Hours Loss", absentHoursDisplay.textContent],
  ["Net Productive Yield Hours", manHoursDisplay.textContent],
  ["Weekday Holiday Deficit Loss", lostHoursDisplay.textContent],
  ["========================================================================="]
 ];
 const csvContent = csvRows.map(row => row.map(val => '"' + val.toString().replace(/"/g, '""') + '"').join(",")).join("\n");
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement("a");
 link.setAttribute("href", URL.createObjectURL(blob));
 link.setAttribute("download", "Arcadia_Audited_Report_" + timeFilter.value + ".csv");
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
 updateClockEngine();
 setInterval(updateClockEngine, 1000);
 timeFilter.addEventListener('change', calculateMetrics);
 maleInput.addEventListener('input', calculateMetrics);
 femaleInput.addEventListener('input', calculateMetrics);
 absentInput.addEventListener('input', calculateMetrics);
 multiplierInput.addEventListener('input', calculateMetrics);
 document.getElementById('action-export').addEventListener('click', exportMetrics);
 document.getElementById('action-reset').addEventListener('click', resetForm);
 calculateMetrics();
});
