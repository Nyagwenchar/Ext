function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function uniqueList(items) {
  const output = [];
  const seen = new Set();

  for (const item of items || []) {
    const value = normalizeText(item);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function isSameTabProfile(existing, incoming) {
  if (!existing || !incoming) return false;
  if (existing.tabId && incoming.tabId && existing.tabId === incoming.tabId) return true;
  if (existing.sourceUrl && incoming.sourceUrl && existing.sourceUrl === incoming.sourceUrl) return true;
  return false;
}

function isGenericLocationValue(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return true;
  return /^skip to\b/i.test(cleaned) || /^(search|home|my network|jobs|messaging|notifications|about|people you may know|show all|premium|settings|help center|privacy|terms)$/i.test(cleaned);
}

function mergeRecord(existing, incoming) {
  const previous = typeof existing === 'string' ? { name: '', location: '', education: [] } : (existing || {});
  const previousName = normalizeText(previous.name || '');
  const previousLocation = normalizeText(previous.location || '');
  const incomingName = normalizeText(incoming.name || '');
  const incomingLocation = normalizeText(incoming.location || '');
  const nextName = previousName || incomingName;
  const nextLocation = previousLocation || (incomingLocation && !isGenericLocationValue(incomingLocation) ? incomingLocation : '');

  const merged = {
    ...previous,
    id: incoming.id || previous.id || `profile-${Date.now()}`,
    tabId: incoming.tabId || previous.tabId || null,
    name: normalizeText(nextName || ''),
    location: normalizeText(nextLocation || ''),
    education: uniqueList([...(previous.education || []), ...(incoming.education || [])]),
    sourceUrl: incoming.sourceUrl || previous.sourceUrl || '',
    updatedAt: new Date().toISOString(),
  };

  if (!merged.name && previous.name) merged.name = normalizeText(previous.name);
  if (!merged.location && previous.location) merged.location = normalizeText(previous.location);

  return merged;
}

function buildRecordText(record) {
  if (typeof record === 'string') return record.trim();

  const name = normalizeText(record.name || 'Unknown Name');
  const location = normalizeText(record.location || '');
  const education = uniqueList(record.education || []);

  const lines = [`Name: ${name}`, `Location: ${location}`, 'Education:'];
  if (education.length) {
    lines.push(...education);
  } else {
    lines.push('(none found)');
  }

  return lines.join('\n');
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'save_profile_record') {
    const incoming = msg.data || {};
    const tabId = sender && sender.tab && sender.tab.id;

    if (!incoming.name && !tabId) {
      sendResponse({ status: 'empty' });
      return false;
    }

    chrome.storage.local.get({ profileRecords: [], tabProfileMap: {} }, (result) => {
      const records = Array.isArray(result.profileRecords) ? result.profileRecords : [];
      const tabMap = result.tabProfileMap || {};
      const tabKey = tabId !== undefined ? String(tabId) : 'unknown';

      const candidate = {
        id: incoming.id || `profile-${Date.now()}`,
        tabId: tabId || null,
        name: normalizeText(incoming.name || ''),
        location: normalizeText(incoming.location || ''),
        education: uniqueList(incoming.education || []),
        sourceUrl: (sender && sender.tab && sender.tab.url) || '',
      };

      let updateIndex = -1;
      if (tabId !== undefined && tabMap[tabKey] !== undefined) {
        updateIndex = Number(tabMap[tabKey]);
      }

      const previousRecord = updateIndex >= 0 && updateIndex < records.length ? records[updateIndex] : null;
      const previousLocation = previousRecord ? normalizeText(previousRecord.location || '') : '';
      const previousName = previousRecord ? normalizeText(previousRecord.name || '') : '';
      const candidateLocation = normalizeText(candidate.location || '');
      const cleanedCandidateLocation = candidateLocation && !isGenericLocationValue(candidateLocation) ? candidateLocation : '';
      const finalName = normalizeText(previousName || candidate.name || '');
      const finalLocation = normalizeText(previousLocation || cleanedCandidateLocation || '');

      if (updateIndex >= 0 && updateIndex < records.length) {
        candidate.name = finalName;
        candidate.location = finalLocation;
      }

      if (updateIndex < 0) {
        for (let i = 0; i < records.length; i += 1) {
          if (isSameTabProfile(records[i], candidate)) {
            updateIndex = i;
            break;
          }
        }
      }

      if (updateIndex >= 0 && updateIndex < records.length) {
        records[updateIndex] = mergeRecord(records[updateIndex], candidate);
        if (tabId !== undefined) tabMap[tabKey] = updateIndex;
      } else {
        records.push(candidate);
        if (tabId !== undefined) tabMap[tabKey] = records.length - 1;
      }

      if (records.length) {
        records.forEach((record) => {
          if (!record.name) record.name = normalizeText(candidate.name || '');
          if (!record.location) record.location = normalizeText(candidate.location || '');
        });
      }

      chrome.storage.local.set({ profileRecords: records, tabProfileMap: tabMap }, () => {
        sendResponse({ status: 'saved', count: records.length, merged: updateIndex >= 0 });
      });
    });

    return true;
  }

  if (msg && msg.action === 'download_master_file') {
    const filename = msg.filename || 'employee_profiles.txt';
    chrome.storage.local.get({ profileRecords: [] }, (result) => {
      const records = Array.isArray(result.profileRecords) ? result.profileRecords : [];
      const content = records.length ? records.map(buildRecordText).join('\n\n') : 'No records saved yet.';
      const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
      chrome.downloads.download({ url, filename, conflictAction: 'overwrite' }, () => {
        sendResponse({ status: 'downloaded', count: records.length });
      });
    });
    return true;
  }

  if (msg && msg.action === 'clear_master_file') {
    chrome.storage.local.set({ profileRecords: [], tabProfileMap: {} }, () => {
      sendResponse({ status: 'cleared' });
    });
    return true;
  }

  if (msg && msg.action === 'download') {
    const filename = msg.filename || 'profile.txt';
    const content = msg.content || '';
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    chrome.downloads.download({ url, filename, conflictAction: 'uniquify' }, (id) => {
      sendResponse({ status: 'started', id });
    });
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get({ tabProfileMap: {} }, (result) => {
    const tabMap = result.tabProfileMap || {};
    const key = String(tabId);
    if (tabMap[key] !== undefined) {
      delete tabMap[key];
      chrome.storage.local.set({ tabProfileMap: tabMap });
    }
  });
});
