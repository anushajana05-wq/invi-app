/* ==========================================================================
   INVI Modals, Dialogs & Toast Notifications
   ========================================================================== */

// Toast Notification Manager
const ToastManager = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(title, message, type = 'success', duration = 4000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  },

  dismiss(toast) {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }
};

// Global Modals Controller
const ModalManager = {
  activeModal: null,

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    this.activeModal = modal;
    document.body.style.overflow = 'hidden';
  },

  close(modalId) {
    const modal = modalId ? document.getElementById(modalId) : this.activeModal;
    if (!modal) return;
    modal.classList.remove('active');
    this.activeModal = null;
    document.body.style.overflow = '';
  },

  initListeners() {
    // Backdrop clicks to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close(overlay.id);
        }
      });
    });

    // Close buttons
    document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) this.close(modal.id);
      });
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close();
      }
    });

    // Add Exam Form Submission
    const addExamForm = document.getElementById('addExamForm');
    if (addExamForm) {
      addExamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('examNameInput').value.trim();
        const code = document.getElementById('examCodeInput').value.trim();
        const date = document.getElementById('examDateInput').value;
        const startTime = document.getElementById('examStartTimeInput').value;
        const endTime = document.getElementById('examEndTimeInput').value;
        const block = document.getElementById('examBlockInput').value;
        const floor = document.getElementById('examFloorInput').value;
        const hall = document.getElementById('examHallInput').value;
        const staff = document.getElementById('examStaffInput').value;
        const backupStaff = document.getElementById('examBackupStaffInput').value;
        const notes = document.getElementById('examNotesInput').value.trim();

        if (!name || !code) {
          ToastManager.show('Missing Information', 'Please provide an Exam Name and Subject Code.', 'warning');
          return;
        }

        const newExam = {
          id: `EXM-${Math.floor(100 + Math.random() * 900)}`,
          name,
          code,
          time: `${startTime} - ${endTime}`,
          date,
          hall,
          block,
          floor,
          staff,
          backupStaff,
          status: 'Ready',
          capacity: 80,
          candidates: 75,
          notes: notes || 'Standard exam conditions verified. Student IDs checked at door.'
        };

        // Prepend to exams dataset
        INVI_DATA.exams.unshift(newExam);
        INVI_DATA.metrics.todayExams += 1;

        // Reset form and close
        addExamForm.reset();
        this.close('addExamModal');

        // Refresh views
        if (window.App) {
          window.App.updateMetricDisplays();
          window.App.renderExams();
          window.App.renderDashboard();
          window.App.selectExam(newExam.id);
        }

        ToastManager.show('Exam Scheduled', `Successfully created ${code}: ${name} for ${hall}.`, 'success');
      });
    }

    // Request Help Form Submission
    const requestHelpForm = document.getElementById('requestHelpForm');
    if (requestHelpForm) {
      requestHelpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const hallName = document.getElementById('helpModalHallName').textContent;
        const issueType = document.getElementById('helpIssueType').value;
        const priority = document.getElementById('helpPriority').value;
        const notes = document.getElementById('helpNotes').value;

        this.close('requestHelpModal');

        // Show dispatch notification
        ToastManager.show(
          `Dispatch Alert: ${hallName}`,
          `Support team dispatched for [${issueType}]. Priority level: ${priority}.`,
          priority === 'Emergency' ? 'error' : 'warning',
          6000
        );

        // Flash problem status or update checkpoint
        const hall = INVI_DATA.halls.find(h => h.name === hallName);
        if (hall && priority === 'Emergency') {
          hall.readiness = 'Warning';
          if (hall.checkpoints && hall.checkpoints.noAlerts) {
            hall.checkpoints.noAlerts.checked = false;
            hall.checkpoints.noAlerts.sub = `Active ticket: ${issueType}`;
          }
          if (window.App) {
            window.App.renderHalls();
            window.App.selectHall(hall.id);
          }
        }
      });
    }

    // Message Staff Form Submission
    const staffMessageForm = document.getElementById('staffMessageForm');
    if (staffMessageForm) {
      staffMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const staffName = document.getElementById('msgModalStaffName').textContent;
        const msgText = document.getElementById('msgModalInput').value;

        this.close('staffMessageModal');
        document.getElementById('msgModalInput').value = '';

        ToastManager.show('Message Dispatched', `Direct notification pushed to ${staffName}'s device and beacon.`, 'success');
      });
    }

    // Set Backup Form Submission
    const setBackupForm = document.getElementById('setBackupForm');
    if (setBackupForm) {
      setBackupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const targetStaffName = document.getElementById('backupModalStaffName').textContent;
        const newBackup = document.getElementById('backupStaffSelect').value;

        const staffMember = INVI_DATA.staff.find(s => s.name === targetStaffName);
        if (staffMember) {
          staffMember.backupPerson = newBackup;
          if (staffMember.status === 'Missing') {
            staffMember.status = 'Standby'; // transition
          }
        }

        this.close('setBackupModal');

        if (window.App) {
          window.App.renderStaff();
          if (staffMember) window.App.selectStaff(staffMember.id);
        }

        ToastManager.show('Backup Assigned', `${newBackup} is now assigned as backup for ${targetStaffName}.`, 'success');
      });
    }
  },

  // Open "Request Help" dialog with context
  openRequestHelp(hallName) {
    document.getElementById('helpModalHallName').textContent = hallName;
    this.open('requestHelpModal');
  },

  // Open "Call" simulation dialog
  openCallStaff(staff) {
    document.getElementById('callModalStaffName').textContent = staff.name;
    document.getElementById('callModalStaffPhone').textContent = staff.phone;
    document.getElementById('callModalStaffRole').textContent = staff.role + ' • ' + staff.hall;
    document.getElementById('callTimer').textContent = 'Connecting...';
    this.open('staffCallModal');

    // Simulate connection after 1.5s
    let seconds = 0;
    if (this._callInterval) clearInterval(this._callInterval);

    setTimeout(() => {
      if (this.activeModal && this.activeModal.id === 'staffCallModal') {
        document.getElementById('callTimer').textContent = '00:01';
        this._callInterval = setInterval(() => {
          seconds++;
          const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
          const secs = (seconds % 60).toString().padStart(2, '0');
          const timerEl = document.getElementById('callTimer');
          if (timerEl) timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
      }
    }, 1200);
  },

  endCall() {
    if (this._callInterval) clearInterval(this._callInterval);
    this.close('staffCallModal');
    ToastManager.show('Call Ended', 'Direct voice session terminated.', 'info');
  },

  // Open "Message" dialog
  openMessageStaff(staff) {
    document.getElementById('msgModalStaffName').textContent = staff.name;
    document.getElementById('msgModalStaffRole').textContent = `${staff.role} (${staff.hall})`;
    this.open('staffMessageModal');
  },

  // Open "Set Backup" dialog
  openSetBackup(staff) {
    document.getElementById('backupModalStaffName').textContent = staff.name;
    const select = document.getElementById('backupStaffSelect');
    if (select) {
      select.innerHTML = `
        <option value="Dr. Sarah Lin (Standby, School of Computing)">Dr. Sarah Lin (Standby, School of Computing)</option>
        <option value="Mr. Robert Shaw (Standby, Physical Sciences)">Mr. Robert Shaw (Standby, Physical Sciences)</option>
        <option value="Prof. Charles Xavier (Faculty Reserve)">Prof. Charles Xavier (Faculty Reserve)</option>
        <option value="Dr. Grace Hopper (AI Faculty Reserve)">Dr. Grace Hopper (AI Faculty Reserve)</option>
      `;
    }
    this.open('setBackupModal');
  },

  // Device Diagnostic Actions
  restartDevice(device) {
    ToastManager.show('Rebooting Device', `Initiating hardware power-cycle for ${device.id} in ${device.hall}...`, 'info', 3000);
    
    // Simulate restart progress
    setTimeout(() => {
      device.status = 'Online';
      device.lastSeen = 'Just now';
      device.wifiQuality = '98% (Excellent)';
      device.signalBars = 4;
      if (window.App) {
        window.App.renderDevices();
        window.App.selectDevice(device.id);
      }
      ToastManager.show('Device Online', `${device.id} restarted successfully and re-joined mesh network.`, 'success', 4000);
    }, 2800);
  },

  testDevice(device) {
    ToastManager.show('Running Telemetry Ping', `Testing RF channels, latency, and beacon scanners on ${device.id}...`, 'info', 2500);

    setTimeout(() => {
      const pingMs = Math.floor(12 + Math.random() * 8);
      ToastManager.show(
        'Diagnostic Passed',
        `Ping: ${pingMs}ms • 0% Packet Loss • Jitter: 0.8ms • Wi-Fi Channel: Clear.`,
        'success',
        5000
      );
    }, 2200);
  }
};
