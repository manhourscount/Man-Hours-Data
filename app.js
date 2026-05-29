// ==========================================
// 1. GLOBAL ELEMENT SELECTORS & DATABASES
// ==========================================
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

// Performance Chart Component Selectors
const chartEfficiencyLabel = document.getElementById('chart-efficiency-label');
const chartEfficiencyBar = document.getElementById('chart-efficiency-bar');
const chartLossLabel = document.getElementById('chart-loss-label');
const chartLossBar = document.getElementById('chart-loss-bar');

// 2026 Public Philippine Holidays Calendar
const phHolidays2026 = {
 "1-1": "New Year's Day", "2-17": "Chinese New Year", "3-20": "Eid'l Fitr",
 "4-2": "Maundy Thursday", "4-3": "Good Friday", "4-4": "Black Saturday",
 "4-9": "Araw ng Kagitingan", "5-1": "Labor Day", "5-27": "Eid'l Adha", "6-12": "Independence Day",
 "8-21": "Ninoy Aquino Day", "8-31": "National Heroes Day", "11-1": "All Saints' Day",
 "11-2": "All Souls' Day", "11-30": "Bonifacio Day", "12-8": "Feast of the Immaculate Conception",
 "12-24": "Christmas Eve", "12-25": "Christmas Day", "12-30": "Rizal Day", "12-31": "Last Day of the Year"
};

// Connect directly to the external data array structure
const dashboardDb = typeof dashboardData !== 'undefined' ? dashboardData : {};

// ==========================================
// 2. TIMELINE RANGE DATE CALCULATORS
// ==========================================
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
 if (dayOfWeek === 0 || dayOfWeek === 6) return { isHoliday: true, name: "Weekend" };
 const monthDayKey = (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
 if (phHolidays2026[monthDayKey]) return { isHoliday: true, name: phHolidays2026[monthDayKey] };
 return { isHoliday: false, name: "Working Day" };
}
// ==========================================
// 3. MAIN INDICATOR METRICS ENGINE
// ==========================================
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
   if (statusBadge) {
     statusBadge.className = "status-badge";
     statusBadge.textContent = "System Active";
   }
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
 if (mode === 'LIVE' && dayCheck.isHoliday) {
   workingDays = 0;
 }

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

 if(chartEfficiencyLabel) chartEfficiencyLabel.textContent = efficiencyPercentage + "%";
 if(chartEfficiencyBar) chartEfficiencyBar.style.width = efficiencyPercentage + "%";
 if(chartLossLabel) chartLossLabel.textContent = lossPercentage + "%";
 if(chartLossBar) chartLossBar.style.width = lossPercentage + "%";
}

