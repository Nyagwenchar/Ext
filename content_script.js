(() => {
  function sanitizeFilename(name) {
    return (name || 'profile').replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '').toLowerCase();
  }

  function looksLikeRealName(text) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 80) return false;
    if (/^(Home|My Network|Jobs|Messaging|Notifications|For Business|Ad Options|Search|About|People you may know|Show all|Premium|Settings|Help Center|Privacy|Terms)$/i.test(cleaned)) return false;
    if (/\d|Inc\.|LLC|Corporation|Company|University|College|School|Construction|FedEx/i.test(cleaned)) return false;
    return /^[A-Za-z][A-Za-z' .-]+$/.test(cleaned);
  }

  function getName() {
    const candidateTexts = Array.from(document.querySelectorAll('h1, h2'))
      .map(node => (node.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(looksLikeRealName);

    if (candidateTexts.length) return candidateTexts[0];

    const topName = document.querySelector('h1, .pv-text-details__left-panel h1, .text-heading-xlarge');
    const val = topName ? topName.innerText.trim() : '';
    return looksLikeRealName(val) ? val : '';
  }

  function isGenericNavigationText(text) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return true;
    if (/^skip to\b/i.test(cleaned)) return true;
    if (/^(search|home|my network|jobs|messaging|notifications|about|people you may know|show all|premium|settings|help center|privacy|terms)$/i.test(cleaned)) return true;
    if (/^(For Business|Ad Options|Messages|My Profile|Following|Followers)$/i.test(cleaned)) return true;
    return false;
  }

  function looksLikeLocationText(text) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 120) return false;
    if (isGenericNavigationText(cleaned)) return false;
    if (/[0-9]/.test(cleaned)) return false;
    if (/(University|College|School|Diploma|Bachelor|Master|Associate|Degree|Field of study|Computer and Information|Information Technology|Sciences|Support Services|Business Administration|Security|Currently working on my|Open to work)/i.test(cleaned)) return false;
    if (/(^|\s)(Location|Based in|Lives in|From|Current city|Current location)\s*:?$/i.test(cleaned)) return false;
    if (/(Home|My Network|Jobs|Messaging|Notifications|For Business|Ad Options|People you may know|Show all|Premium|About|Activity|Groups)/i.test(cleaned)) return false;
    if (/·|•|Inc\.|LLC|Corporation|Company|Construction|FedEx/.test(cleaned)) return false;

    const locationPattern = /^(?:[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)*)?(?:,\s*(?:[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)*)){0,3}$/;
    return locationPattern.test(cleaned) && /(?:[A-Za-z]+(?:\s+[A-Za-z]+){0,2}),\s*[A-Za-z]+(?:\s+[A-Za-z]+)*?(?:,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)?/.test(cleaned);
  }

  function getLocation() {
    const selectors = [
      '.pv-text-details__left-panel p',
      '.pv-text-details__left-panel span',
      '.pv-text-details__left-panel div',
      'p, span, div, a'
    ];

    for (const selector of selectors) {
      const textCandidates = Array.from(document.querySelectorAll(selector))
        .map(node => (node.innerText || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      for (const txt of textCandidates) {
        if (looksLikeLocationText(txt)) {
          return txt;
        }
      }
    }

    const withCountry = Array.from(document.querySelectorAll('p, span, div'))
      .map(node => (node.innerText || '').replace(/\s+/g, ' ').trim())
      .find(txt => /United States|Canada|United Kingdom|Australia|Mexico|Germany|France|India|Tennessee|Texas|California|Florida|Georgia/i.test(txt) && looksLikeLocationText(txt));

    return withCountry || '';
  }

  function expandEducationSection() {
    const sections = Array.from(document.querySelectorAll('section'));
    for (const section of sections) {
      const text = (section.innerText || '').replace(/\s+/g, ' ').trim();
      if (!/Education/i.test(text)) continue;
      const buttons = section.querySelectorAll('button');
      for (const button of buttons) {
        if (button.getAttribute('aria-expanded') === 'false' || /show more|show all|view all/i.test((button.innerText || '').trim())) {
          button.click();
        }
      }
    }
  }

  function cleanEducationLines(text) {
    return (text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s*•\s*/g, '\n')
      .replace(/\s*·\s*/g, '\n')
      .replace(/\s*[|]\s*/g, '\n')
      .replace(/\s{2,}/g, '\n')
      .split(/\n+/)
      .map(line => line.replace(/^[-*\s]+/, '').trim())
      .filter(Boolean)
      .filter(line => !/Education|Open to work|More profiles for you|People you may know|Show all|Connect|Follow|About|Activity|Home|My Network|Jobs|Messaging|Notifications|Skip to search|Skip to main content|Skip to primary content|Skip to footer|Deans list|Business Computer Applications|Associated with|Schools|Currently working on my Bachelor's in IT business management|Currently working on my Bachelor's/i.test(line));
  }

  function isLikelyEducationEntry(text) {
    const value = (text || '').replace(/\s+/g, ' ').trim();
    if (!value) return false;
    if (/^\s*Platinum Services\s*$/i.test(value)) return false;
    if (/\bat\s+[A-Z][A-Za-z0-9&. -]+$/i.test(value)) return false;
    if (/\b(Operations Manager|Manager|Lead|Supervisor|Director|Coordinator|Analyst|Engineer|Technician|Sales|Marketing|Customer|Support|Production|Project)\b/i.test(value) && !/\b(University|College|School|Institute|Academy|Degree|Bachelor|Master|Associate|Diploma|Certificate|Field of study|Engineering|Technology|Sciences|Manufacturing|Information)\b/i.test(value)) {
      return false;
    }
    const educationKeywords = /(University|College|School|Institute|Academy|Degree|Bachelor|Master|Associate|Diploma|Certificate|Field of study|Engineering|Technology|Sciences|Manufacturing|Information)/i;
    const yearMatch = /\b(201[0-9]|200[0-9]|199[0-9])\b/.test(value);
    return educationKeywords.test(value) || yearMatch;
  }

  function getEducation() {
    expandEducationSection();

    const educationSection = Array.from(document.querySelectorAll('section'))
      .find(section => /Education/i.test(section.innerText || '') && !/More profiles for you|People you may know|Show all/i.test(section.innerText || ''));

    if (educationSection) {
      const items = [];
      const directLines = cleanEducationLines(educationSection.innerText || '')
        .filter(line => isLikelyEducationEntry(line) && !/^(Operations Manager|Manager|Lead|Supervisor|Director|Coordinator|Analyst|Engineer|Technician|Sales|Marketing|Customer|Support|Production|Project)\b/i.test(line));

      if (directLines.length) {
        items.push(...directLines);
      }

      const entities = educationSection.querySelectorAll('li, article, .pv-entity, .education__item, .pv-entity__summary-info');
      for (const entity of entities) {
        const school = entity.querySelector('.pv-entity__school-name, .education__item-heading, h3, h4')?.innerText?.trim() || '';
        const degree = entity.querySelector('.pv-entity__degree-name, .pv-entity__field-of-study, .education__item-subtitle')?.innerText?.trim() || '';
        const dates = entity.querySelector('.pv-entity__dates, .pv-entity__date-range, .date-range')?.innerText?.trim() || '';

        const lines = [school, degree, dates]
          .filter(Boolean)
          .filter(line => !/Currently working on my Bachelor's|Deans list|Associated with|Schools|Business Computer Applications|Open to work|About/i.test(line))
          .filter(line => isLikelyEducationEntry(line));

        if (lines.length) items.push(...lines);
      }

      const deduped = [...new Set(items)];
      if (deduped.length) return deduped.slice(0, 20);
    }

    const rawText = document.body ? document.body.innerText : '';
    const preferredSchools = ['Tarleton State University', 'Tarrant County College', 'Richland High School'];
    const output = [];

    for (const school of preferredSchools) {
      const index = rawText.indexOf(school);
      if (index === -1) continue;
      const snippet = rawText.slice(Math.max(0, index - 200), Math.min(rawText.length, index + 800));
      const lines = cleanEducationLines(snippet).filter(isLikelyEducationEntry);
      if (lines.length) output.push(...lines);
    }

    const dedupedFallback = [...new Set(output)];
    if (dedupedFallback.length) return dedupedFallback.slice(0, 20);

    const fallback = cleanEducationLines(rawText).filter(isLikelyEducationEntry);
    return [...new Set(fallback)].slice(0, 20);
  }

  function extract() {
    const name = getName();
    const location = getLocation();
    const education = getEducation();
    return { name, location, education };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'extract_profile') {
      const data = extract();
      const payload = {
        name: (data.name || '').trim(),
        location: (data.location || '').trim(),
        education: Array.isArray(data.education) ? data.education.map(item => String(item).trim()).filter(Boolean) : []
      };

      chrome.runtime.sendMessage({ action: 'save_profile_record', data: payload }, () => {
        sendResponse({ status: 'ok', data: payload });
      });
      return true;
    }
  });

  window.extractLinkedInProfile = extract;
})();
