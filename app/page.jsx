"use client";

import { useEffect, useMemo, useState } from "react";

const categoryList = ["Computers", "Mobile devices", "Peripherals", "Network"];
const iconFor = category => ({ "Mobile devices": "▯", Peripherals: "⌨", Network: "⌁" }[category] || "◐");
const initials = owner => owner === "Unassigned" ? "—" : owner.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase();

export default function AssetFlow() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState({ name: "Priya Mehta", role: "IT Operations" });

  const load = async () => {
    const [assetsResponse, statsResponse] = await Promise.all([fetch("/api/assets", { cache: "no-store" }), fetch("/api/stats", { cache: "no-store" })]);
    setAssets(await assetsResponse.json());
    setStats(await statsResponse.json());
  };
  useEffect(() => { load(); const saved = localStorage.getItem("assetflow-profile"); if (saved) setProfile(JSON.parse(saved)); }, []);
  const filteredAssets = useMemo(() => assets.filter(asset => `${asset.name} ${asset.tag} ${asset.owner}`.toLowerCase().includes(search.toLowerCase())), [assets, search]);
  const empty = !stats || stats.total === 0;
  const navigate = target => { setView(target); window.location.hash = target; };
  const saveProfile = event => { event.preventDefault(); const data = new FormData(event.currentTarget); const next = { name: data.get("name"), role: data.get("role") }; setProfile(next); localStorage.setItem("assetflow-profile", JSON.stringify(next)); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>assetflow</span></div>
      <nav className="nav" aria-label="Primary navigation">
        {[["overview", "▦", "Overview"], ["assets", "▤", "Assets"], ["lifecycle", "↗", "Lifecycle"], ["requests", "◌", "Requests"], ["reports", "◫", "Reports"]].map(([key, icon, label]) => <button key={key} className={`nav-item ${view === key ? "active" : ""}`} onClick={() => navigate(key)}><span className="nav-icon">{icon}</span>{label}{key === "assets" && !empty && <span className="nav-count">{stats.total}</span>}{key === "requests" && !empty && <span className="nav-count alert">{stats.unassigned}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><span className="nav-icon">⚙</span>Settings</button>
        <button className="profile" onClick={() => navigate("profile")}><div className="avatar">{initials(profile.name)}</div><div><strong>{profile.name}</strong><small>{profile.role}</small></div><span className="dots">•••</span></button>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">{new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()}</p><h1>Good morning, {profile.name.split(" ")[0]} <span className="wave">✦</span></h1></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button><button className="icon-button" aria-label="Help">?</button><button className="primary-button" onClick={() => setDialogOpen(true)}><span>+</span> Add asset</button></div></header>
      {view === "overview" && <Overview stats={stats} empty={empty} assets={filteredAssets} search={search} setSearch={setSearch} />}
      {view === "assets" && <Panel title="All assets" subtitle="Your live inventory database"><AssetTable assets={filteredAssets} /></Panel>}
      {view === "lifecycle" && <Panel title="Asset lifecycle" subtitle="Current status of your inventory"><div className="stats-grid" style={{ marginTop: 24 }}><Stat label="Assigned" value={empty ? "—" : stats.assigned} /><Stat label="In stock" value={empty ? "—" : stats.stock} /><Stat label="In repair" value={empty ? "—" : stats.repair} /></div></Panel>}
      {view === "requests" && <Panel title="Asset requests" subtitle="Assets waiting to be assigned"><p className="empty-note">{empty ? "There are no pending asset requests." : `${stats.unassigned} unassigned asset${stats.unassigned === 1 ? "" : "s"} ready for allocation.`}</p></Panel>}
      {view === "reports" && <Panel title="Reports" subtitle="Live inventory summary"><div className="stats-grid" style={{ marginTop: 24 }}><Stat label="All assets" value={empty ? "—" : stats.total} /><Stat label="Assignment rate" value={empty ? "—" : `${Math.round(stats.assigned / stats.total * 100)}%`} /></div></Panel>}
      {view === "settings" && <Panel title="Settings" subtitle="Configure your local AssetFlow workspace"><div className="settings-list"><label className="setting-row">Show empty-state guidance <input type="checkbox" defaultChecked /></label><label className="setting-row">Open dashboard automatically <input type="checkbox" defaultChecked /></label></div></Panel>}
      {view === "profile" && <Panel title="My profile" subtitle="Manage your AssetFlow display details"><form className="form-grid" style={{ maxWidth: 540, marginTop: 24 }} onSubmit={saveProfile}><label>Display name<input name="name" required defaultValue={profile.name} /></label><label>Role<input name="role" required defaultValue={profile.role} /></label><div><button className="primary-button" type="submit">Save profile</button></div></form></Panel>}
    </main>
    {dialogOpen && <AddAssetDialog close={() => setDialogOpen(false)} reload={load} />}
  </div>;
}

function Panel({ title, subtitle, children }) { return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Stat({ label, value }) { return <article className="stat-card"><span className="stat-label">{label.toUpperCase()}</span><strong>{value}</strong></article>; }
function AssetTable({ assets }) { return assets.length ? <div className="table-wrap"><table><thead><tr><th>ASSET</th><th>ASSIGNED TO</th><th>STATUS</th><th>LAST UPDATED</th></tr></thead><tbody>{assets.map(asset => <tr key={asset.tag}><td><div className="asset-cell"><div className="asset-logo">{iconFor(asset.category)}</div><div><strong>{asset.name}</strong><small>{asset.tag}</small></div></div></td><td><div className="owner"><span className={`owner-avatar ${asset.owner === "Unassigned" ? "unassigned" : ""}`}>{initials(asset.owner)}</span>{asset.owner}</div></td><td><span className={`status ${asset.status === "Assigned" ? "assigned" : asset.status === "In stock" ? "stock" : "repair"}`}>{asset.status}</span></td><td>{new Date(asset.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="empty-note">No assets yet. Use “Add asset” to create your first inventory record.</p>; }
function Overview({ stats, empty, assets, search, setSearch }) { const count = category => stats?.categories?.[category] || 0; return <><section className="stats-grid"><Stat label="Total assets" value={empty ? "—" : stats.total} /><Stat label="Assigned" value={empty ? "—" : stats.assigned} /><Stat label="In stock" value={empty ? "—" : stats.stock} /><Stat label="Requires action" value={empty ? "—" : stats.repair} /></section><section className="content-grid"><section className="panel category-panel"><div className="panel-heading"><div><h2>Asset categories</h2><p>Distribution across your organization</p></div></div><div className="categories">{categoryList.map(category => { const value = count(category); const percentage = stats?.total ? Math.round(value / stats.total * 100) : 0; return <div className="category-row" key={category}><div className="category-icon coral">{iconFor(category)}</div><div className="category-info"><strong>{category}</strong><span>{empty ? "No assets yet" : `${value} assets`}</span></div><div className="bar-track"><i style={{ width: `${percentage}%` }} /></div><b>{empty ? "—" : `${percentage}%`}</b></div>; })}</div></section><section className="panel action-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Items that need a decision</p></div><span className="pill">{empty ? "No items" : `${stats.repair + stats.unassigned} items`}</span></div><div className="attention-list"><Attention title="Assets in repair" text={empty ? "No assets to review yet" : `${stats.repair} assets currently under repair`} /><Attention title="Unassigned assets" text={empty ? "No assets to assign yet" : `${stats.unassigned} assets ready for assignment`} /><Attention title="Active assets" text={empty ? "No active assets yet" : `${stats.assigned} assets assigned to team members`} /></div></section></section><section className="panel assets-panel"><div className="panel-heading assets-heading"><div><h2>Recent assets</h2><p>Latest updates across your inventory</p></div><label className="search">⌕<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search assets" /></label></div><AssetTable assets={assets} /></section></>; }
function Attention({ title, text }) { return <div className="attention-item"><span className="attention-symbol amber">!</span><div><strong>{title}</strong><p>{text}</p></div><span className="chevron">›</span></div>; }
function AddAssetDialog({ close, reload }) { const [error, setError] = useState(""); const submit = async event => { event.preventDefault(); const response = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); if (!response.ok) { setError((await response.json()).error); return; } await reload(); close(); }; return <div className="modal-backdrop"><form className="asset-modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">INVENTORY</p><h2>Add new asset</h2></div><button className="close-button" type="button" onClick={close}>×</button></div><div className="form-grid"><label>Asset name<input name="name" required placeholder="e.g. MacBook Pro 14”" /></label><label>Asset tag<input name="tag" required placeholder="e.g. AF-0001" /></label><label>Category<select name="category">{categoryList.map(category => <option key={category}>{category}</option>)}</select></label><label>Assigned to<input name="owner" placeholder="Unassigned" /></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="primary-button">Add to inventory</button></div></form></div>; }
