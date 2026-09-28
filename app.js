/* ==========================================================================
   INVI Core Application Logic & State Management
   ========================================================================== */

const App = {
  currentView: 'dashboard',
  searchQuery: '',
  filters: {
    block: 'All Blocks',
    floor: 'All Floors',
    hall: 'All Halls',
    status: 'All Statuses',
    date: 'all'
  },

  // Selected Items for Right Inspector Panels
  selectedExamId: null,
  selectedHallId: null,
  selectedStaffId: null,
  selectedDeviceId: null,

  // Pagination for Halls
  hallsPagination: {
    currentPage: 1,
    pageSize: 6
  },

  init() {
    ToastManager.init();
    ModalManager.initListeners();

    // Default selected records
    this.selectedExamId = INVI_DATA.exams[0]?.id || null;
    this.selectedHallId = INVI_DATA.halls[0]?.id || null;
    this.selectedStaffId = INVI_DATA.staff[0]?.id || null;
    this.selectedDeviceId = INVI_DATA.devices[0]?.id || null;

    this.bindNavigation();
    this.bindSearch();
    this.bindFilterBars();
    this.bindUserProfile();
    this.bindLiveClock();
    this.populateFilterDropdowns();

    // Initial render of all components
    this.updateMetricDisplays();
    this.renderDashboard();
    this.renderExams();
    this.renderHalls();
    this.renderStaff();
    this.renderDevices();

    // Render initial inspectors
    this.renderExamInspector();
    this.renderHallInspector();
    this.renderStaffInspector();
    this.renderDeviceInspector();
  },

  // ==========================================================================
  // Navigation & Shell
  // ==========================================================================
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Mobile Hamburger & Overlay
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (mobileBtn && sidebar && overlay) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },

  switchView(viewName) {
    this.currentView = viewName;

    // Update Sidebar Active Class
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Switch View Section Visibility
    document.querySelectorAll('.view-section').forEach(sec => {
      if (sec.id === `view-${viewName}`) {
        sec.classList.add('active-view');
      } else {
        sec.classList.remove('active-view');
      }
    });

    // Close Mobile Drawer if open
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bindSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.applyFiltersAcrossViews();
    });
  },

  bindUserProfile() {
    const btn = document.getElementById('userProfileBtn');
    const menu = document.getElementById('userDropdownMenu');

    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        menu.classList.remove('show');
      });
    }
  },

  bindLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('currentDateDisplay');

    if (dateEl) {
      dateEl.textContent = INVI_DATA.currentDateString;
    }

    const updateTime = () => {
      if (!clockEl) return;
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // hour '0' should be '12'
      clockEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    };

    updateTime();
    setInterval(updateTime, 1000);
  },

  // ==========================================================================
  // Filter Dropdowns
  // ==========================================================================
  populateFilterDropdowns() {
    const fillSelect = (selector, list) => {
      document.querySelectorAll(selector).forEach(sel => {
        sel.innerHTML = list.map(item => `<option value="${item}">${item}</option>`).join('');
      });
    };

    fillSelect('.filter-select-block', INVI_DATA.blocks);
    fillSelect('.filter-select-floor', INVI_DATA.floors);
    fillSelect('.filter-select-hall', INVI_DATA.hallsList);
    fillSelect('.filter-select-status', INVI_DATA.statusOptions);

    // Also populate Add Exam modal halls, blocks, floors
    const examHallSel = document.getElementById('examHallInput');
    if (examHallSel) {
      examHallSel.innerHTML = INVI_DATA.hallsList
        .filter(h => h !== 'All Halls')
        .map(h => `<option value="${h}">${h}</option>`)
        .join('');
    }
  },

  bindFilterBars() {
    document.querySelectorAll('.filter-bar').forEach(bar => {
      bar.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('filter-select-block')) {
          this.filters.block = target.value;
          this.syncFilterControls('.filter-select-block', target.value);
        } else if (target.classList.contains('filter-select-floor')) {
          this.filters.floor = target.value;
          this.syncFilterControls('.filter-select-floor', target.value);
        } else if (target.classList.contains('filter-select-hall')) {
          this.filters.hall = target.value;
          this.syncFilterControls('.filter-select-hall', target.value);
        } else if (target.classList.contains('filter-select-status')) {
          this.filters.status = target.value;
          this.syncFilterControls('.filter-select-status', target.value);
        }
        this.applyFiltersAcrossViews();
      });

      const resetBtn = bar.querySelector('.filter-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetFilters();
        });
      }
    });
  },

  syncFilterControls(selector, val) {
    document.querySelectorAll(selector).forEach(sel => {
      sel.value = val;
    });
  },

  resetFilters() {
    this.filters = {
      block: 'All Blocks',
      floor: 'All Floors',
      hall: 'All Halls',
      status: 'All Statuses',
      date: 'all'
    };
    this.searchQuery = '';
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) globalSearch.value = '';

    this.syncFilterControls('.filter-select-block', 'All Blocks');
    this.syncFilterControls('.filter-select-floor', 'All Floors');
    this.syncFilterControls('.filter-select-hall', 'All Halls');
    this.syncFilterControls('.filter-select-status', 'All Statuses');

    this.applyFiltersAcrossViews();
    ToastManager.show('Filters Reset', 'Showing all items across campus.', 'info', 2000);
  },

  applyFiltersAcrossViews() {
    this.renderDashboard();
    this.renderExams();
    this.renderHalls();
    this.renderStaff();
    this.renderDevices();
  },

  // Matcher function
  itemMatches(item) {
    // Block filter
    if (this.filters.block !== 'All Blocks' && item.block !== this.filters.block) {
      return false;
    }
    // Floor filter
    if (this.filters.floor !== 'All Floors' && item.floor !== this.filters.floor) {
      return false;
    }
    // Hall filter
    if (this.filters.hall !== 'All Halls') {
      const itemHall = item.hall || item.name || '';
      if (!itemHall.includes(this.filters.hall)) return false;
    }
    // Status filter
    if (this.filters.status !== 'All Statuses') {
      const s = (item.status || item.readiness || item.deviceStatus || '').toLowerCase();
      const target = this.filters.status.toLowerCase();
      if (!s.includes(target) && target !== s) return false;
    }
    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery;
      const combined = Object.values(item).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' ').toLowerCase();
      if (!combined.includes(q)) return false;
    }
    return true;
  },

  // ==========================================================================
  // Badges & UI Helpers
  // ==========================================================================
  renderBadge(status) {
    if (!status) return '';
    const s = status.toLowerCase();

    let variant = 'green';
    // Green: Online, Ready, On Duty, Good
    if (['online', 'ready', 'on duty', 'good'].includes(s)) {
      variant = 'green';
    }
    // Yellow/Amber: Late, Warning, Weak, Standby
    else if (['late', 'warning', 'weak', 'standby'].includes(s)) {
      variant = 'yellow';
    }
    // Red: Offline, Missing, Changed, Device Off, Problem
    else if (['offline', 'missing', 'changed', 'device off', 'problem'].includes(s)) {
      variant = 'red';
    } else {
      variant = 'blue';
    }

    return `<span class="badge badge-${variant}"><span class="badge-dot"></span>${status}</span>`;
  },

  renderSignalMeter(bars) {
    const count = parseInt(bars, 10) || 0;
    return `
      <div class="signal-meter signal-${count}" title="Signal: ${count} of 4 bars">
        <span class="signal-bar"></span>
        <span class="signal-bar"></span>
        <span class="signal-bar"></span>
        <span class="signal-bar"></span>
      </div>
    `;
  },

  updateMetricDisplays() {
    document.getElementById('metricTodayExams').textContent = INVI_DATA.metrics.todayExams;
    document.getElementById('metricHallsReady').textContent = `${INVI_DATA.metrics.hallsReady} / ${INVI_DATA.metrics.hallsTotal}`;
    document.getElementById('metricStaffPresent').textContent = `${INVI_DATA.metrics.staffPresent} / ${INVI_DATA.metrics.staffTotal}`;
    document.getElementById('metricProblems').textContent = INVI_DATA.metrics.problemsCount;

    // Sublabels
    const hallsReadyPct = ((INVI_DATA.metrics.hallsReady / INVI_DATA.metrics.hallsTotal) * 100).toFixed(1);
    const hallsBar = document.getElementById('metricHallsProgress');
    if (hallsBar) hallsBar.style.width = `${hallsReadyPct}%`;
  },

  // ==========================================================================
  // View A: Dashboard View
  // ==========================================================================
  renderDashboard() {
    // 1. Today's Exams Table (Left)
    const examsContainer = document.getElementById('dashboardExamsTableBody');
    if (examsContainer) {
      const filtered = INVI_DATA.exams.filter(e => this.itemMatches(e));
      if (filtered.length === 0) {
        examsContainer.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding: 24px;">No exams match your filters.</td></tr>`;
      } else {
        examsContainer.innerHTML = filtered.map(exam => `
          <tr data-exam-id="${exam.id}" class="${this.selectedExamId === exam.id ? 'active-row' : ''}">
            <td class="table-time-col">${exam.time.split(' - ')[0]}</td>
            <td>
              <div class="table-title-cell">
                <span class="table-title-main">${exam.name}</span>
                <span class="table-title-sub">${exam.code}</span>
              </div>
            </td>
            <td><span class="font-semibold">${exam.hall}</span> <span class="text-xs text-muted">(${exam.block})</span></td>
            <td>${exam.staff}</td>
            <td>${this.renderBadge(exam.status)}</td>
          </tr>
        `).join('');

        // Row clicks navigate to exam view or select
        examsContainer.querySelectorAll('tr[data-exam-id]').forEach(row => {
          row.addEventListener('click', () => {
            const id = row.getAttribute('data-exam-id');
            this.selectExam(id);
            this.switchView('exams');
          });
        });
      }
    }

    // 2. Hall Status Summary Table (Right)
    const hallsContainer = document.getElementById('dashboardHallsTableBody');
    if (hallsContainer) {
      const filteredHalls = INVI_DATA.halls.filter(h => this.itemMatches(h));
      if (filteredHalls.length === 0) {
        hallsContainer.innerHTML = `<tr><td colspan="3" class="text-muted" style="text-align:center; padding: 24px;">No halls match filters.</td></tr>`;
      } else {
        hallsContainer.innerHTML = filteredHalls.slice(0, 8).map(hall => `
          <tr data-hall-id="${hall.id}">
            <td>
              <div class="table-title-cell">
                <span class="table-title-main">${hall.name}</span>
                <span class="table-title-sub">${hall.block} • ${hall.floor}</span>
              </div>
            </td>
            <td>${this.renderBadge(hall.readiness)}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="App.selectHall('${hall.id}'); App.switchView('halls');">Inspect</button>
            </td>
          </tr>
        `).join('');
      }
    }
  },

  // ==========================================================================
  // View B: Exams View
  // ==========================================================================
  renderExams() {
    const tbody = document.getElementById('examsTableBody');
    if (!tbody) return;

    const filtered = INVI_DATA.exams.filter(e => this.itemMatches(e));
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 32px;">No exams found matching current criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(exam => `
      <tr data-exam-id="${exam.id}" class="${this.selectedExamId === exam.id ? 'active-row' : ''}">
        <td>
          <div class="table-title-cell">
            <span class="table-title-main">${exam.name}</span>
            <span class="table-title-sub">${exam.code} • ${exam.candidates} Candidates</span>
          </div>
        </td>
        <td class="table-time-col">${exam.time}</td>
        <td><span class="font-semibold">${exam.hall}</span></td>
        <td>${exam.staff}</td>
        <td>${exam.block}</td>
        <td>${exam.floor}</td>
        <td>${this.renderBadge(exam.status)}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-exam-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-exam-id');
        this.selectExam(id);
      });
    });
  },

  selectExam(id) {
    this.selectedExamId = id;
    this.renderExams();
    this.renderExamInspector();
  },

  renderExamInspector() {
    const panel = document.getElementById('examInspectorPanel');
    if (!panel) return;

    const exam = INVI_DATA.exams.find(e => e.id === this.selectedExamId) || INVI_DATA.exams[0];
    if (!exam) return;

    panel.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-meta">
            <span class="text-xs font-semibold text-muted">${exam.id}</span>
            <div class="inspector-badge-title">
              <h3 class="inspector-title">${exam.name}</h3>
              ${this.renderBadge(exam.status)}
            </div>
            <span class="inspector-subtitle">${exam.code} • ${exam.candidates} Students Seated</span>
          </div>
        </div>

        <div class="inspector-body">
          <div class="detail-section">
            <div class="detail-section-title">Schedule & Location</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-key">Date</span>
                <span class="detail-val">${exam.date}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Time Window</span>
                <span class="detail-val">${exam.time}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Assigned Hall</span>
                <span class="detail-val">${exam.hall}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Block & Floor</span>
                <span class="detail-val">${exam.block} (${exam.floor})</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Invigilation Team</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-key">Primary Teacher</span>
                <span class="detail-val">${exam.staff}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Backup Teacher</span>
                <span class="detail-val">${exam.backupStaff}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Notes & Protocols</div>
            <div class="detail-notes-box">
              ${exam.notes}
            </div>
          </div>

          <div class="inspector-actions">
            <button class="btn btn-secondary btn-sm" onclick="App.reassignExamBackup('${exam.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Reassign Backup
            </button>
            <button class="btn btn-primary btn-sm" onclick="App.alertExamHall('${exam.hall}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              Send Hall Alert
            </button>
          </div>
        </div>
      </div>
    `;
  },

  reassignExamBackup(examId) {
    const exam = INVI_DATA.exams.find(e => e.id === examId);
    if (!exam) return;
    const backupCandidate = "Dr. Sarah Lin (Standby Reserve)";
    exam.backupStaff = backupCandidate;
    this.renderExamInspector();
    ToastManager.show('Backup Reassigned', `Assigned ${backupCandidate} as backup for ${exam.name}.`, 'success');
  },

  alertExamHall(hallName) {
    ToastManager.show('Hall Alert Dispatched', `Broadcast signal sent to ${hallName} speaker & invigilator terminal.`, 'info');
  },

  // ==========================================================================
  // View C: Halls View
  // ==========================================================================
  renderHalls() {
    const tbody = document.getElementById('hallsTableBody');
    if (!tbody) return;

    const filtered = INVI_DATA.halls.filter(h => this.itemMatches(h));
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.hallsPagination.pageSize));

    if (this.hallsPagination.currentPage > totalPages) {
      this.hallsPagination.currentPage = totalPages;
    }

    const startIdx = (this.hallsPagination.currentPage - 1) * this.hallsPagination.pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + this.hallsPagination.pageSize);

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 32px;">No examination halls found.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(hall => `
        <tr data-hall-id="${hall.id}" class="${this.selectedHallId === hall.id ? 'active-row' : ''}">
          <td><span class="font-bold">${hall.name}</span></td>
          <td>${hall.block}</td>
          <td>${hall.floor}</td>
          <td>
            <div class="table-title-cell">
              <span class="table-title-main">${hall.currentExam}</span>
              <span class="table-title-sub">Capacity: ${hall.capacity} desks</span>
            </div>
          </td>
          <td>${hall.teacher}</td>
          <td>${this.renderBadge(hall.deviceStatus)}</td>
          <td>${this.renderBadge(hall.readiness)}</td>
        </tr>
      `).join('');

      tbody.querySelectorAll('tr[data-hall-id]').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-hall-id');
          this.selectHall(id);
        });
      });
    }

    // Pagination Controls
    const pageInfo = document.getElementById('hallsPaginationInfo');
    const prevBtn = document.getElementById('hallsPrevBtn');
    const nextBtn = document.getElementById('hallsNextBtn');

    if (pageInfo) {
      const from = totalItems === 0 ? 0 : startIdx + 1;
      const to = Math.min(startIdx + this.hallsPagination.pageSize, totalItems);
      pageInfo.textContent = `Showing ${from} - ${to} of ${totalItems} Halls`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.hallsPagination.currentPage <= 1;
      prevBtn.onclick = () => {
        if (this.hallsPagination.currentPage > 1) {
          this.hallsPagination.currentPage--;
          this.renderHalls();
        }
      };
    }

    if (nextBtn) {
      nextBtn.disabled = this.hallsPagination.currentPage >= totalPages;
      nextBtn.onclick = () => {
        if (this.hallsPagination.currentPage < totalPages) {
          this.hallsPagination.currentPage++;
          this.renderHalls();
        }
      };
    }
  },

  selectHall(id) {
    this.selectedHallId = id;
    this.renderHalls();
    this.renderHallInspector();
  },

  renderHallInspector() {
    const container = document.getElementById('hallInspectorContainer');
    if (!container) return;

    const hall = INVI_DATA.halls.find(h => h.id === this.selectedHallId) || INVI_DATA.halls[0];
    if (!hall) return;

    // Checkpoints HTML
    const cp = hall.checkpoints;
    const renderCheckItem = (itemKey, item) => {
      const isOk = item.checked;
      const statusIcon = isOk ? `
        <span class="checklist-status-icon success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      ` : `
        <span class="checklist-status-icon error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      `;

      return `
        <div class="checklist-item" style="cursor: pointer;" onclick="App.toggleHallCheck('${hall.id}', '${itemKey}')">
          <div class="checklist-item-left">
            ${statusIcon}
            <div>
              <div class="checklist-label">${item.label}</div>
              <div class="checklist-sub">${item.sub}</div>
            </div>
          </div>
          <span class="checklist-status-text ${isOk ? 'text-muted' : 'font-semibold'}" style="color: ${isOk ? 'var(--status-green-text)' : 'var(--status-red-text)'};">
            ${isOk ? 'Verified' : 'Check Required'}
          </span>
        </div>
      `;
    };

    container.innerHTML = `
      <!-- Hall Details Card -->
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-meta">
            <span class="text-xs font-semibold text-muted">${hall.id}</span>
            <div class="inspector-badge-title">
              <h3 class="inspector-title">${hall.name}</h3>
              ${this.renderBadge(hall.readiness)}
            </div>
            <span class="inspector-subtitle">${hall.block} • ${hall.floor} • Capacity: ${hall.capacity}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="ModalManager.openRequestHelp('${hall.name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Request Help
          </button>
        </div>

        <div class="inspector-body">
          <div class="detail-section">
            <div class="detail-section-title">Session Overview</div>
            <div class="detail-grid">
              <div class="detail-item full-width">
                <span class="detail-key">Current Exam Session</span>
                <span class="detail-val">${hall.currentExam}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Invigilator</span>
                <span class="detail-val">${hall.teacher}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Contact</span>
                <span class="detail-val">${hall.teacherPhone}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Device Status</span>
                <span class="detail-val">${this.renderBadge(hall.deviceStatus)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Readiness State</span>
                <span class="detail-val">${this.renderBadge(hall.readiness)}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Hall Notes</div>
            <div class="detail-notes-box">
              ${hall.notes}
            </div>
          </div>
        </div>
      </div>

      <!-- Hall Ready Check Checklist Widget -->
      <div class="checklist-widget">
        <div class="checklist-title">
          <span>Hall Ready Check</span>
          <span class="text-xs text-muted">Click to toggle audit</span>
        </div>
        <div class="checklist-items">
          ${renderCheckItem('examSet', cp.examSet)}
          ${renderCheckItem('deviceOn', cp.deviceOn)}
          ${renderCheckItem('teacherPresent', cp.teacherPresent)}
          ${renderCheckItem('noAlerts', cp.noAlerts)}
        </div>
      </div>
    `;
  },

  toggleHallCheck(hallId, itemKey) {
    const hall = INVI_DATA.halls.find(h => h.id === hallId);
    if (!hall || !hall.checkpoints || !hall.checkpoints[itemKey]) return;

    hall.checkpoints[itemKey].checked = !hall.checkpoints[itemKey].checked;
    
    // Check overall readiness
    const allChecked = Object.values(hall.checkpoints).every(c => c.checked);
    if (allChecked) {
      hall.readiness = 'Ready';
    } else if (!hall.checkpoints.teacherPresent.checked) {
      hall.readiness = 'Missing';
    } else {
      hall.readiness = 'Warning';
    }

    this.renderHalls();
    this.renderHallInspector();
    ToastManager.show('Audit Updated', `Updated checkpoint status for ${hall.name}.`, 'info', 2000);
  },

  // ==========================================================================
  // View D: Staff View
  // ==========================================================================
  renderStaff() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const filtered = INVI_DATA.staff.filter(s => this.itemMatches(s));
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 32px;">No staff records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(member => `
      <tr data-staff-id="${member.id}" class="${this.selectedStaffId === member.id ? 'active-row' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${member.initials}</div>
            <div class="table-title-cell">
              <span class="table-title-main">${member.name}</span>
              <span class="table-title-sub">${member.role}</span>
            </div>
          </div>
        </td>
        <td><span class="table-time-col">${member.phone}</span></td>
        <td><span class="staff-beacon-pill">${member.beaconId}</span></td>
        <td>${member.block}</td>
        <td>${member.floor}</td>
        <td><span class="font-semibold">${member.hall}</span></td>
        <td>${this.renderBadge(member.status)}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-staff-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-staff-id');
        this.selectStaff(id);
      });
    });
  },

  selectStaff(id) {
    this.selectedStaffId = id;
    this.renderStaff();
    this.renderStaffInspector();
  },

  renderStaffInspector() {
    const panel = document.getElementById('staffProfilePanel');
    if (!panel) return;

    const member = INVI_DATA.staff.find(s => s.id === this.selectedStaffId) || INVI_DATA.staff[0];
    if (!member) return;

    panel.innerHTML = `
      <div class="inspector-card">
        <div class="staff-profile-hero">
          <div class="staff-avatar-large">${member.initials}</div>
          <h3 class="staff-hero-name">${member.name}</h3>
          <span class="staff-hero-role">${member.role}</span>
          <div style="margin-top: 6px;">
            ${this.renderBadge(member.status)}
          </div>
        </div>

        <div class="inspector-body">
          <div class="detail-section">
            <div class="detail-section-title">Assignment & Location</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-key">Assigned Hall</span>
                <span class="detail-val">${member.hall}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Block & Floor</span>
                <span class="detail-val">${member.block} • ${member.floor}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Check-in Time</span>
                <span class="detail-val">${member.checkInTime}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Assigned Backup</span>
                <span class="detail-val">${member.backupPerson}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Beacon Telemetry</div>
            <div class="detail-item full-width">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span class="detail-key">BLE Beacon Tag</span>
                  <div class="staff-beacon-pill" style="display: inline-block; margin-top: 4px;">${member.beaconId}</div>
                </div>
                <div class="status-dot-pulse"></div>
              </div>
              <div class="text-xs text-muted" style="margin-top: 6px;">${member.proximity}</div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Contact & Communication</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-key">Phone</span>
                <span class="detail-val">${member.phone}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Email</span>
                <span class="detail-val" style="font-size: 0.75rem;">${member.email}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons: Call, Message, Set Backup -->
          <div class="inspector-actions">
            <button class="btn btn-secondary btn-sm" onclick="App.openStaffCall('${member.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call
            </button>
            <button class="btn btn-secondary btn-sm" onclick="App.openStaffMessage('${member.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Message
            </button>
            <button class="btn btn-primary btn-sm" onclick="App.openStaffBackup('${member.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Set Backup
            </button>
          </div>
        </div>
      </div>
    `;
  },

  openStaffCall(staffId) {
    const s = INVI_DATA.staff.find(m => m.id === staffId);
    if (s) ModalManager.openCallStaff(s);
  },

  openStaffMessage(staffId) {
    const s = INVI_DATA.staff.find(m => m.id === staffId);
    if (s) ModalManager.openMessageStaff(s);
  },

  openStaffBackup(staffId) {
    const s = INVI_DATA.staff.find(m => m.id === staffId);
    if (s) ModalManager.openSetBackup(s);
  },

  // ==========================================================================
  // View E: Devices View
  // ==========================================================================
  renderDevices() {
    const tbody = document.getElementById('devicesTableBody');
    if (!tbody) return;

    const filtered = INVI_DATA.devices.filter(d => this.itemMatches(d));
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 32px;">No monitoring devices match current criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(dev => `
      <tr data-device-id="${dev.id}" class="${this.selectedDeviceId === dev.id ? 'active-row' : ''}">
        <td><span class="font-bold">${dev.hall}</span></td>
        <td>${dev.block}</td>
        <td>${dev.floor}</td>
        <td><span class="staff-beacon-pill font-mono">${dev.id}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${this.renderSignalMeter(dev.signalBars)}
            <span class="text-xs font-semibold text-muted">${dev.signalDbm}</span>
          </div>
        </td>
        <td class="table-time-col">${dev.lastSeen}</td>
        <td>${this.renderBadge(dev.status)}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-device-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-device-id');
        this.selectDevice(id);
      });
    });
  },

  selectDevice(id) {
    this.selectedDeviceId = id;
    this.renderDevices();
    this.renderDeviceInspector();
  },

  renderDeviceInspector() {
    const panel = document.getElementById('deviceInspectorPanel');
    if (!panel) return;

    const dev = INVI_DATA.devices.find(d => d.id === this.selectedDeviceId) || INVI_DATA.devices[0];
    if (!dev) return;

    const isOnline = dev.status === 'Online';
    const wifiQualityPct = parseInt(dev.wifiQuality, 10) || (isOnline ? 85 : 0);

    panel.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-meta">
            <span class="text-xs font-semibold text-muted">${dev.model}</span>
            <div class="inspector-badge-title">
              <h3 class="inspector-title">${dev.id}</h3>
              ${this.renderBadge(dev.status)}
            </div>
            <span class="inspector-subtitle">${dev.hall} • ${dev.block} (${dev.floor})</span>
          </div>
        </div>

        <div class="inspector-body">
          <div class="detail-section">
            <div class="detail-section-title">Wireless & Telemetry</div>
            <div class="detail-item full-width">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="detail-key">Wi-Fi Quality</span>
                <span class="font-semibold text-xs">${dev.wifiQuality}</span>
              </div>
              <div class="quality-meter">
                <div class="quality-meter-fill" style="width: ${wifiQualityPct}%;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.75rem; color: var(--text-muted);">
                <span>Signal: ${dev.signalDbm}</span>
                <span>Last Seen: ${dev.lastSeen}</span>
              </div>
            </div>

            <div class="detail-item full-width">
              <span class="detail-key">BLE Beacon Scanner</span>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <span class="detail-val" style="font-size: 0.8125rem;">${dev.beaconStatus}</span>
                ${this.renderSignalMeter(dev.signalBars)}
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Network & Hardware Metadata</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-key">IP Address</span>
                <span class="detail-val font-mono" style="font-size: 0.8125rem;">${dev.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">MAC Address</span>
                <span class="detail-val font-mono" style="font-size: 0.8125rem;">${dev.mac}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Firmware</span>
                <span class="detail-val">${dev.firmware}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">Power State</span>
                <span class="detail-val">${isOnline ? 'PoE+ Normal' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Diagnostics Notes</div>
            <div class="detail-notes-box">
              ${dev.notes}
            </div>
          </div>

          <!-- Action Buttons: Restart & Test -->
          <div class="inspector-actions">
            <button class="btn btn-secondary btn-sm" onclick="App.triggerDeviceRestart('${dev.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              Restart
            </button>
            <button class="btn btn-primary btn-sm" onclick="App.triggerDeviceTest('${dev.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Test Diagnostics
            </button>
          </div>
        </div>
      </div>
    `;
  },

  triggerDeviceRestart(id) {
    const dev = INVI_DATA.devices.find(d => d.id === id);
    if (dev) ModalManager.restartDevice(dev);
  },

  triggerDeviceTest(id) {
    const dev = INVI_DATA.devices.find(d => d.id === id);
    if (dev) ModalManager.testDevice(dev);
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
