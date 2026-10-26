// =========================================================================
// Andhra Pradesh Police - Srikakulam District Crime Review Portal
// Superintended of Police Crime Meeting Dashboard & Reporting Engine
// =========================================================================

let appData = {
  kpis: {},
  station_stats: [],
  crime_statistics: [],
  ui_cases: [],
  long_pending_ui: [],
  ps_reported: [],
  ps_progress: []
};

// UI Cases Filter & Pagination State
let filteredUICases = [];
let currentPage = 1;
let pageSize = 25;
let charts = {};

// ================= AUTHENTICATION =================
function checkAuth() {
  const isAuth = sessionStorage.getItem('sklm_auth') === 'true';
  const loginScreen = document.getElementById('loginScreen');
  if (isAuth) {
    loginScreen.classList.add('hidden');
  } else {
    loginScreen.classList.remove('hidden');
  }
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const err = document.getElementById('loginError');

  // Accept admin / sp@sklm or standard authorized logins
  if ((u.toLowerCase() === 'admin' || u.toLowerCase() === 'sp' || u.toLowerCase() === 'dcrb') && 
      (p === 'sp@sklm' || p === 'admin123' || p === 'police')) {
    sessionStorage.setItem('sklm_auth', 'true');
    sessionStorage.setItem('sklm_user', u);
    err.classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
  } else {
    err.classList.remove('hidden');
  }
}

function quickFillLogin() {
  document.getElementById('loginUser').value = 'admin';
  document.getElementById('loginPass').value = 'sp@sklm';
  document.getElementById('loginError').classList.add('hidden');
}

function togglePassVisibility() {
  const passInput = document.getElementById('loginPass');
  const icon = document.getElementById('passToggleIcon');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    passInput.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to lock the portal and logout?')) {
    sessionStorage.removeItem('sklm_auth');
    sessionStorage.removeItem('sklm_user');
    document.getElementById('loginScreen').classList.remove('hidden');
  }
}

// Live Clock
function updateClock() {
  const clockEl = document.getElementById('liveClock');
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + 
      ' | ' + now.toLocaleTimeString('en-IN', { hour12: false });
  }
}
setInterval(updateClock, 1000);

// ================= DATA LOADING =================
function initData() {
  if (window.CRIME_DATA) {
    appData = window.CRIME_DATA;
    onDataLoaded();
  } else {
    // Fallback: try fetching json if bundle not directly attached
    fetch('data/kpis.json')
      .then(res => res.json())
      .then(kpis => {
        appData.kpis = kpis;
        return Promise.all([
          fetch('data/station_stats.json').then(r => r.json()),
          fetch('data/crime_statistics.json').then(r => r.json()),
          fetch('data/ui_cases.json').then(r => r.json()),
          fetch('data/long_pending_ui.json').then(r => r.json()),
          fetch('data/ps_reported.json').then(r => r.json()),
          fetch('data/ps_progress.json').then(r => r.json())
        ]);
      })
      .then(([st, cs, ui, lp, rep, prog]) => {
        appData.station_stats = st;
        appData.crime_statistics = cs;
        appData.ui_cases = ui;
        appData.long_pending_ui = lp;
        appData.ps_reported = rep;
        appData.ps_progress = prog;
        onDataLoaded();
      })
      .catch(err => {
        console.error('Error loading police data:', err);
      });
  }
}

function onDataLoaded() {
  updateOverviewKPIs();
  populateDropdowns();
  initOverviewCharts();
  renderOverviewStationTable();
  renderCrimeStatsTable();
  
  filteredUICases = [...appData.ui_cases];
  renderUICasesTable();
  
  renderLongPendingTable();
  renderComplianceTable();
  renderStationDossier();
  updatePresentationSlide();
}

// ================= TAB NAVIGATION =================
function switchTab(tabId) {
  const tabs = ['dashboard', 'crime_stats', 'ui_cases', 'long_pending', 'compliance', 'ps_dossier', 'presentation', 'export_hub'];
  
  tabs.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    if (sec && btn) {
      if (t === tabId) {
        sec.classList.remove('hidden');
        btn.classList.add('active');
        btn.classList.remove('text-slate-300');
      } else {
        sec.classList.add('hidden');
        btn.classList.remove('active');
        btn.classList.add('text-slate-300');
      }
    }
  });

  // Re-render chart sizes if needed
  if (tabId === 'dashboard') {
    Object.values(charts).forEach(c => c && c.resize && c.resize());
  }
}

// ================= TAB 1: OVERVIEW & CHARTS =================
function updateOverviewKPIs() {
  const k = appData.kpis;
  if (!k) return;
  document.getElementById('kpiTotalReported').innerText = (k.total_reported || 68206).toLocaleString();
  document.getElementById('kpiTotalUI').innerText = (appData.ui_cases.length || 2597).toLocaleString();
  document.getElementById('kpiActualUI').innerText = (k.actual_ui || 1855).toLocaleString();
  document.getElementById('kpiLongPending').innerText = (appData.long_pending_ui.length || 397).toLocaleString();
  document.getElementById('kpiGrave').innerText = (k.grave_ui || 150).toLocaleString();
  document.getElementById('kpiNonGrave').innerText = (k.non_grave_ui || 2447).toLocaleString();
  document.getElementById('kpiCCAwaited').innerText = (k.cc_prc_awaited || 742).toLocaleString();
}

