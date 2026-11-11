let assets = [];
let dashboardStats = { total: 0, assigned: 0, stock: 0, repair: 0, unassigned: 0 };

const body = document.querySelector('#assetTableBody');
const total = document.querySelector('#totalAssets');
const assigned = document.querySelector('#assignedAssets');
const stock = document.querySelector('#stockAssets');
const action = document.querySelector('#actionAssets');
const overviewContent = document.querySelector('#overviewContent');
const secondaryView = document.querySelector('#secondaryView');

function statusClass(status) { return status === 'Assigned' ? 'assigned' : status === 'In stock' ? 'stock' : 'repair'; }
function initialsFor(owner) { return owner === 'Unassigned' ? '' : owner.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
function iconFor(category) { return category === 'Mobile devices' ? '▯' : category === 'Peripherals' ? '⌨' : category === 'Network' ? '⌁' : '◐'; }
function displayDate(iso) { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
function assetRow(a) {
  const initials = initialsFor(a.owner);
  return `<tr><td><div class="asset-cell"><div class="asset-logo">${iconFor(a.category)}</div><div><strong>${a.name}</strong><small>${a.tag}</small></div></div></td><td><div class="owner"><span class="owner-avatar ${initials ? '' : 'unassigned'}">${initials || '—'}</span>${a.owner}</div></td><td><span class="status ${statusClass(a.status)}">${a.status}</span></td><td>${displayDate(a.updated_at)}</td><td><button class="row-menu" aria-label="More options">•••</button></td></tr>`;
}
function render(rows = assets) {
  body.innerHTML = rows.map(assetRow).join('');
}
async function loadAssets() {
  const [assetResponse, statResponse] = await Promise.all([fetch('/api/assets'), fetch('/api/stats')]);
  if (!assetResponse.ok || !statResponse.ok) throw new Error('Could not load inventory data.');
  assets = await assetResponse.json();
  const stats = await statResponse.json();
  dashboardStats = stats;
  const isEmpty = stats.total === 0;
  const displayCount = value => isEmpty ? '—' : value;
  total.textContent = displayCount(stats.total);
  assigned.textContent = displayCount(stats.assigned);
  stock.textContent = displayCount(stats.stock);
  action.textContent = displayCount(stats.repair);
  const assetBadge = document.querySelector('#sidebarAssetCount');
  const requestBadge = document.querySelector('#sidebarRequestCount');
  assetBadge.textContent = stats.total;
  requestBadge.textContent = stats.unassigned;
  assetBadge.hidden = isEmpty;
  requestBadge.hidden = isEmpty;
  document.querySelector('#attentionCount').textContent = isEmpty ? 'No items' : `${stats.repair + stats.unassigned} items`;
  document.querySelector('#repairAttention').textContent = isEmpty ? 'No assets to review yet' : `${stats.repair} ${stats.repair === 1 ? 'asset' : 'assets'} currently under repair`;
  document.querySelector('#unassignedAttention').textContent = isEmpty ? 'No assets to assign yet' : `${stats.unassigned} ${stats.unassigned === 1 ? 'asset' : 'assets'} ready for assignment`;
  document.querySelector('#activeAttention').textContent = isEmpty ? 'No active assets yet' : `${stats.assigned} ${stats.assigned === 1 ? 'asset' : 'assets'} assigned to team members`;
  const categoryBindings = {
    'Computers': ['computersCount', 'computersBar', 'computersPercent'],
    'Mobile devices': ['mobileCount', 'mobileBar', 'mobilePercent'],
    'Peripherals': ['peripheralsCount', 'peripheralsBar', 'peripheralsPercent'],
    'Network': ['networkCount', 'networkBar', 'networkPercent']
  };
  Object.entries(categoryBindings).forEach(([category, [countId, barId, percentId]]) => {
    const count = stats.categories[category] || 0;
    const percentage = stats.total ? Math.round((count / stats.total) * 100) : 0;
    document.querySelector(`#${countId}`).textContent = isEmpty ? 'No assets yet' : `${count} ${count === 1 ? 'asset' : 'assets'}`;
    document.querySelector(`#${barId}`).style.width = `${percentage}%`;
    document.querySelector(`#${percentId}`).textContent = isEmpty ? '—' : `${percentage}%`;
  });
  render();
  renderCurrentView();
}
document.querySelector('#currentDate').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase();
loadAssets().catch(error => { body.innerHTML = `<tr><td colspan="5">${error.message} Start the project with <code>py run.py</code>.</td></tr>`; });

document.querySelector('#assetSearch').addEventListener('input', event => {
  const query = event.target.value.toLowerCase();
  render(assets.filter(a => `${a.name} ${a.tag} ${a.owner}`.toLowerCase().includes(query)));
});

const dialog = document.querySelector('#assetDialog');
document.querySelector('#addAssetButton').addEventListener('click', () => dialog.showModal());
document.querySelector('#assetForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const response = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
  if (!response.ok) { alert((await response.json()).error || 'Could not add asset.'); return; }
  event.currentTarget.reset(); dialog.close(); await loadAssets();
});

const upload = document.querySelector('#uploadZone');
upload.addEventListener('dragover', event => { event.preventDefault(); upload.style.borderColor = '#5662ef'; });
upload.addEventListener('dragleave', () => upload.style.borderColor = '');
upload.addEventListener('drop', event => { event.preventDefault(); upload.style.borderColor = ''; const file = event.dataTransfer.files[0]; if (file) upload.querySelector('strong').textContent = file.name; });

function currentView() {
  const view = location.hash.replace('#', '');
  return ['overview', 'assets', 'lifecycle', 'requests', 'reports', 'settings', 'profile'].includes(view) ? view : 'overview';
}

function emptyMessage(message) {
  return `<p style="margin:22px 0 0;padding:18px;border:1px dashed #dedde4;border-radius:8px;color:#858390;font-size:12px">${message}</p>`;
}

function renderCurrentView() {
  const view = currentView();
  document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === view));
  overviewContent.hidden = view !== 'overview';
  secondaryView.hidden = view === 'overview';
  if (view === 'overview') return;
  const table = assets.length ? `<div class="table-wrap" style="margin:22px -23px -23px"><table><thead><tr><th>ASSET</th><th>ASSIGNED TO</th><th>STATUS</th><th>LAST UPDATED</th><th></th></tr></thead><tbody>${assets.map(assetRow).join('')}</tbody></table></div>` : emptyMessage('No assets yet. Select “Add asset” to create your first inventory record.');
  const templates = {
    assets: `<section class="panel"><div class="panel-heading"><div><h2>All assets</h2><p>Your live inventory database</p></div><button class="primary-button" onclick="document.querySelector('#addAssetButton').click()"><span>+</span> Add asset</button></div>${table}</section>`,
    lifecycle: `<section class="panel"><div class="panel-heading"><div><h2>Asset lifecycle</h2><p>Current status of your inventory</p></div></div><div class="stats-grid" style="margin:24px 0 0"><article class="stat-card"><span class="stat-label">ASSIGNED</span><strong>${dashboardStats.assigned || '—'}</strong></article><article class="stat-card"><span class="stat-label">IN STOCK</span><strong>${dashboardStats.stock || '—'}</strong></article><article class="stat-card"><span class="stat-label">IN REPAIR</span><strong>${dashboardStats.repair || '—'}</strong></article></div>${assets.length ? table : emptyMessage('Lifecycle activity will appear after you add assets.')}</section>`,
    requests: `<section class="panel"><div class="panel-heading"><div><h2>Asset requests</h2><p>Assets waiting to be assigned</p></div></div>${dashboardStats.unassigned ? `<p style="margin-top:24px;font-size:13px">${dashboardStats.unassigned} unassigned asset${dashboardStats.unassigned === 1 ? '' : 's'} ready for allocation.</p>` : emptyMessage('There are no pending asset requests.')}</section>`,
    reports: `<section class="panel"><div class="panel-heading"><div><h2>Reports</h2><p>Live inventory summary</p></div></div><div class="stats-grid" style="margin:24px 0 0"><article class="stat-card"><span class="stat-label">ALL ASSETS</span><strong>${dashboardStats.total || '—'}</strong></article><article class="stat-card"><span class="stat-label">ASSIGNMENT RATE</span><strong>${dashboardStats.total ? Math.round((dashboardStats.assigned / dashboardStats.total) * 100) + '%' : '—'}</strong></article></div>${emptyMessage('Reports update automatically as assets are added to the inventory.')}</section>`,
    settings: `<section class="panel"><div class="panel-heading"><div><h2>Settings</h2><p>Configure your local AssetFlow workspace</p></div></div><div style="margin-top:22px;display:grid;gap:12px"><label style="display:flex;justify-content:space-between;align-items:center;padding:15px;border:1px solid #e9e8ed;border-radius:8px;font-size:12px">Show empty-state guidance <input type="checkbox" checked></label><label style="display:flex;justify-content:space-between;align-items:center;padding:15px;border:1px solid #e9e8ed;border-radius:8px;font-size:12px">Open dashboard automatically <input type="checkbox" checked></label></div></section>`
    ,profile: `<section class="panel"><div class="panel-heading"><div><h2>My profile</h2><p>Manage your AssetFlow display details</p></div></div><form id="profileForm" style="max-width:520px;margin-top:24px;display:grid;gap:16px"><label style="font-size:11px;font-weight:700;color:#6d6b78">Display name<input id="profileNameInput" required value="${document.querySelector('#profileName').textContent}" style="display:block;width:100%;margin-top:6px;border:1px solid #dedde3;border-radius:6px;padding:10px;font-size:12px"></label><label style="font-size:11px;font-weight:700;color:#6d6b78">Role<input id="profileRoleInput" required value="${document.querySelector('#profileRole').textContent}" style="display:block;width:100%;margin-top:6px;border:1px solid #dedde3;border-radius:6px;padding:10px;font-size:12px"></label><div><button class="primary-button" type="submit">Save profile</button></div></form></section>`
  };
  secondaryView.innerHTML = templates[view];
  if (view === 'profile') {
    secondaryView.querySelector('#profileForm').addEventListener('submit', event => {
      event.preventDefault();
      const name = secondaryView.querySelector('#profileNameInput').value.trim();
      const role = secondaryView.querySelector('#profileRoleInput').value.trim();
      document.querySelector('#profileName').textContent = name;
      document.querySelector('#profileRole').textContent = role;
      document.querySelector('#greetingName').textContent = name.split(' ')[0];
      localStorage.setItem('assetflow-profile', JSON.stringify({ name, role }));
    });
  }
}

document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', () => setTimeout(renderCurrentView, 0)));
const profileButton = document.querySelector('#profileButton');
profileButton.addEventListener('click', () => { location.hash = 'profile'; });
profileButton.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); location.hash = 'profile'; } });
const savedProfile = JSON.parse(localStorage.getItem('assetflow-profile') || 'null');
if (savedProfile) {
  document.querySelector('#profileName').textContent = savedProfile.name;
  document.querySelector('#profileRole').textContent = savedProfile.role;
  document.querySelector('#greetingName').textContent = savedProfile.name.split(' ')[0];
}
window.addEventListener('hashchange', renderCurrentView);
renderCurrentView();