// ==========================================
// ARCADIA EXECUTIVE ENGINE (EMBEDDED HIGH-SCALE LOGO)
// ==========================================
function exportMetrics() {
  const mode = timeFilter.value;
  let periodName = mode;
  
  if (mode.startsWith('M-')) {
    const selectedOption = timeFilter.options[timeFilter.selectedIndex];
    periodName = selectedOption.text + " 2026";
  }

  // Fetch interface data strings safely
  const totalStaff = totalDisplay ? totalDisplay.textContent : "0";
  const genderRatio = ratioDisplay ? ratioDisplay.textContent : "0% M / 0% F";
  const estimatedHours = manHoursDisplay ? manHoursDisplay.textContent : "0h";
  const calendarLoss = lostHoursDisplay ? lostHoursDisplay.textContent : "0h";
  const absenceLoss = absentHoursDisplay ? absentHoursDisplay.textContent : "0h";
  const dayType = dayTypeStamp ? dayTypeStamp.textContent : "WORKING DAY";
  const shiftAvg = multiplierInput ? multiplierInput.value + " Hours" : "8 Hours";
  const generationTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) + " PHT";
  const efficiencyPct = chartEfficiencyLabel ? chartEfficiencyLabel.textContent : "100%";
  const lossPct = chartLossLabel ? chartLossLabel.textContent : "0%";

  // 1. Unified Binary Asset Pipeline Stream: Fetches your local logo.png file dynamically
  fetch('logo.png')
    .then(response => {
      if (!response.ok) throw new Error("Local logo file access handshake failed.");
      return response.blob();
    })
    .then(blob => {
      const reader = new FileReader();
      reader.onloadend = function () {
        compileExecutiveExcel(reader.result);
      }
      reader.readAsDataURL(blob);
    })
    .catch(err => {
      console.warn("Local data container isolated. Utilizing dynamic vector text block wrapper fallback.", err);
      compileExecutiveExcel(null);
    });

  // 2. Structural spreadsheet assembly processing pipeline
  function compileExecutiveExcel(embeddedLogoBase64) {
    let logoMarkupElement = `<div style="color: #2dd4bf; font-weight: bold; font-size: 32px; font-family: 'Segoe UI', sans-serif;">ARCADIA x ENGIE MAN-HOURS DATA</div>`;
    
    // Inject image container layout if file data transforms successfully
    if (embeddedLogoBase64) {
      logoMarkupElement = `<img src="${embeddedLogoBase64}" alt="Arcadia Logo" height="52" style="height: 52px; width: auto; display: block; border: 0; margin-bottom: 4px;"/>`;
    }

    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Operations Summary</x:Name>
                <x:WorksheetOptions>
                  <x:ShowGridLines>False</x:ShowGridLines>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { background-color: #ffffff; margin: 0; padding: 30px; }
          
          /* FIXED ACCESSIBILITY AND TYPOGRAPHIC SCALING RULES */
          td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; vertical-align: middle; color: #334155; }
          
          /* SYSTEM BRANDING BANNER ELEMENT */
          .title-banner { background-color: #1e293b; padding: 35px 25px; text-align: left; border: 1px solid #1e293b; }
          .subtitle-text { color: #ffffff; font-size: 18px; font-family: 'Segoe UI', sans-serif; margin-top: 8px; font-weight: normal; }
          
          /* CONNECTING ROW METADATA STRUCTURE (COVERS ROWS 4, 5, 6 BOTH COLUMNS) */
          .meta-label { color: #64748b; font-style: italic; font-size: 16px; border-bottom: 1px solid #cbd5e1; border-left: 1px solid #cbd5e1; padding-left: 15px; background-color: #ffffff; }
          .meta-value { color: #1e293b; font-weight: bold; font-size: 16px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding-left: 10px; background-color: #ffffff; }
          
          /* DYNAMIC CORE GRID ARCHITECTURE RULES */
          .table-header { background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 18px; border: 1px solid #0f766e; text-align: left; padding-left: 15px; }
          .table-header-center { background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 18px; border: 1px solid #0f766e; text-align: center; }
          .data-cell { border: 1px solid #cbd5e1; padding-left: 15px; font-size: 16px; background-color: #ffffff; color: #334155; }
          .num-cell { font-weight: bold; text-align: center; border: 1px solid #cbd5e1; font-size: 16px; color: #0f172a; background-color: #ffffff; }
          
          /* PERFORMANCE AND DEDUCTION RANGES */
          .success-cell { background-color: #f0fdf4; color: #166534; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; font-size: 16px; }
          .loss-cell { background-color: #fef2f2; color: #991b1b; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; font-size: 16px; }
          
          /* DOUBLE UNDERLINE SUMMARY TOTAL CONTAINER BLOCK */
          .summary-label { color: #0f172a; font-weight: bold; font-size: 16px; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-top: 2px solid #94a3b8; border-bottom: 5px double #0f172a; background-color: #ffffff; padding-left: 15px; }
          .summary-value { background-color: #fef2f2; color: #991b1b; font-weight: bold; text-align: center; font-size: 16px; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-top: 2px solid #94a3b8; border-bottom: 5px double #0f172a; }
        </style>
      </head>
      <body>
        <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #ffffff; width: 750px;">
          <col width="450" style="width: 450pt;"></col>
          <col width="300" style="width: 300pt;"></col>
          
          <!-- Large Header Title Banner -->
          <tr height="120" style="height: 90pt;">
            <td colspan="2" class="title-banner">
              ${logoMarkupElement}
              <div class="subtitle-text">Operational Metrics Dashboard Management Report</div>
            </td>
          </tr>
          
          <tr height="20" style="height: 15pt;"><td colspan="2" style="background-color: #ffffff;"></td></tr>
          
          <!-- Corporate Overview Metadata Blocks (Horizontal Linking Intact) -->
          <tr height="38" style="height: 28pt;">
            <td class="meta-label">Selected Framework Period:</td>
            <td class="meta-value">${periodName}</td>
          </tr>
          <tr height="38" style="height: 28pt;">
            <td class="meta-label">Calendar Day-Type Status:</td>
            <td class="meta-value">${dayType}</td>
          </tr>
          <tr height="38" style="height: 28pt;">
            <td class="meta-label">Report Extraction Timestamp:</td>
            <td class="meta-value">${generationTime}</td>
          </tr>
          
          <tr height="25" style="height: 18pt;"><td colspan="2" style="background-color: #ffffff;"></td></tr>
          
          <!-- Column Label Matrix Headers -->
          <tr height="45" style="height: 34pt;">
            <td class="table-header">Operational Metric Parameter</td>
            <td class="table-header-center">Current Aggregation</td>
          </tr>
          
          <!-- Primary Data Streams -->
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Total Active Workforce Headcount</td>
            <td class="num-cell">${totalStaff}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Gender Balance Distribution Split</td>
            <td class="num-cell">${genderRatio}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Average Shift Multiplier Length</td>
            <td class="num-cell">${shiftAvg}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">True Estimated Productive Man-Hours</td>
            <td class="num-cell">${estimatedHours}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Calculated Labor Efficiency Rating</td>
            <td class="success-cell">${efficiencyPct}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Calendar Deficit Hours Lost (Holidays/Weekends)</td>
            <td class="loss-cell">${calendarLoss}</td>
          </tr>
          <tr height="36" style="height: 27pt;">
            <td class="data-cell">Absenteeism Resource Hours Lost</td>
            <td class="loss-cell">${absenceLoss}</td>
          </tr>
          
          <!-- Accounting Final Core Total Row -->
          <tr height="42" style="height: 31pt;">
            <td class="summary-label">Cumulative Structural Deficit Loss Rate</td>
            <td class="summary-value">${lossPct}</td>
          </tr>
        </table>
      </body>
      </html>`;

    // Package stream array variables with an explicit UTF-8 BOM encoding map 
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const downloadLink = document.createElement("a");
    const cleanFileName = `Arcadia_Executive_Report_${periodName.replace(/\s+/g, '_')}.xls`;

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, cleanFileName);
    } else {
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.setAttribute("download", cleanFileName);
      document.body.appendChild(downloadLink);
      downloadLink.click();
document.body.removeChild(downloadLink);}}}

// ==========================================
// 4. DATA SYNC LAYER & APP INITIALIZATION
// ==========================================
function updateClockEngine() {
  const clockDisplay = document.getElementById('live-clock');
  const dateDisplay = document.getElementById('current-date');
  
  if (!clockDisplay || !dateDisplay) return;
  
  const timeObj = new Date();
  clockDisplay.textContent = timeObj.getHours().toString().padStart(2, '0') + ":" + 
                             timeObj.getMinutes().toString().padStart(2, '0') + ":" + 
                             timeObj.getSeconds().toString().padStart(2, '0') + " PST";
  dateDisplay.textContent = timeObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function loadActiveFilterData() {
  if (typeof dashboardDb === 'undefined' || !timeFilter) return;
  const currentMode = timeFilter.value;
  const currentMonthIdx = new Date().getMonth(); // Automatically finds current month (e.g., 4 for May)
  
  let targetMale = 0;
  let targetFemale = 0;
  let targetAbsent = 0;
  let targetShift = 8;

  if (currentMode === 'LIVE' || currentMode === 'MTD') {
    // 1. LIVE & MTD mirror the current active month's parameters automatically
    const currentMonthKey = `M-${currentMonthIdx}`;
    const activeData = dashboardDb[currentMonthKey] || { male: 223, female: 228, absentDays: 0, shiftLength: 8 };
    
    targetMale = activeData.male;
    targetFemale = activeData.female;
    targetAbsent = activeData.absentDays;
    targetShift = activeData.shiftLength;

  } else if (currentMode === 'YTD') {
    // 2. YTD uses current workforce sizes but sums up ALL absent days from Jan up to now
    const currentMonthKey = `M-${currentMonthIdx}`;
    const activeData = dashboardDb[currentMonthKey] || { male: 223, female: 228, shiftLength: 8 };
    
    targetMale = activeData.male;
    targetFemale = activeData.female;
    targetShift = activeData.shiftLength;
    
    // Total up cumulative absences across all elapsed months
    targetAbsent = 0;
    for (let i = 0; i <= currentMonthIdx; i++) {
      if (dashboardDb[`M-${i}`]) {
        targetAbsent += dashboardDb[`M-${i}`].absentDays || 0;
      }
    }

  } else {
    // 3. Standard specific archive month selection (M-0 to M-11)
    if (!dashboardDb[currentMode]) {
      dashboardDb[currentMode] = { male: 223, female: 228, absentDays: 0, shiftLength: 8 };
    }
    const activeData = dashboardDb[currentMode];
    targetMale = activeData.male;
    targetFemale = activeData.female;
    targetAbsent = activeData.absentDays;
    targetShift = activeData.shiftLength;
  }
  
  // Assign compiled calculations directly to layout fields
  if (maleInput) maleInput.value = targetMale;
  if (femaleInput) femaleInput.value = targetFemale;
  if (absentInput) absentInput.value = targetAbsent;
  if (multiplierInput) multiplierInput.value = targetShift;
}

function syncInputFieldsToStorage() {
  if (typeof dashboardDb === 'undefined' || !timeFilter) return;
  const currentMode = timeFilter.value;
  
  // Map live updates back to the true monthly index array
  let targetMode = currentMode;
  if (currentMode === 'LIVE' || currentMode === 'MTD') {
    targetMode = `M-${new Date().getMonth()}`;
  }

  // YTD is an aggregate summary view, blocking manual rewrite loops
  if (currentMode === 'YTD') return;

  dashboardDb[targetMode] = {
    male: parseInt(maleInput.value) || 0,
    female: parseInt(femaleInput.value) || 0,
    absentDays: parseInt(absentInput.value) || 0,
    shiftLength: parseInt(multiplierInput.value) || 8
  };
  
  calculateMetrics();
}

document.addEventListener('DOMContentLoaded', () => {
  updateClockEngine();
  setInterval(updateClockEngine, 1000);
 
  loadActiveFilterData();

  if (maleInput) maleInput.addEventListener('input', syncInputFieldsToStorage);
  if (femaleInput) femaleInput.addEventListener('input', syncInputFieldsToStorage);
  if (absentInput) absentInput.addEventListener('input', syncInputFieldsToStorage);
  if (multiplierInput) multiplierInput.addEventListener('input', syncInputFieldsToStorage);

  if (timeFilter) {
    timeFilter.addEventListener('change', () => {
      loadActiveFilterData();
      calculateMetrics();
    });
  }

  const exportBtn = document.getElementById('action-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (typeof exportMetrics === 'function') {
        exportMetrics();
      }
    });
  }
 
  setTimeout(calculateMetrics, 20);
});
