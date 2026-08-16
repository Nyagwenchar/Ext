document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('extractBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');
  const lockStatus = document.getElementById('lockStatus');

  function updateLockStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id === undefined) {
        lockStatus.textContent = '';
        return;
      }

      chrome.storage.local.get({ profileRecords: [], tabProfileMap: {} }, (result) => {
        const records = Array.isArray(result.profileRecords) ? result.profileRecords : [];
        const tabMap = result.tabProfileMap || {};
        const key = String(tab.id);
        const index = tabMap[key];
        const record = Number.isInteger(index) && records[index] ? records[index] : null;

        if (record && record.name && record.location) {
          lockStatus.textContent = 'Locked: Name/Location';
          lockStatus.style.color = '#0b6b0d';
        } else {
          lockStatus.textContent = 'Unlocked: Name/Location can be saved';
          lockStatus.style.color = '#7a5a00';
        }
      });
    });
  }

  async function requestProfileExtraction() {
    status.textContent = 'Extracting profile...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'extract_profile' }, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Error: ' + chrome.runtime.lastError.message;
          updateLockStatus();
          return;
        }
        if (response && response.status === 'ok') {
          status.textContent = 'Profile saved to master file.';
          updateLockStatus();
        } else {
          status.textContent = 'No response from the page.';
          updateLockStatus();
        }
      });
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      updateLockStatus();
    }
  }

  saveBtn.addEventListener('click', requestProfileExtraction);

  downloadBtn.addEventListener('click', () => {
    status.textContent = 'Preparing master TXT...';
    chrome.runtime.sendMessage({ action: 'download_master_file', filename: 'employee_profiles.txt' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      if (response && response.status === 'downloaded') {
        status.textContent = 'Master TXT downloaded. (' + response.count + ' records)';
      } else {
        status.textContent = 'Master TXT was not created yet.';
      }
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clear_master_file' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      status.textContent = 'Master TXT cleared.';
      updateLockStatus();
    });
  });

  updateLockStatus();
});