function initOverviewCharts() {
  // Chart 1: Crime Classifications
  const classCounts = {};
  appData.ui_cases.forEach(c => {
    const cls = c.classification || 'Other';
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  });
  const sortedClasses = Object.entries(classCounts).sort((a,b) => b[1] - a[1]).slice(0, 7);

  const ctxClass = document.getElementById('crimeClassChart');
  if (ctxClass) {
    if (charts.crimeClass) charts.crimeClass.destroy();
    charts.crimeClass = new Chart(ctxClass, {
      type: 'bar',
      data: {
        labels: sortedClasses.map(x => x[0]),
        datasets: [{
          label: 'UI Cases',
          data: sortedClasses.map(x => x[1]),
          backgroundColor: '#3b82f6',
          borderColor: '#ffd700',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
        }
      }
    });
  }

  // Chart 2: Aging / Timeline
  const timeCounts = {
    'Above 1 Year': 0,
    'Above 6 Months': 0,
    'Above 3 Months': 0,
    'Above 60 Days': 0,
    'Below 60 Days': 0
  };
  appData.ui_cases.forEach(c => {
    const tl = c.timeline || '';
    if (tl.includes('Above 1 Year')) timeCounts['Above 1 Year']++;
    else if (tl.includes('Above 6 Months')) timeCounts['Above 6 Months']++;
    else if (tl.includes('Above 3 Months')) timeCounts['Above 3 Months']++;
    else if (tl.includes('Above 60 Days')) timeCounts['Above 60 Days']++;
    else timeCounts['Below 60 Days']++;
  });

  const ctxTimeline = document.getElementById('timelineChart');
  if (ctxTimeline) {
    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart(ctxTimeline, {
      type: 'doughnut',
      data: {
        labels: Object.keys(timeCounts),
        datasets: [{
          data: Object.values(timeCounts),
          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'],
          borderColor: '#0c1e3d',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#f1f5f9', font: { size: 11 } } }
        }
      }
    });
  }

  // Chart 3: Top 10 Stations with Highest Pending
  const topStations = [...appData.station_stats]
    .sort((a,b) => b.total_ui - a.total_ui)
    .slice(0, 10);

  const ctxStations = document.getElementById('topStationsChart');
  if (ctxStations) {
    if (charts.topStations) charts.topStations.destroy();
    charts.topStations = new Chart(ctxStations, {
      type: 'bar',
      data: {
        labels: topStations.map(s => s.ps),
        datasets: [{
          label: 'Total UI Cases',
          data: topStations.map(s => s.total_ui),
          backgroundColor: '#d4af37',
          borderColor: '#ffd700',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#f1f5f9', font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // Chart 4: Top Delay Reasons
  const reasonsMap = {};
  appData.ui_cases.forEach(c => {
    const r = c.reason_for_ui || 'Other';
    reasonsMap[r] = (reasonsMap[r] || 0) + 1;
  });
  const topReasons = Object.entries(reasonsMap).sort((a,b) => b[1] - a[1]).slice(0, 6);

  const ctxReasons = document.getElementById('reasonsChart');
  if (ctxReasons) {
    if (charts.reasons) charts.reasons.destroy();
    charts.reasons = new Chart(ctxReasons, {
      type: 'bar',
      data: {
        labels: topReasons.map(x => x[0].length > 20 ? x[0].substring(0, 20) + '...' : x[0]),
        datasets: [{
          label: 'Cases Pending',
          data: topReasons.map(x => x[1]),
          backgroundColor: '#8b5cf6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
        }
      }
    });
  }
}

function renderOverviewStationTable() {
  const tbody = document.getElementById('overviewStationTableBody');
  if (!tbody) return;

  const subDivFilter = document.getElementById('overviewSubDivSelect').value;
  let list = [...appData.station_stats];

  if (subDivFilter !== 'ALL') {
    list = list.filter(s => s.sub_division === subDivFilter);
  }

  list.sort((a,b) => b.total_ui - a.total_ui);

  tbody.innerHTML = list.map((st, i) => `
    <tr class="hover:bg-slate-800/60 transition">
      <td class="py-2.5 px-3 font-bold text-white flex items-center gap-2">
        <span class="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-400 font-mono">${i+1}</span>
        <span>${st.ps}</span>
      </td>
      <td class="py-2.5 px-3 text-slate-400 text-[11px]">${st.sub_division}</td>
      <td class="py-2.5 px-3 text-center font-bold text-blue-400 font-mono">${st.total_ui}</td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-1.5 py-0.5 rounded text-[10px] ${st.grave > 0 ? 'bg-red-900/60 text-red-300 border border-red-700' : 'text-slate-500'} font-mono font-bold">${st.grave}</span>
      </td>
      <td class="py-2.5 px-3 text-center text-slate-300 font-mono">${st.non_grave}</td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-1.5 py-0.5 rounded text-[10px] ${st.above_1yr > 15 ? 'bg-red-900/60 text-red-300 border border-red-700' : 'bg-slate-800 text-slate-300'} font-mono">${st.above_1yr}</span>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-1.5 py-0.5 rounded text-[10px] ${st.long_pending > 10 ? 'bg-amber-900/60 text-amber-300 border border-amber-700 font-bold' : 'text-slate-400'} font-mono">${st.long_pending}</span>
      </td>
      <td class="py-2.5 px-3 text-center text-purple-300 font-mono">${st.cc_awaited}</td>
      <td class="py-2.5 px-3 text-center">
        <button onclick="viewStationFromOverview('${st.ps}')" class="px-2 py-1 bg-[#163264] hover:bg-[#1e4282] text-amber-300 text-[11px] rounded border border-[#ffd700]/40 transition">
          Dossier
        </button>
      </td>
    </tr>
  `).join('');
}

function filterOverview() {
  renderOverviewStationTable();
}

function viewStationFromOverview(psName) {
  const sel = document.getElementById('dossierStationSelect');
  if (sel) {
    sel.value = psName;
    renderStationDossier();
    switchTab('ps_dossier');
  }
}

// ================= TAB 2: CRIME STATISTICS (2024-2026) =================
function renderCrimeStatsTable() {
  const tbody = document.getElementById('crimeStatsTableBody');
  if (!tbody) return;

  const q = (document.getElementById('crimeHeadSearchInput')?.value || '').toLowerCase();
  let list = appData.crime_statistics || [];

  if (q) {
    list = list.filter(r => r.head.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }

  tbody.innerHTML = list.map((r, i) => {
    const isTotal = r.sno.toLowerCase().includes('total');
    const p1 = r.pct_24_25;
    const p2 = r.pct_25_26;

    const p1Badge = p1 > 0 
      ? `<span class="px-1.5 py-0.5 bg-red-900/60 text-red-300 rounded border border-red-700 font-mono font-semibold">+${p1}% <i class="fa-solid fa-arrow-up text-[9px]"></i></span>`
      : `<span class="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700 font-mono font-semibold">${p1}% <i class="fa-solid fa-arrow-down text-[9px]"></i></span>`;

    const p2Badge = p2 > 0 
      ? `<span class="px-1.5 py-0.5 bg-red-900/60 text-red-300 rounded border border-red-700 font-mono font-semibold">+${p2}% <i class="fa-solid fa-arrow-up text-[9px]"></i></span>`
      : `<span class="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700 font-mono font-semibold">${p2}% <i class="fa-solid fa-arrow-down text-[9px]"></i></span>`;

    const rowClass = isTotal ? 'bg-[#0f244a] font-bold text-amber-300 border-y-2 border-[#ffd700]' : 'hover:bg-slate-800/60';

    return `
      <tr class="${rowClass} transition">
        <td class="py-2.5 px-3 font-mono">${r.sno}</td>
        <td class="py-2.5 px-3 font-semibold ${isTotal ? 'text-amber-300' : 'text-white'}">${r.head}</td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px]">${r.category || '-'}</td>
        <td class="py-2.5 px-3 text-center font-mono">${r.y2024.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-center font-mono">${r.y2025.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-amber-300">${r.y2026.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-center">${p1Badge}</td>
        <td class="py-2.5 px-3 text-center">${p2Badge}</td>
      </tr>
    `;
  }).join('');
}

// ================= DROPDOWNS POPULATION =================
function populateDropdowns() {
  const psSet = new Set();
  appData.ui_cases.forEach(c => c.ps && psSet.add(c.ps));
  const sortedPS = Array.from(psSet).sort();

  // Filter PS dropdown
  const filterPS = document.getElementById('filterPS');
  if (filterPS) {
    sortedPS.forEach(ps => {
      const opt = document.createElement('option');
      opt.value = ps;
      opt.innerText = ps;
      filterPS.appendChild(opt);
    });
  }

  // Long Pending PS filter
  const lpPS = document.getElementById('longPendingStationFilter');
  if (lpPS) {
    sortedPS.forEach(ps => {
      const opt = document.createElement('option');
      opt.value = ps;
      opt.innerText = ps;
      lpPS.appendChild(opt);
    });
  }

  // Dossier PS dropdown
  const dosPS = document.getElementById('dossierStationSelect');
  if (dosPS) {
    dosPS.innerHTML = '';
    sortedPS.forEach(ps => {
      const opt = document.createElement('option');
      opt.value = ps;
      opt.innerText = ps;
      dosPS.appendChild(opt);
    });
  }

  // Presentation PS dropdown
  const presPS = document.getElementById('presentationPSSelect');
  if (presPS) {
    presPS.innerHTML = '';
    sortedPS.forEach(ps => {
      const opt = document.createElement('option');
      opt.value = ps;
      opt.innerText = 'Station: ' + ps;
      presPS.appendChild(opt);
    });
  }
}

// ================= TAB 3: UI CASES EXPLORER =================
function applyUIFilters() {
  const ps = document.getElementById('filterPS').value;
  const subDiv = document.getElementById('filterSubDiv').value;
  const gravity = document.getElementById('filterGravity').value;
  const timeline = document.getElementById('filterTimeline').value;
  const reason = document.getElementById('filterReason').value;
  const kw = (document.getElementById('filterKeyword').value || '').toLowerCase().trim();

  filteredUICases = appData.ui_cases.filter(c => {
    if (ps !== 'ALL' && c.ps !== ps) return false;
    if (subDiv !== 'ALL' && c.sub_division !== subDiv) return false;
    if (gravity !== 'ALL' && c.gravity !== gravity) return false;
    if (timeline !== 'ALL' && !String(c.timeline).includes(timeline)) return false;
    if (reason !== 'ALL' && !String(c.reason_for_ui).toLowerCase().includes(reason.toLowerCase())) return false;
    
    if (kw) {
      const match = (
        String(c.fir_no).toLowerCase().includes(kw) ||
        String(c.sec_of_law).toLowerCase().includes(kw) ||
        String(c.io_name).toLowerCase().includes(kw) ||
        String(c.crime_head).toLowerCase().includes(kw) ||
        String(c.ps).toLowerCase().includes(kw) ||
        String(c.brief).toLowerCase().includes(kw)
      );
      if (!match) return false;
    }
    return true;
  });

  currentPage = 1;
  renderUICasesTable();
}

function resetUIFilters() {
  document.getElementById('filterPS').value = 'ALL';
  document.getElementById('filterSubDiv').value = 'ALL';
  document.getElementById('filterGravity').value = 'ALL';
  document.getElementById('filterTimeline').value = 'ALL';
  document.getElementById('filterReason').value = 'ALL';
  document.getElementById('filterKeyword').value = '';
  applyUIFilters();
}

function changePageSize() {
  pageSize = parseInt(document.getElementById('pageSizeSelect').value, 10);
  currentPage = 1;
  renderUICasesTable();
}

function renderUICasesTable() {
  const tbody = document.getElementById('uiCasesTableBody');
  if (!tbody) return;

  const total = filteredUICases.length;
  document.getElementById('filteredCount').innerText = total.toLocaleString();

  const totalPages = Math.ceil(total / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = filteredUICases.slice(start, end);

  tbody.innerHTML = pageItems.map((c, i) => {
    const isGrave = String(c.gravity).toLowerCase() === 'grave';
    const isOld = String(c.timeline).includes('Above 1 Year');

    return `
      <tr class="hover:bg-slate-800/60 transition cursor-pointer" onclick="openCaseModal(${c.id})">
        <td class="py-2.5 px-3 font-mono text-slate-400">${start + i + 1}</td>
        <td class="py-2.5 px-3 font-bold text-white">${c.ps}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-amber-300">${c.fir_no}</td>
        <td class="py-2.5 px-3 text-slate-300">${c.fir_date || '-'}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300 max-w-[180px] truncate" title="${c.sec_of_law || ''}">${c.sec_of_law || '-'}</td>
        <td class="py-2.5 px-3 text-slate-200">${c.crime_head || '-'}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isGrave ? 'badge-grave' : 'badge-nongrave'}">
            ${c.gravity || 'Non-Grave'}
          </span>
        </td>
        <td class="py-2.5 px-3 text-slate-300 text-[11px]">${c.io_name || 'SHO'}</td>
        <td class="py-2.5 px-3 text-slate-300 max-w-[200px] truncate text-[11px]" title="${c.reason_for_ui || ''}">${c.reason_for_ui || '-'}</td>
        <td class="py-2.5 px-3 text-center font-mono ${isOld ? 'text-red-400 font-bold' : 'text-slate-300'}">${c.days_pending || '-'}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-1.5 py-0.5 rounded text-[10px] ${isOld ? 'badge-timeline-old' : 'badge-timeline-recent'}">
            ${c.timeline || '-'}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center" onclick="event.stopPropagation()">
          <button onclick="openCaseModal(${c.id})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[#ffd700] rounded border border-slate-600 text-[11px]">
            <i class="fa-regular fa-file-lines"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Pagination UI
  document.getElementById('paginationInfo').innerText = `Showing ${start + 1} to ${end} of ${total} cases (Page ${currentPage} of ${totalPages})`;
  
  const btnContainer = document.getElementById('paginationButtons');
  let btns = '';
  btns += `<button onclick="goToPage(1)" ${currentPage===1?'disabled':''} class="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded border border-slate-700"><i class="fa-solid fa-angles-left"></i></button>`;
  btns += `<button onclick="goToPage(${currentPage-1})" ${currentPage===1?'disabled':''} class="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded border border-slate-700"><i class="fa-solid fa-angle-left"></i></button>`;
  btns += `<span class="px-3 py-1 bg-slate-900 text-amber-300 font-bold text-xs rounded border border-slate-700">Page ${currentPage} / ${totalPages}</span>`;
  btns += `<button onclick="goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''} class="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded border border-slate-700"><i class="fa-solid fa-angle-right"></i></button>`;
  btns += `<button onclick="goToPage(${totalPages})" ${currentPage===totalPages?'disabled':''} class="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded border border-slate-700"><i class="fa-solid fa-angles-right"></i></button>`;
  btnContainer.innerHTML = btns;
}

function goToPage(p) {
  const totalPages = Math.ceil(filteredUICases.length / pageSize) || 1;
  if (p >= 1 && p <= totalPages) {
    currentPage = p;
    renderUICasesTable();
  }
}

// ================= TAB 4: LONG PENDING CASES =================
function renderLongPendingTable() {
  const tbody = document.getElementById('longPendingTableBody');
  if (!tbody) return;

  const stFilter = document.getElementById('longPendingStationFilter')?.value || 'ALL';
  let list = [...appData.long_pending_ui];

  if (stFilter !== 'ALL') {
    list = list.filter(c => c.ps === stFilter);
  }

  // Sort descending by days pending
  list.sort((a,b) => (b.days_pending || 0) - (a.days_pending || 0));

  tbody.innerHTML = list.map((c, i) => {
    const isGrave = String(c.gravity).toLowerCase() === 'grave';
    return `
      <tr class="hover:bg-slate-800/60 transition cursor-pointer" onclick="openCaseModal(${c.id})">
        <td class="py-2.5 px-3 font-mono text-slate-400">${i + 1}</td>
        <td class="py-2.5 px-3 font-bold text-white">${c.ps}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-red-400">${c.fir_no}</td>
        <td class="py-2.5 px-3 text-slate-300">${c.fir_date || '-'}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300 max-w-[180px] truncate" title="${c.sec_of_law || ''}">${c.sec_of_law || '-'}</td>
        <td class="py-2.5 px-3 text-slate-200">${c.crime_head || '-'}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isGrave ? 'badge-grave' : 'badge-nongrave'}">
            ${c.gravity || 'Non-Grave'}
          </span>
        </td>
        <td class="py-2.5 px-3 text-amber-300 max-w-[200px] truncate text-[11px]" title="${c.reason_for_ui || ''}">${c.reason_for_ui || '-'}</td>
        <td class="py-2.5 px-3 text-center font-mono font-black text-red-400 bg-red-950/20">${c.days_pending || '-'}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-1.5 py-0.5 rounded text-[10px] badge-timeline-old font-bold">
            ${c.timeline || 'Above 1 Year'}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center" onclick="event.stopPropagation()">
          <button onclick="openCaseModal(${c.id})" class="px-2 py-1 bg-red-950/80 hover:bg-red-900 text-red-200 rounded border border-red-700 text-[11px]">
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= TAB 5: COMPLIANCE REVIEW =================
function renderComplianceTable() {
  const tbody = document.getElementById('complianceTableBody');
  if (!tbody) return;

  const list = appData.ps_progress || [];

  tbody.innerHTML = list.map((r, i) => `
    <tr class="hover:bg-slate-800/60 transition">
      <td class="py-2.5 px-3 font-mono text-slate-400">${i + 1}</td>
      <td class="py-2.5 px-3 font-semibold text-white">${r.old_reason}</td>
      <td class="py-2.5 px-3 text-center font-mono text-slate-300">${r.total_prev}</td>
      <td class="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-950/20">${r.disposed}</td>
      <td class="py-2.5 px-3 text-center font-mono text-purple-300">${r.cc_awaited}</td>
      <td class="py-2.5 px-3 text-center font-mono text-amber-300">${r.cs_returned}</td>
      <td class="py-2.5 px-3 text-center font-mono text-blue-300">${r.for_arrest}</td>
      <td class="py-2.5 px-3 text-center font-mono text-teal-300">${r.being_charged}</td>
      <td class="py-2.5 px-3 text-center font-mono font-bold text-blue-400">${r.present_ui}</td>
      <td class="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">${r.actual_ui}</td>
    </tr>
  `).join('');
}

// ================= TAB 6: POLICE STATION 360° DOSSIER =================
function renderStationDossier() {
  const psName = document.getElementById('dossierStationSelect')?.value;
  if (!psName) return;

  const st = appData.station_stats.find(s => s.ps === psName) || {
    ps: psName,
    sub_division: 'Srikakulam Sub-Division',
    circle: 'Circle',
    total_ui: 0,
    grave: 0,
    non_grave: 0,
    above_1yr: 0,
    long_pending: 0,
    reported: 0,
    finalised: 0,
    cc_awaited: 0,
    want_of_clues: 0,
    arrest_pending: 0,
    reasons: {},
    heads: {},
    ios: {}
  };

  const stCases = appData.ui_cases.filter(c => c.ps === psName);
  const clearanceRate = st.reported > 0 ? Math.round((st.finalised / st.reported) * 100) : 0;

  const content = document.getElementById('stationDossierContent');
  if (!content) return;

  content.innerHTML = `
    <!-- Top Station Profile Card -->
    <div class="bg-gradient-to-r from-[#0c1e3d] via-[#12284c] to-[#0c1e3d] border-2 border-[#ffd700] rounded-2xl p-6 shadow-xl">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 rounded-2xl bg-[#081220] border-2 border-[#ffd700] flex items-center justify-center p-2 shadow-inner">
            <img src="assets/srikakulam_police_logo.svg" alt="PS" class="w-12 h-12 object-contain">
          </div>
          <div>
            <div class="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#ffd700] font-bold">
              <span>${st.sub_division}</span>
              <span>•</span>
              <span>${st.circle}</span>
            </div>
            <h2 class="text-2xl font-black text-white tracking-tight">${st.ps} Police Station</h2>
            <p class="text-xs text-slate-300">Station Crime & Investigation Performance Dossier</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="printStationDossier('${st.ps}')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-600 flex items-center gap-2">
            <i class="fa-solid fa-print"></i> Print Station Sheet
          </button>
          <button onclick="exportStationCasesToExcel('${st.ps}')" class="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded-lg text-xs font-bold border border-emerald-600 flex items-center gap-2">
            <i class="fa-solid fa-file-excel"></i> Export ${stCases.length} Cases
          </button>
        </div>

      </div>

      <!-- Quick Metrics Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-700/80">
        
        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">Total UI Cases</div>
          <div class="text-2xl font-black text-blue-400 mt-0.5">${st.total_ui}</div>
          <div class="text-[10px] text-slate-400">Under Investigation</div>
        </div>

        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">Grave UI</div>
          <div class="text-2xl font-black text-red-400 mt-0.5">${st.grave}</div>
          <div class="text-[10px] text-slate-400">Severe Offences</div>
        </div>

        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">Non-Grave UI</div>
          <div class="text-2xl font-black text-slate-200 mt-0.5">${st.non_grave}</div>
          <div class="text-[10px] text-slate-400">Regular Cases</div>
        </div>

        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">Above 1 Year</div>
          <div class="text-2xl font-black ${st.above_1yr > 15 ? 'text-red-400' : 'text-amber-300'} mt-0.5">${st.above_1yr}</div>
          <div class="text-[10px] text-slate-400">Long Pending UI</div>
        </div>

        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">Reported vs Final</div>
          <div class="text-base font-black text-white mt-1">
            <span class="text-blue-300">${st.reported || '-'}</span> / <span class="text-emerald-400">${st.finalised || '-'}</span>
          </div>
          <div class="text-[10px] text-slate-400">${clearanceRate}% Clearance</div>
        </div>

        <div class="bg-[#081220] p-3 rounded-xl border border-slate-700">
          <div class="text-[10px] uppercase font-bold text-slate-400">CC.No Awaited</div>
          <div class="text-2xl font-black text-purple-400 mt-0.5">${st.cc_awaited}</div>
          <div class="text-[10px] text-slate-400">Court Pending</div>
        </div>

      </div>
    </div>

    <!-- Reason Breakdown & IO Pending Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Top Pending Reasons in Station -->
      <div class="bg-police-card rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <i class="fa-solid fa-list-check text-amber-400"></i>
          <span>Investigation Bottlenecks (${st.ps})</span>
        </h3>
        <div class="space-y-2 text-xs">
          ${Object.entries(st.reasons || {}).sort((a,b)=>b[1]-a[1]).map(([r, cnt]) => `
            <div class="flex items-center justify-between p-2 bg-[#081220] rounded border border-slate-700/60">
              <span class="text-slate-300 truncate max-w-[80%]">${r}</span>
              <span class="font-mono font-bold text-amber-300 px-2 py-0.5 bg-slate-800 rounded">${cnt}</span>
            </div>
          `).join('') || '<div class="text-slate-400 py-2">No pending reasons recorded.</div>'}
        </div>
      </div>

      <!-- Investigation Officers in Station -->
      <div class="bg-police-card rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <i class="fa-solid fa-user-shield text-blue-400"></i>
          <span>Investigation Officers (IOs) Caseload</span>
        </h3>
        <div class="space-y-2 text-xs">
          ${Object.entries(st.ios || {}).sort((a,b)=>b[1]-a[1]).map(([io, cnt]) => `
            <div class="flex items-center justify-between p-2 bg-[#081220] rounded border border-slate-700/60">
              <span class="text-slate-300 font-semibold truncate max-w-[80%]">${io}</span>
              <span class="font-mono font-bold text-blue-400 px-2 py-0.5 bg-slate-800 rounded">${cnt} Cases</span>
            </div>
          `).join('') || '<div class="text-slate-400 py-2">No IO details available.</div>'}
        </div>
      </div>

    </div>

    <!-- Station Cases Table -->
    <div class="bg-police-card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-bold text-white">All Pending FIRs in ${st.ps} (${stCases.length})</h3>
          <p class="text-xs text-slate-400">Click any row to open the complete case brief and history</p>
        </div>
      </div>

      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-xs text-left">
          <thead class="bg-[#081220] text-slate-300 uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-700">
            <tr>
              <th class="py-2.5 px-3">S.No</th>
              <th class="py-2.5 px-3">FIR No</th>
              <th class="py-2.5 px-3">Date</th>
              <th class="py-2.5 px-3">Acts & Section</th>
              <th class="py-2.5 px-3">Crime Head</th>
              <th class="py-2.5 px-3">Gravity</th>
              <th class="py-2.5 px-3">IO Name</th>
              <th class="py-2.5 px-3">Reason for UI</th>
              <th class="py-2.5 px-3 text-center">Days</th>
              <th class="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${stCases.map((c, i) => `
              <tr class="hover:bg-slate-800/60 transition cursor-pointer" onclick="openCaseModal(${c.id})">
                <td class="py-2 px-3 font-mono text-slate-400">${i+1}</td>
                <td class="py-2 px-3 font-mono font-bold text-amber-300">${c.fir_no}</td>
                <td class="py-2 px-3 text-slate-300">${c.fir_date || '-'}</td>
                <td class="py-2 px-3 font-mono text-slate-300 truncate max-w-[160px]">${c.sec_of_law || '-'}</td>
                <td class="py-2 px-3 text-slate-200">${c.crime_head || '-'}</td>
                <td class="py-2 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] ${String(c.gravity).toLowerCase() === 'grave' ? 'badge-grave' : 'badge-nongrave'}">
                    ${c.gravity || 'Non-Grave'}
                  </span>
                </td>
                <td class="py-2 px-3 text-slate-300">${c.io_name || 'SHO'}</td>
                <td class="py-2 px-3 text-slate-300 truncate max-w-[160px]">${c.reason_for_ui || '-'}</td>
                <td class="py-2 px-3 text-center font-mono ${c.days_pending > 365 ? 'text-red-400 font-bold' : 'text-slate-300'}">${c.days_pending || '-'}</td>
                <td class="py-2 px-3 text-center" onclick="event.stopPropagation()">
                  <button onclick="openCaseModal(${c.id})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[#ffd700] rounded text-[11px]">
                    Inspect
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function printStationDossier(ps) {
  window.print();
}

// ================= TAB 7: PRESENTATION MODE (PROJECTOR SLIDES) =================
function updatePresentationSlide() {
  const psName = document.getElementById('presentationPSSelect')?.value;
  if (!psName) return;

  const st = appData.station_stats.find(s => s.ps === psName) || {
    ps: psName,
    sub_division: 'Sub-Division',
    circle: 'Circle',
    total_ui: 0,
    grave: 0,
    non_grave: 0,
    above_1yr: 0,
    long_pending: 0,
    reasons: {}
  };

  const area = document.getElementById('presentationSlideArea');
  if (!area) return;

  area.innerHTML = `
    <div class="flex items-center justify-between border-b-2 border-[#ffd700] pb-4 mb-6">
      <div>
        <span class="text-xs uppercase tracking-widest text-[#ffd700] font-black">${st.sub_division} • ${st.circle}</span>
        <h2 class="text-4xl font-black text-white tracking-wide">${st.ps} POLICE STATION</h2>
        <p class="text-sm text-slate-300 mt-1">Superintendent of Police Crime Review Talking Points</p>
      </div>
      <div class="text-right">
        <span class="text-5xl font-black text-amber-400 font-mono">${st.total_ui}</span>
        <span class="block text-xs uppercase font-bold text-slate-400 tracking-wider">Total UI Cases</span>
      </div>
    </div>

    <!-- Big KPI Boxes -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-[#081220] p-4 rounded-xl border border-red-500/50">
        <div class="text-xs uppercase font-bold text-red-400">Grave Offences (Point-1)</div>
        <div class="text-3xl font-black text-red-400 mt-1">${st.grave} Cases</div>
        <div class="text-xs text-slate-400 mt-1">Requires immediate SP directive</div>
      </div>

      <div class="bg-[#081220] p-4 rounded-xl border border-amber-500/50">
        <div class="text-xs uppercase font-bold text-amber-400">Long Pending UI (> 1 Yr)</div>
        <div class="text-3xl font-black text-amber-400 mt-1">${st.above_1yr} Cases</div>
        <div class="text-xs text-slate-400 mt-1">Point-2 special review</div>
      </div>

      <div class="bg-[#081220] p-4 rounded-xl border border-purple-500/50">
        <div class="text-xs uppercase font-bold text-purple-400">Court Number Pending</div>
        <div class="text-3xl font-black text-purple-400 mt-1">${st.cc_awaited} Cases</div>
        <div class="text-xs text-slate-400 mt-1">SC / PRC / CC No. Awaited</div>
      </div>

      <div class="bg-[#081220] p-4 rounded-xl border border-blue-500/50">
        <div class="text-xs uppercase font-bold text-blue-400">Clues & Accused Pending</div>
        <div class="text-3xl font-black text-blue-400 mt-1">${(st.want_of_clues || 0) + (st.arrest_pending || 0)} Cases</div>
        <div class="text-xs text-slate-400 mt-1">Clues: ${st.want_of_clues || 0} | Arrests: ${st.arrest_pending || 0}</div>
      </div>
    </div>

    <!-- Review Directives for SP -->
    <div class="bg-[#081220] p-5 rounded-xl border border-slate-700">
      <h3 class="text-base font-bold text-[#ffd700] mb-3 flex items-center gap-2">
        <i class="fa-solid fa-bullhorn"></i>
        <span>Review Checklist for SHO - ${st.ps}</span>
      </h3>
      <ul class="space-y-2 text-sm text-slate-200">
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-check text-emerald-400 mt-1"></i>
          <span><strong>Grave UI Cases (${st.grave}):</strong> What is the current status of accused arrest and forensic reports? Direct SHO to submit compliance within 7 days.</span>
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-check text-amber-400 mt-1"></i>
          <span><strong>Long Pending Cases (${st.above_1yr}):</strong> Check IO diaries for cases pending over 365 days. Verify why charge sheets were delayed or returned.</span>
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-check text-blue-400 mt-1"></i>
          <span><strong>Court Pendency (${st.cc_awaited}):</strong> Direct Court Constable and Liaison Officer to coordinate with the concerned magistrate for CC number allotment.</span>
        </li>
      </ul>
    </div>
  `;
}

function togglePresentationMode() {
  document.body.classList.toggle('presentation-mode');
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Fullscreen request prevented:', err);
    });
  }
}

// ================= CASE MODAL DETAILS =================
function openCaseModal(caseId) {
  const c = appData.ui_cases.find(x => x.id === caseId) || 
            appData.long_pending_ui.find(x => x.id === caseId);
  if (!c) return;

  document.getElementById('modalFIR').innerText = `FIR No: ${c.fir_no} (${c.year || ''})`;
  document.getElementById('modalPS').innerText = `${c.ps} PS • ${c.sub_division || ''} • ${c.circle || ''}`;
  document.getElementById('modalCrimeHead').innerText = c.crime_head || 'General IPC';
  
  const isGrave = String(c.gravity).toLowerCase() === 'grave';
  const gravEl = document.getElementById('modalGravity');
  gravEl.innerText = c.gravity || 'Non-Grave';
  gravEl.className = isGrave ? 'font-bold text-red-400' : 'font-bold text-blue-300';

  document.getElementById('modalFIRDate').innerText = c.fir_date || '-';
  document.getElementById('modalDaysPending').innerText = `${c.days_pending || 0} Days`;
  document.getElementById('modalTimeline').innerText = c.timeline || '-';
  document.getElementById('modalIO').innerText = c.io_name || 'SHO / SI';
  document.getElementById('modalSecOfLaw').innerText = c.sec_of_law || 'Section details not specified';
  document.getElementById('modalReason').innerText = c.reason_for_ui || 'Under Investigation';
  document.getElementById('modalBrief').innerText = c.brief || 'No brief facts registered in record.';

  document.getElementById('caseModal').classList.remove('hidden');
}

function closeCaseModal() {
  document.getElementById('caseModal').classList.add('hidden');
}

// ================= EXCEL EXPORTS (SHEETJS) =================
function exportCurrentViewToExcel() {
  const data = appData.ui_cases.map(c => ({
    "S.No": c.id,
    "Police Station": c.ps,
    "FIR No": c.fir_no,
    "Date": c.fir_date,
    "Year": c.year,
    "Section of Law": c.sec_of_law,
    "Crime Head": c.crime_head,
    "Classification": c.classification,
    "Gravity": c.gravity,
    "IO Name": c.io_name,
    "Reason for UI": c.reason_for_ui,
    "Days Pending": c.days_pending,
    "Timeline": c.timeline,
    "Brief Facts": c.brief
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Total UI Cases");
  XLSX.writeFile(wb, "SKLM_Total_UI_Cases_Registry.xlsx");
}

function exportFilteredUIToExcel() {
  const data = filteredUICases.map(c => ({
    "S.No": c.id,
    "Police Station": c.ps,
    "FIR No": c.fir_no,
    "Date": c.fir_date,
    "Section of Law": c.sec_of_law,
    "Crime Head": c.crime_head,
    "Gravity": c.gravity,
    "IO Name": c.io_name,
    "Reason for UI": c.reason_for_ui,
    "Days Pending": c.days_pending,
    "Timeline": c.timeline,
    "Brief Facts": c.brief
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Filtered UI Cases");
  XLSX.writeFile(wb, "SKLM_Filtered_UI_Cases.xlsx");
}

function exportLongPendingToExcel() {
  const data = appData.long_pending_ui.map(c => ({
    "S.No": c.id,
    "Police Station": c.ps,
    "FIR No": c.fir_no,
    "Date": c.fir_date,
    "Section of Law": c.sec_of_law,
    "Crime Head": c.crime_head,
    "Gravity": c.gravity,
    "IO Name": c.io_name,
    "Reason for UI": c.reason_for_ui,
    "Days Pending": c.days_pending,
    "Timeline": c.timeline,
    "Brief Facts": c.brief
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Long Pending UI");
  XLSX.writeFile(wb, "SKLM_Long_Pending_UI_Priority_Cases.xlsx");
}

function exportCrimeStatsToExcel() {
  const data = appData.crime_statistics.map(r => ({
    "S.No": r.sno,
    "Crime Head": r.head,
    "Classification": r.category,
    "2024": r.y2024,
    "2025": r.y2025,
    "2026 Upto": r.y2026,
    "2024-2025 (%)": r.pct_24_25 + "%",
    "2025-2026 (%)": r.pct_25_26 + "%"
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Crime Statistics 24-26");
  XLSX.writeFile(wb, "SKLM_Crime_Statistics_2024_2026.xlsx");
}

function exportComplianceToExcel() {
  const data = appData.ps_progress.map(r => ({
    "Previous Reason": r.old_reason,
    "Previous Total": r.total_prev,
    "Disposed / PT": r.disposed,
    "CC Awaited": r.cc_awaited,
    "CS Returned": r.cs_returned,
    "Accused Arrested": r.for_arrest,
    "Being Charged": r.being_charged,
    "Present UI": r.present_ui,
    "Actual UI": r.actual_ui
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Meeting Compliance");
  XLSX.writeFile(wb, "SKLM_Meeting_Compliance_Review.xlsx");
}

function exportStationCasesToExcel(ps) {
  const stCases = appData.ui_cases.filter(c => c.ps === ps).map(c => ({
    "Police Station": c.ps,
    "FIR No": c.fir_no,
    "Date": c.fir_date,
    "Section of Law": c.sec_of_law,
    "Crime Head": c.crime_head,
    "Gravity": c.gravity,
    "IO Name": c.io_name,
    "Reason for UI": c.reason_for_ui,
    "Days Pending": c.days_pending,
    "Timeline": c.timeline,
    "Brief Facts": c.brief
  }));

  const ws = XLSX.utils.json_to_sheet(stCases);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${ps} Cases`);
  XLSX.writeFile(wb, `${ps}_Police_Station_Pending_Cases.xlsx`);
}

// ================= INITIALIZATION ENTRY POINT =================
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initData();
  updateClock();
});
