const FALLBACK_RULES = [
  {
    name: 'Rules data unavailable',
    value: 'fallback view',
    description: 'The rules data file could not be loaded.',
    reason: 'This page is read-only and depends on rules.json for its current content.',
    affectedModules: ['System'],
    editability: 'Read-only',
    riskLevel: 'Medium',
  },
];

const RISK_CLASS = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
};

function text(value) {
  return String(value ?? '').trim();
}

function modulesList(modules) {
  const items = Array.isArray(modules) ? modules : [];
  if (!items.length) return '<span class="muted-text">Not specified</span>';
  return `<ul class="rules-module-list">${items.map((item) => `<li>${text(item)}</li>`).join('')}</ul>`;
}

function ruleCard(rule, index) {
  const risk = text(rule.riskLevel) || 'Medium';
  const riskClass = RISK_CLASS[risk] || 'medium';
  return `
    <article class="rule-card" aria-labelledby="rule-${index}">
      <div class="rule-card-head">
        <div>
          <p class="rule-index">Rule ${index + 1}</p>
          <h2 id="rule-${index}">${text(rule.name)}</h2>
        </div>
        <span class="risk-badge ${riskClass}">${risk}</span>
      </div>
      <dl class="rule-definition-grid">
        <div><dt>Current value</dt><dd>${text(rule.value)}</dd></div>
        <div><dt>Description</dt><dd>${text(rule.description)}</dd></div>
        <div><dt>Reason</dt><dd>${text(rule.reason)}</dd></div>
        <div><dt>Affected modules</dt><dd>${modulesList(rule.affectedModules)}</dd></div>
        <div><dt>Editable or fixed</dt><dd>${text(rule.editability)}</dd></div>
        <div><dt>Risk if changed</dt><dd>${risk}</dd></div>
      </dl>
    </article>
  `;
}

function renderRules(rules) {
  const list = document.querySelector('#rules-list');
  const count = document.querySelector('#rules-count');
  const moduleCount = document.querySelector('#module-count');
  const riskCount = document.querySelector('#high-risk-count');
  const data = Array.isArray(rules) && rules.length ? rules : FALLBACK_RULES;
  const modules = new Set(data.flatMap((rule) => Array.isArray(rule.affectedModules) ? rule.affectedModules : []));
  const highRisk = data.filter((rule) => text(rule.riskLevel).toLowerCase() === 'high').length;

  list.innerHTML = data.map(ruleCard).join('');
  count.textContent = data.length;
  moduleCount.textContent = modules.size;
  riskCount.textContent = highRisk;
}

async function loadRules() {
  try {
    const response = await fetch('rules.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Rules request failed: ${response.status}`);
    renderRules(await response.json());
  } catch (error) {
    console.error('Rules page load failed:', error);
    renderRules(FALLBACK_RULES);
  }
}

loadRules();
