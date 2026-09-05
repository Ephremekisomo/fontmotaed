import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import QRCode from "qrcode";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import "./App.css";
import { authMe as apiAuthMe, createIdentification, createUser as apiCreateUser, getChart as apiGetChart, getStats as apiGetStats, listRiders as apiListRiders, listUsers as apiListUsers, login as apiLogin, logout as apiLogout, verifyIdentification as apiVerifyIdentification, type ApiUser, type CreateIdentificationInput, type CreateIdentificationResponse, type IdentificationSheetPayload } from "./api";

type Rider = {
  id: string;
  name: string;
  initials: string;
  type: string;
  idNumber: string;
  plate: string;
  zone: string;
  status: "Actif" | "Suspendu" | "Expiré" | "Désactivé";
  joined: string;
  color: string;
  photoUrl?: string | null;
};
const demoRiders: Rider[] = [
  { id: "demo-1", name: "Blaise Kanku", initials: "BK", type: "Motard", idNumber: "MOT-2024-0847", plate: "KN-5421-AB", zone: "Ngaliema", status: "Actif", joined: "Aujourd’hui, 09:42", color: "#dfb28d" },
  { id: "demo-2", name: "Jean-Pierre Mbuyi", initials: "JM", type: "Taxi", idNumber: "TAX-2024-0846", plate: "CD-8842-KL", zone: "Gombe", status: "Actif", joined: "Hier, 16:18", color: "#aebfd1" },
  { id: "demo-3", name: "Grace Lukusa", initials: "GL", type: "Motard", idNumber: "MOT-2024-0845", plate: "KN-2201-CB", zone: "Limete", status: "Suspendu", joined: "12 juin 2024", color: "#c99887" },
  { id: "demo-4", name: "Patrick Ilunga", initials: "PI", type: "Taxi-bus", idNumber: "BUS-2024-0844", plate: "CD-1130-AA", zone: "Kintambo", status: "Expiré", joined: "11 juin 2024", color: "#93a49f" },
];
function App() {
  const [page, setPage] = useState<
    "login" | "dashboard" | "riders" | "add" | "verify" | "settings" | "help"
  >("login");
  const [riders, setRiders] = useState(demoRiders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [mobileNav, setMobileNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  void photoPreview;
  const [stats, setStats] = useState<{ riders: number; activeRiders: number; qrCodes: number; verifications: number } | null>(null);
  const [chartData, setChartData] = useState<{ day: string; count: number }[]>([]);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scannedRider, setScannedRider] = useState<IdentificationSheetPayload | null>(null);
  const [scanError, setScanError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string; email: string; role: string } | null>(null);
  const filteredRiders = useMemo(
    () =>
      riders.filter(
        (rider) =>
          `${rider.name} ${rider.idNumber} ${rider.plate}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter === "Tous" ||
            rider.status === filter ||
            rider.type === filter),
      ),
    [riders, query, filter],
  );
  const publicCode = window.location.pathname.match(/^\/verify\/([^/]+)\/?$/)?.[1];
  useEffect(() => {
    if (!isAuthenticated) return;
    apiListRiders().then((items) => setRiders(items.map((item) => ({ id: item.id, name: `${item.first_name} ${item.last_name}`, initials: `${item.first_name[0]}${item.last_name[0]}`, type: item.driver_type === "chauffeur_taxi" ? "Taxi" : item.driver_type === "chauffeur_taxi_bus" ? "Taxi-bus" : "Motard", idNumber: item.identification_number, plate: item.plate_number ?? "À attribuer", zone: item.activity_zone ?? "Non renseignée", status: item.status === "suspendu" ? "Suspendu" : item.status === "expire" ? "Expiré" : item.status === "desactive" ? "Désactivé" : "Actif", joined: new Date(item.created_at).toLocaleDateString("fr-FR"), color: "#9fb8ad", photoUrl: item.photo_url })))).catch(() => undefined);
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    apiAuthMe().then((data) => {
      if (data.profile) {
        setCurrentUser({ id: data.profile.email, fullName: data.profile.full_name, email: data.profile.email, role: data.profile.role });
      }
    }).catch(() => undefined);
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    apiGetStats().then(setStats).catch(() => undefined);
    apiGetChart().then(setChartData).catch(() => undefined);
  }, [isAuthenticated]);
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  const handleQrScan = async (code: string) => {
    setQrScannerOpen(false);
    setScanError("");
    try {
      const response = await apiVerifyIdentification(code);
      if (response.success) setScannedRider(response.identification);
      setPage("riders");
    } catch (err) {
      setScannedRider(null);
      setScanError(err instanceof Error ? err.message : "Identité introuvable");
    }
  };
  if (publicCode) return <Verify initialCode={decodeURIComponent(publicCode)} />;
  if (!isAuthenticated)
    return (
      <Login
        onLogin={async () => {
          setIsAuthenticated(true);
          setPage("dashboard");
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={19} />
          </div>
          <div>
            <strong>MOTAED</strong>
            <span>Gestion & Identité</span>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <span>ESPACE ADMINISTRATION</span>
          <button className="org-select">
            Organisation RDC <ChevronDown size={14} />
          </button>
        </div>
        <nav>
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Vue d’ensemble"
            active={page === "dashboard"}
            onClick={() => {
              setPage("dashboard");
              setMobileNav(false);
            }}
          />
          <NavItem
            icon={<Users size={18} />}
            label="Motards & chauffeurs"
            active={page === "riders"}
            onClick={() => {
              setPage("riders");
              setMobileNav(false);
            }}
          />
          <NavItem
            icon={<FilePlus2 size={18} />}
            label="Ajouter un profil"
            active={page === "add"}
            onClick={() => {
              setPage("add");
              setMobileNav(false);
            }}
          />
          <NavItem
            icon={<QrCode size={18} />}
            label="Vérifier une identité"
            active={page === "verify"}
            onClick={() => {
              setPage("verify");
              setMobileNav(false);
            }}
          />
        </nav>
        <div className="nav-bottom">
          <NavItem icon={<Settings size={18} />} label="Paramètres" active={page === "settings"} onClick={() => { setPage("settings"); setMobileNav(false); }} />
          <NavItem icon={<CircleHelp size={18} />} label="Centre d’aide" active={page === "help"} onClick={() => { setPage("help"); setMobileNav(false); }} />
          <div className="user-mini">
            <div className="avatar small">AM</div>
            <div>
              <strong>Amadou Mukendi</strong>
              <span>Super administrateur</span>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <main className="main">
        <header>
          <button
            className="icon-button menu-button"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Administration</span>
            <ArrowRight size={14} />
            <strong>
              {page === "dashboard"
                ? "Vue d’ensemble"
                : page === "riders"
                  ? "Motards & chauffeurs"
                  : page === "add"
                    ? "Nouveau profil"
                    : page === "verify"
                      ? "Vérifier une identité"
                      : page === "settings"
                        ? "Paramètres"
                        : "Centre d’aide"}
            </strong>
          </div>
          <div className="header-actions">
            <button className="icon-button" title="Notifications">
              <Bell size={19} />
              <i />
            </button>
            <div
              className="profile-control"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="avatar">AM</div>
              <div>
                <strong>Amadou Mukendi</strong>
                <span>Super administrateur</span>
              </div>
              <ChevronDown size={15} />
            </div>
            {showProfile && (
              <div className="profile-menu">
                <button>
                  <UserRound size={15} /> Mon profil
                </button>
                <button onClick={async () => { await apiLogout().catch(() => undefined); setShowProfile(false); setIsAuthenticated(false) }}>
                  <LogOut size={15} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="content">
          {page === "dashboard" && (
            <Dashboard
              onAdd={() => setPage("add")}
              onRiders={() => setPage("riders")}
              riders={riders}
              stats={stats}
              chartData={chartData}
              onOpenQrScanner={() => setQrScannerOpen(true)}
              currentUser={currentUser}
            />
          )}
          {page === "riders" && (
            <>{scannedRider && !page.includes('verify') && <div className="verify-result" style={{ marginBottom: 18 }}><strong>{scannedRider.driver.first_name} {scannedRider.driver.last_name}</strong><span className="mono">{scannedRider.identification_number}</span><span>{scannedRider.administrative.status}</span></div>}{scanError && <p className="login-error" style={{ marginBottom: 18 }}>{scanError}</p>}<Riders riders={filteredRiders} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onAdd={() => setPage("add")} onOpenQrScanner={() => setQrScannerOpen(true)} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onStatusChange={async (id, status) => { setRiders(riders.map((r) => (r.id === id ? { ...r, status: status === "actif" ? "Actif" : status === "suspendu" ? "Suspendu" : status === "expire" ? "Expiré" : "Désactivé" } : r))); setOpenMenuId(null); }} onDelete={async (id) => { setRiders(riders.filter((r) => r.id !== id)); setOpenMenuId(null); }} /></>
          )}
          {page === "add" && (
            <NewIdentificationSheet
              onCancel={() => { setPage("riders"); setPhotoPreview(null); }}
              onCreated={() => { setPage("riders"); setPhotoPreview(null); }}
            />
          )}
          {page === "verify" && <Verify />}
          {page === "settings" && <AdminSettings />}
          {page === "help" && <HelpCenter />}
          {qrScannerOpen && <QrScanner onScan={handleQrScan} onClose={() => setQrScannerOpen(false)} />}
        </div>
      </main>
    </div>
  );
}
function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={active ? "nav-item active" : "nav-item"}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {label === "Motards & chauffeurs" && <em>248</em>}
    </button>
  );
}
function RiderMenu({
  riderId,
  riderName,
  onStatusChange,
  onDelete,
  openMenuId,
  setOpenMenuId,
}: {
  riderId: string;
  riderName: string;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  openMenuId: string | null;
  setOpenMenuId: (v: string | null) => void;
}) {
  const isOpen = openMenuId === riderId;
  return (
    <div className="row-menu-wrap">
      <button
        className="row-menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(isOpen ? null : riderId);
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && (
        <div className="row-menu-dropdown">
          <button onClick={() => { setOpenMenuId(null); onStatusChange(riderId, 'actif'); }}><Check size={14} /> Marquer actif</button>
          <button onClick={() => { setOpenMenuId(null); onStatusChange(riderId, 'suspendu'); }}><X size={14} /> Suspendre</button>
          <button onClick={() => { setOpenMenuId(null); onStatusChange(riderId, 'desactive'); }}><X size={14} /> Désactiver</button>
          <button className="danger" onClick={() => { if (window.confirm(`Supprimer le profil de ${riderName} ?`)) onDelete(riderId); }}><Trash2 size={14} /> Supprimer</button>
        </div>
      )}
    </div>
  );
}
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@motaed.cd");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiLogin(email, password);
      onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-decoration">
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
        <div className="login-signal">
          <ShieldCheck size={45} />
          <span>
            IDENTITÉ
            <br />
            EN CONFIANCE
          </span>
        </div>
      </div>
      <main className="login-content">
        <div className="login-brand">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div>
            <strong>MOTAED</strong>
            <span>Gestion & Identité</span>
          </div>
        </div>
        <div className="login-copy">
          <p className="eyebrow">ESPACE SÉCURISÉ</p>
          <h1>
            Bienvenue dans
            <br />
            <span>votre espace.</span>
          </h1>
          <p>
            Gérez les identités professionnelles et assurez des vérifications
            fiables sur le terrain.
          </p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email professionnel</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@organisation.cd"
            />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
              />{" "}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <p className="login-error">{error}</p>}
          <div className="login-options">
            <label>
              <input type="checkbox" /> Se souvenir de moi
            </label>
            <button type="button">Mot de passe oublié ?</button>
          </div>
          <button className="primary login-button" disabled={loading}>
            {loading ? (
              "Connexion en cours..."
            ) : (
              <>
                <LogIn size={17} /> Se connecter
              </>
            )}
          </button>
          <p className="login-footer">
            <ShieldCheck size={14} /> Accès réservé aux administrateurs
            autorisés
          </p>
        </form>
      </main>
    </div>
  );
}
function Dashboard({
  onAdd,
  onRiders,
  riders,
  stats,
  chartData,
  onOpenQrScanner,
  currentUser,
}: {
  onAdd: () => void;
  onRiders: () => void;
  riders: Rider[];
  stats?: { riders: number; activeRiders: number; qrCodes: number; verifications: number } | null;
  chartData?: { day: string; count: number }[];
  onOpenQrScanner?: () => void;
  currentUser?: { fullName: string; email: string; role: string } | null;
}) {
  const maxCount = Math.max(1, ...(chartData ?? []).map((c) => c.count));
  const formatCount = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')} k`;
    return String(value);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
          <h1>
            Bonjour{currentUser ? `, ${currentUser.fullName}` : ''} <span>👋</span>
          </h1>
          <p className="muted">
            Voici ce qui se passe dans votre organisation aujourd’hui.
          </p>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={17} /> Nouveau profil
        </button>
      </div>
      <section className="stats-grid">
        <Stat
          icon={<Users />}
          label="Profils enregistrés"
          value={stats ? String(stats.riders) : String(riders.length)}
          change={stats && stats.riders > 0 ? "+12,4%" : "—"}
          note="vs. mois dernier"
          tone="blue"
        />
        <Stat
          icon={<Activity />}
          label="Profils actifs"
          value={stats ? String(stats.activeRiders) : String(riders.filter((rider) => rider.status === "Actif").length)}
          change={stats && stats.activeRiders > 0 ? "+8,2%" : "—"}
          note="vs. mois dernier"
          tone="green"
        />
        <Stat
          icon={<ShieldCheck />}
          label="Identités vérifiées"
          value={stats ? formatCount(stats.verifications) : "0"}
          change={stats && stats.verifications > 0 ? "+18,7%" : "—"}
          note="ce mois-ci"
          tone="orange"
        />
        <Stat
          icon={<QrCode />}
          label="QR codes générés"
          value={stats ? String(stats.qrCodes) : "0"}
          change={stats && stats.qrCodes > 0 ? "100%" : "—"}
          note="profils équipés"
          tone="purple"
        />
      </section>
      <section className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Activité des vérifications</h2>
              <p className="muted">Nombre de scans effectués cette semaine</p>
            </div>
            <button className="select-button">
              Cette semaine <ChevronDown size={14} />
            </button>
          </div>
          <div className="chart">
            <div className="chart-values">
              {[5,4,3,2,1].map((step) => (
                <span key={step}>{formatCount(Math.round((maxCount / 5) * step))}</span>
              ))}
            </div>
            <div className="chart-area">
              <div className="grid-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <svg viewBox="0 0 600 190" preserveAspectRatio="none">
                <path
                  d={chartData && chartData.length > 0 ? `M0 ${190 - (chartData[0].count / maxCount) * 160} ${chartData.map((c, i) => `L${(600 / (chartData.length - 1 || 1)) * i} ${190 - (c.count / maxCount) * 160}`).join(' ')}` : "M0 158 C35 148 42 130 76 139 S121 150 153 115 S198 134 230 100 S265 114 300 97 S340 100 377 70 S420 87 450 65 S485 76 520 34 S560 43 600 17"}
                  fill="none"
                  stroke="#1d7a62"
                  strokeWidth="3"
                />
                <path
                  d={chartData && chartData.length > 0 ? `M0 ${190 - (chartData[0].count / maxCount) * 160} ${chartData.map((c, i) => `L${(600 / (chartData.length - 1 || 1)) * i} ${190 - (c.count / maxCount) * 160}`).join(' ')} V190 H0Z` : "M0 158 C35 148 42 130 76 139 S121 150 153 115 S198 134 230 100 S265 114 300 97 S340 100 377 70 S420 87 450 65 S485 76 520 34 S560 43 600 17 V190 H0Z"}
                  fill="#1d7a62"
                  opacity=".12"
                />
              </svg>
              <div className="chart-days">
                {(chartData ?? []).map((c) => (
                  <span key={c.day}>{c.day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Accès rapides</h2>
              <p className="muted">Actions fréquentes</p>
            </div>
          </div>
          <QuickAction
            icon={<FilePlus2 />}
            title="Ajouter un profil"
            note="Enregistrer un nouveau conducteur"
            onClick={onAdd}
            tone="blue-bg"
          />
          <QuickAction
            icon={<QrCode />}
            title="Scanner un QR code"
            note="Vérifier une identité"
            onClick={onOpenQrScanner ?? (() => {})}
            tone="green-bg"
          />
          <QuickAction
            icon={<Download />}
            title="Exporter les données"
            note="Télécharger le registre complet"
            onClick={onRiders}
            tone="orange-bg"
          />
        </div>
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Profils récemment ajoutés</h2>
            <p className="muted">Les derniers conducteurs enregistrés</p>
          </div>
          <button className="text-button" onClick={onRiders}>
            Voir tous les profils <ArrowRight size={15} />
          </button>
        </div>
        <RiderTable riders={riders.slice(0, 4)} />
      </section>
    </>
  );
}
function Stat({
  icon,
  label,
  value,
  change,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span className="trend">
        <b>↗ {change}</b> {note}
      </span>
    </div>
  );
}
function QuickAction({
  icon,
  title,
  note,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className={`quick-icon ${tone}`}>{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
      <ArrowRight size={16} />
    </button>
  );
}
function Riders({
  riders,
  query,
  setQuery,
  filter,
  setFilter,
  onAdd,
  onOpenQrScanner,
  openMenuId,
  setOpenMenuId,
  onStatusChange,
  onDelete,
}: {
  riders: Rider[];
  query: string;
  setQuery: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  onAdd: () => void;
  onOpenQrScanner?: () => void;
  openMenuId: string | null;
  setOpenMenuId: (v: string | null) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REGISTRE CENTRAL</p>
          <h1>Motards & chauffeurs</h1>
          <p className="muted">
            Consultez et gérez les profils professionnels de votre organisation.
          </p>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={17} /> Nouveau profil
        </button>
      </div>
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom, ID ou plaque..."
          />
        </div>
        <button className="secondary" onClick={() => onOpenQrScanner?.()}>
          <QrCode size={16} /> Scanner un QR
        </button>
      </div>
      <div className="filter-row">
        {["Tous", "Actif", "Suspendu", "Expiré", "Motard", "Taxi"].map(
          (item) => (
            <button
              className={filter === item ? "filter active" : "filter"}
              key={item}
              onClick={() => setFilter(item)}
            >
              {item}
              {item === "Tous" && <span>248</span>}
            </button>
          ),
        )}
      </div>
      <section className="panel registry-panel">
        <RiderTable riders={riders} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onStatusChange={onStatusChange} onDelete={onDelete} />
      </section>
    </>
  );
}
function RiderTable({ riders, openMenuId, setOpenMenuId, onStatusChange, onDelete }: { riders: Rider[]; openMenuId?: string | null; setOpenMenuId?: (v: string | null) => void; onStatusChange?: (id: string, status: string) => void; onDelete?: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Conducteur</th>
            <th>Type</th>
            <th>Identifiant</th>
            <th>Plaque</th>
            <th>Zone d’activité</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {riders.map((rider) => (
            <tr key={rider.id}>
              <td>
                <div className="rider-cell">
                  {rider.photoUrl ? (
                    <img className="rider-avatar-img" src={rider.photoUrl} alt={rider.name} />
                  ) : (
                    <div
                      className="avatar rider-avatar"
                      style={{ background: rider.color }}
                    >
                      {rider.initials}
                    </div>
                  )}
                  <span>
                    <strong>{rider.name}</strong>
                    <small>{rider.joined}</small>
                  </span>
                </div>
              </td>
              <td>{rider.type}</td>
              <td className="mono">{rider.idNumber}</td>
              <td className="mono">{rider.plate}</td>
              <td>{rider.zone}</td>
              <td>
                <span className={`status ${rider.status.toLowerCase()}`}>
                  <i />
                  {rider.status}
                </span>
              </td>
              <td>
                {onStatusChange && onDelete && openMenuId !== undefined && setOpenMenuId ? (
                  <RiderMenu riderId={rider.id} riderName={rider.name} onStatusChange={onStatusChange} onDelete={onDelete} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
                ) : (
                  <button className="row-menu">
                    <MoreHorizontal size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {riders.length === 0 && (
        <div className="empty">
          <Search size={24} />
          <strong>Aucun profil trouvé</strong>
          <span>Essayez une autre recherche.</span>
        </div>
      )}
    </div>
  );
}
function QrScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startCamera = async () => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices) {
      setError("La caméra n’est pas prise en charge sur ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      const Detector = (window as Window & { BarcodeDetector: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const video = videoRef.current;
      if (!video) return;
      const scan = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(video);
          const raw = found[0]?.rawValue;
          if (raw) {
            const foundCode = raw.split("/verify/")[1] ?? raw;
            onScan(foundCode);
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setCameraActive(false);
            return;
          }
        } catch {
          // ignore frame errors and continue scanning
        }
        requestAnimationFrame(() => void scan());
      };
      video.onloadedmetadata = () => void scan();
    } catch {
      setError("Accès à la caméra refusé ou indisponible.");
    }
  };
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);
  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h3>Scanner un QR code</h3>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className={cameraActive ? "scanner camera-active" : "scanner"}>
          <div className="scan-corners" />
          {cameraActive ? <video ref={videoRef} autoPlay muted playsInline /> : <><QrCode size={72} strokeWidth={1.3} /><span>Caméra en attente</span></>}
        </div>
        <button className="primary wide" onClick={() => void startCamera()} disabled={cameraActive}>
          <QrCode size={17} /> {cameraActive ? "Caméra active" : "Activer la caméra"}
        </button>
        {error && <p className="login-error">{error}</p>}
        <small className="public-note">
          <ShieldCheck size={14} /> Les données affichées sont strictement professionnelles.
        </small>
      </div>
    </div>
  );
}
function Verify({ initialCode = "" }: { initialCode?: string }) {
  const [sheet, setSheet] = useState<IdentificationSheetPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialCode) return;
    setLoading(true);
    setError("");
    apiVerifyIdentification(initialCode)
      .then((response) => {
        if (response.success) setSheet(response.identification);
        else setError(response.error);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Identité introuvable"))
      .finally(() => setLoading(false));
  }, [initialCode]);

  const fullName = sheet ? `${sheet.driver.first_name} ${sheet.driver.last_name}` : '';
  const fullOwnerName = sheet ? `${sheet.owner.first_name} ${sheet.owner.last_name}` : '';
  const statusLabel: Record<IdentificationSheetPayload['administrative']['status'], string> = {
    ACTIF: 'Identification valide',
    SUSPENDU: 'Identification suspendue',
    EXPIRE: 'Identification expirée',
    ARCHIVE: 'Identification archivée',
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-header">
          <span className="verify-flag" aria-hidden="true">🇨🇩</span>
          <span className="verify-country">Republique democratique du congo</span>
          <span className="verify-flag" aria-hidden="true">🇨🇩</span>
        </div>
        <p className="verify-org">Coordination des motocycle et trycile CMtt NK</p>
        <hr className="verify-divider-black" />
        {loading && <p className="muted">Vérification en cours...</p>}
        {error && <p className="login-error">{error}</p>}
        {sheet && (
          <div className="sheet-card">
            <div className={`sheet-status ${sheet.administrative.status.toLowerCase()}`}>
              {sheet.administrative.status === 'ACTIF' ? '✓' : '⚠'} {statusLabel[sheet.administrative.status]}
            </div>
            <div className="sheet-number mono">{sheet.identification_number}</div>

            <section className="sheet-section">
              <h3 className="sheet-section-title">IDENTIFICATION</h3>
              <div className="sheet-header-row">
                {sheet.driver.photo ? (
                  <img className="sheet-photo" src={sheet.driver.photo} alt={fullName} />
                ) : (
                  <div className="avatar-placeholder">{sheet.driver.first_name[0]}{sheet.driver.last_name[0]}</div>
                )}
                <div className="sheet-grid">
                  <div className="sheet-item"><span>Nom complet</span><strong>{fullName}</strong></div>
                  <div className="sheet-item"><span>Téléphone</span><strong>{sheet.driver.phone ?? '—'}</strong></div>
                  <div className="sheet-item"><span>Date de naissance</span><strong>{sheet.driver.date_of_birth ?? '—'}</strong></div>
                  <div className="sheet-item"><span>Lieu de naissance</span><strong>{sheet.driver.place_of_birth ?? '—'}</strong></div>
                  <div className="sheet-item"><span>Sexe</span><strong>{sheet.driver.gender === 'M' ? 'Masculin' : sheet.driver.gender === 'F' ? 'Féminin' : sheet.driver.gender ?? '—'}</strong></div>
                  <div className="sheet-item"><span>Adresse</span><strong>{[sheet.driver.commune, sheet.driver.chefferie_sector, sheet.driver.neighborhood_group, sheet.driver.avenue_village].filter(Boolean).join(' · ') || '—'}</strong></div>
                </div>
              </div>
            </section>

            <section className="sheet-section">
              <h3 className="sheet-section-title">ENGIN</h3>
              <div className="sheet-grid">
                <div className="sheet-item"><span>Plaque</span><strong className="mono">{sheet.vehicle.registration_number}</strong></div>
                <div className="sheet-item"><span>Type</span><strong>{sheet.vehicle.type === 'MOTO' ? 'Motocycle' : 'Tricycle'}</strong></div>
                <div className="sheet-item"><span>Marque</span><strong>{sheet.vehicle.brand ?? '—'}</strong></div>
                <div className="sheet-item"><span>Couleur</span><strong>{sheet.vehicle.color ?? '—'}</strong></div>
                <div className="sheet-item"><span>Numéro de châssis</span><strong className="mono">{sheet.vehicle.chassis_number ?? '—'}</strong></div>
                <div className="sheet-item"><span>Numéro moteur</span><strong className="mono">{sheet.vehicle.engine_number ?? '—'}</strong></div>
                <div className="sheet-item"><span>Usage</span><strong>{sheet.vehicle.usage === 'TAXI_TRANSPORT_PUBLIC' ? 'Taxi / Transport public' : sheet.vehicle.usage === 'PERSONNEL' ? 'Personnel' : 'Autre'}</strong></div>
              </div>
            </section>

            <section className="sheet-section">
              <h3 className="sheet-section-title">PROPRIÉTAIRE</h3>
              <div className="sheet-header-row">
                {sheet.owner.photo ? (
                  <img className="sheet-photo" src={sheet.owner.photo} alt={fullOwnerName} />
                ) : (
                  <div className="avatar-placeholder">{sheet.owner.first_name[0]}{sheet.owner.last_name[0]}</div>
                )}
                <div className="sheet-grid">
                  <div className="sheet-item"><span>Nom complet</span><strong>{fullOwnerName}</strong></div>
                  <div className="sheet-item"><span>Téléphone</span><strong>{sheet.owner.phone ?? '—'}</strong></div>
                  <div className="sheet-item"><span>Adresse</span><strong>{[sheet.owner.commune, sheet.owner.chefferie_sector, sheet.owner.neighborhood_group, sheet.owner.avenue_village].filter(Boolean).join(' · ') || '—'}</strong></div>
                </div>
              </div>
            </section>

            <section className="sheet-section">
              <h3 className="sheet-section-title">INFORMATIONS ADMINISTRATIVES</h3>
              <div className="sheet-grid">
                <div className="sheet-item"><span>Date d'enregistrement</span><strong>{sheet.administrative.issue_date ?? '—'}</strong></div>
                <div className="sheet-item"><span>Lieu</span><strong>{sheet.administrative.issue_location ?? '—'}</strong></div>
                <div className="sheet-item"><span>Émis par</span><strong>{sheet.administrative.issued_by || '—'}</strong></div>
                <div className="sheet-item"><span>Statut</span><strong>{sheet.administrative.status}</strong></div>
              </div>
            </section>

            <small className="public-note">
              <ShieldCheck size={14} /> Données professionnelles vérifiées via MOTAED.
            </small>
          </div>
        )}
        {!sheet && !loading && !error && (
          <div className="verify-empty">
            <QrCode size={48} strokeWidth={1.2} />
            <p>Scannez un QR code MOTAED pour vérifier une fiche d'identification.</p>
          </div>
        )}
      </div>
    </div>
  );
}
function AdminSettings() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', role: 'admin' as 'admin' | 'super_admin' });
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  useEffect(() => {
    apiListUsers().then(setUsers).catch(() => undefined);
  }, []);
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    try {
      const created = await apiCreateUser(userForm);
      setUsers([created, ...users]);
      setUserForm({ fullName: '', email: '', password: '', role: 'admin' });
      setUserSuccess(`Utilisateur ${created.full_name} créé avec succès.`);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Paramètres</h1>
          <p className="muted">Gérez les paramètres de votre organisation et de votre compte.</p>
        </div>
      </div>
      <section className="panel">
        <div className="form-section">
          <h2>Organisation</h2>
          <p className="muted">Informations générales de l’organisation.</p>
          <div className="form-grid">
            <label className="field"><span>Nom de l’organisation</span><input defaultValue="Organisation RDC" /></label>
            <label className="field"><span>Email de contact</span><input defaultValue="contact@motaed.cd" /></label>
            <label className="field"><span>Téléphone</span><input defaultValue="+243 000 000 000" /></label>
            <label className="field"><span>Pays</span><input defaultValue="RDC" /></label>
          </div>
        </div>
        <div className="form-section">
          <h2>Sécurité</h2>
          <p className="muted">Paramètres de connexion et d’accès.</p>
          <div className="form-grid">
            <label className="field"><span>Durée de session (heures)</span><input type="number" defaultValue={8} /></label>
            <label className="field"><span>Tentatives de connexion max / 15min</span><input type="number" defaultValue={10} /></label>
          </div>
        </div>
        <div className="form-actions">
          <button className="secondary" onClick={() => {}}>Annuler</button>
          <button className="primary" onClick={() => {}}><Check size={17} /> Enregistrer</button>
        </div>
      </section>
      <section className="panel users-panel">
        <div className="panel-heading">
          <div>
            <h2>Utilisateurs</h2>
            <p className="muted">Ajoutez ou consultez les administrateurs de l’organisation.</p>
          </div>
        </div>
        {userError && <p className="login-error">{userError}</p>}
        {userSuccess && <p className="login-success">{userSuccess}</p>}
        <form className="user-form" onSubmit={addUser}>
          <div className="form-grid">
            <label className="field"><span>Nom complet *</span><input value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="Ex. Amadou Mukendi" /></label>
            <label className="field"><span>Email professionnel *</span><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="vous@organisation.cd" /></label>
            <label className="field"><span>Mot de passe *</span><input type="text" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min. 8 caractères" /></label>
            <label className="field"><span>Rôle</span><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'super_admin' })}><option value="admin">Admin</option><option value="super_admin">Super admin</option></select></label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit"><UserRound size={17} /> Ajouter un utilisateur</button>
          </div>
        </form>
        <div className="users-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.full_name}</strong></td>
                  <td>{user.email}</td>
                  <td>{user.role === 'super_admin' ? 'Super admin' : 'Admin'}</td>
                  <td><span className={`status ${user.status}`}><i />{user.status}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5}><div className="empty"><UserRound size={24} /><strong>Aucun utilisateur</strong><span>Ajoutez votre premier administrateur.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function HelpCenter() {
  const faqs = [
    { q: "Comment ajouter un nouveau conducteur ?", a: "Allez dans « Ajouter un profil », remplissez les informations personnelles et professionnelles, puis enregistrez. Un QR code est généré automatiquement." },
    { q: "Comment vérifier une identité ?", a: "Utilisez la page « Vérifier une identité » : scannez le QR code avec la caméra ou saisissez le code manuellement." },
    { q: "Que signifie le statut « Suspendu » ?", a: "Un profil suspendu ne peut plus être vérifié. Vous pouvez le réactiver depuis le menu du conducteur dans le registre." },
    { q: "Comment exporter les données ?", a: "Depuis le tableau de bord, cliquez sur « Exporter les données » dans les accès rapides." },
    { q: "Que faire en cas d’oubli de mot de passe ?", a: "Contactez le super administrateur de votre organisation pour réinitialiser votre accès." },
  ];
  return (
    <div className="help-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ASSISTANCE</p>
          <h1>Centre d’aide</h1>
          <p className="muted">Retrouvez les réponses aux questions les plus fréquentes.</p>
        </div>
      </div>
      <section className="panel help-panel">
        {faqs.map((item, idx) => (
          <details key={idx} className="faq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

type StepForm = {
  owner: {
    first_name: string; last_name: string; middle_name: string;
    date_of_birth: string; place_of_birth: string;
    gender: '' | 'M' | 'F' | 'AUTRE';
    phone: string; guardian_name: string; guardian_phone: string;
    commune: string; chefferie_sector: string; neighborhood_group: string; avenue_village: string;
    photo: string;
  };
  vehicle: {
    registration_number: string;
    vehicle_type: 'MOTO' | 'TRICYCLE';
    brand: string; chassis_number: string; engine_number: string; color: string;
    usage: 'TAXI_TRANSPORT_PUBLIC' | 'PERSONNEL' | 'AUTRE';
  };
  driver: {
    first_name: string; last_name: string; middle_name: string;
    date_of_birth: string; place_of_birth: string;
    gender: '' | 'M' | 'F' | 'AUTRE';
    phone: string; father_name: string; mother_name: string;
    marital_status: '' | 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
    commune: string; chefferie_sector: string; neighborhood_group: string; avenue_village: string;
    origin: string; photo: string;
  };
  issue_location: string;
};

const initialSheet: StepForm = {
  owner: { first_name: '', last_name: '', middle_name: '', date_of_birth: '', place_of_birth: '', gender: '', phone: '', guardian_name: '', guardian_phone: '', commune: '', chefferie_sector: '', neighborhood_group: '', avenue_village: '', photo: '' },
  vehicle: { registration_number: '', vehicle_type: 'MOTO', brand: '', chassis_number: '', engine_number: '', color: '', usage: 'TAXI_TRANSPORT_PUBLIC' },
  driver: { first_name: '', last_name: '', middle_name: '', date_of_birth: '', place_of_birth: '', gender: '', phone: '', father_name: '', mother_name: '', marital_status: '', commune: '', chefferie_sector: '', neighborhood_group: '', avenue_village: '', origin: '', photo: '' },
  issue_location: '',
};

function PhotoField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputId = React.useId();
  return (
    <div className="photo-upload">
      {value ? (
        <div className="photo-preview">
          <img src={value} alt={label} />
          <button type="button" className="photo-remove" onClick={() => onChange('')}><X size={14} /></button>
        </div>
      ) : (
        <>
          <div className="upload-icon"><UserRound size={24} /></div>
          <div>
            <strong>{label}</strong>
            <small>JPG ou PNG, 5 MB maximum</small>
          </div>
        </>
      )}
      <div>
        <input id={inputId} type="file" accept="image/*" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string);
          reader.readAsDataURL(file);
        }} />
        <button type="button" className="secondary" onClick={() => document.getElementById(inputId)?.click()}>
          {value ? 'Changer' : 'Choisir une photo'}
        </button>
      </div>
    </div>
  );
}

function NewIdentificationSheet({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [form, setForm] = useState<StepForm>(initialSheet);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreateIdentificationResponse | null>(null);
  const [qrImage, setQrImage] = useState('');

  const update = <K extends keyof StepForm>(section: K, key: string, value: string) => {
    setForm((prev) => ({ ...prev, [section]: { ...(prev[section] as Record<string, string>), [key]: value } }))
  };

  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!form.owner.first_name) return 'Le nom du propriétaire est obligatoire';
      if (!form.owner.last_name) return 'Le post-nom du propriétaire est obligatoire';
      if (!form.owner.date_of_birth) return 'La date de naissance est obligatoire';
      if (!form.owner.gender) return 'Le sexe est obligatoire';
      if (!form.owner.phone) return 'Le téléphone est obligatoire';
      if (!form.owner.commune) return 'L\'adresse (commune) est obligatoire';
    }
    if (s === 2) {
      if (!form.vehicle.registration_number) return 'Le numéro de plaque est obligatoire';
      if (!form.vehicle.vehicle_type) return 'Le type d\'engin est obligatoire';
    }
    if (s === 3) {
      if (!form.driver.first_name) return 'Le nom du conducteur est obligatoire';
      if (!form.driver.last_name) return 'Le post-nom du conducteur est obligatoire';
      if (!form.driver.commune) return 'La commune du conducteur est obligatoire';
    }
    if (s === 4) {
      if (!form.issue_location) return 'Le lieu d\'enregistrement est obligatoire';
    }
    return '';
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => (Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5));
  };
  const back = () => { setError(''); setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)) };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const data: CreateIdentificationInput = {
        owner: { ...form.owner, gender: (form.owner.gender || undefined) as 'M' | 'F' | 'AUTRE' | undefined },
        vehicle: form.vehicle,
        driver: { ...form.driver, gender: (form.driver.gender || undefined) as 'M' | 'F' | 'AUTRE' | undefined, marital_status: (form.driver.marital_status || undefined) as 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF' | undefined },
        issue_location: form.issue_location,
        status: 'ACTIF',
      };
      const result = await createIdentification(data);
      const image = await QRCode.toDataURL(result.qr_code_url, { width: 320, margin: 2, color: { dark: '#173c50', light: '#ffffff' } });
      setQrImage(image);
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div className="panel creation-success">
        <div>
          <span className="success-badge"><Check size={16} /></span>
          <p className="eyebrow">ENREGISTREMENT RÉUSSI</p>
          <h2>Fiche d'identification créée</h2>
          <p className="muted">La fiche est maintenant enregistrée dans votre base de données.</p>
          <div className="success-details">
            <strong>{created.driver.first_name} {created.driver.last_name}</strong>
            <span className="mono">{created.identification_number}</span>
            <span className="mono">{created.vehicle.registration_number} · {created.vehicle.vehicle_type === 'MOTO' ? 'Motocycle' : 'Tricycle'}</span>
            <span className="status actif"><i />{created.status}</span>
          </div>
          <div className="success-actions">
            <a className="primary" href={qrImage} download={`${created.identification_number.replace(/\//g, '-')}-qr.png`}><Download size={16} /> Télécharger le QR Code</a>
            <a className="secondary" href={created.qr_code_url} target="_blank" rel="noreferrer">Voir la fiche</a>
            <button className="secondary" onClick={() => window.print()}>Imprimer la fiche</button>
            <button className="text-button" onClick={onCreated}>Modifier</button>
          </div>
        </div>
        <div className="qr-preview">
          <img src={qrImage} alt="QR Code" />
          <small>Scanner pour vérifier la fiche</small>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-wizard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">NOUVELLE FICHE D'IDENTIFICATION</p>
          <h1>Enregistrement officiel</h1>
          <p className="muted">Étape {step} sur 5 — {step === 1 ? 'Propriétaire' : step === 2 ? 'Engin' : step === 3 ? 'Conducteur' : step === 4 ? 'Informations administratives' : 'Vérification'}</p>
        </div>
      </div>
      <div className="wizard-steps">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`wizard-step ${step >= n ? 'active' : ''}`}>
            <span>{n}</span>
            <small>{n === 1 ? 'Propriétaire' : n === 2 ? 'Engin' : n === 3 ? 'Conducteur' : n === 4 ? 'Administratif' : 'Vérification'}</small>
          </div>
        ))}
      </div>
      <section className="panel">
        {error && <p className="login-error">{error}</p>}

        {step === 1 && (
          <div className="form-section">
            <h2>I. Identification du propriétaire</h2>
            <div className="form-grid">
              <label className="field"><span>Nom *</span><input value={form.owner.first_name} onChange={(e) => update('owner', 'first_name', e.target.value)} /></label>
              <label className="field"><span>Post-nom *</span><input value={form.owner.last_name} onChange={(e) => update('owner', 'last_name', e.target.value)} /></label>
              <label className="field"><span>Prénom</span><input value={form.owner.middle_name} onChange={(e) => update('owner', 'middle_name', e.target.value)} /></label>
              <label className="field"><span>Date de naissance *</span><input type="date" value={form.owner.date_of_birth} onChange={(e) => update('owner', 'date_of_birth', e.target.value)} /></label>
              <label className="field"><span>Lieu de naissance</span><input value={form.owner.place_of_birth} onChange={(e) => update('owner', 'place_of_birth', e.target.value)} /></label>
              <label className="field"><span>Sexe *</span>
                <select value={form.owner.gender} onChange={(e) => update('owner', 'gender', e.target.value)}>
                  <option value="">— Sélectionner —</option><option value="M">Masculin</option><option value="F">Féminin</option><option value="AUTRE">Autre</option>
                </select>
              </label>
              <label className="field"><span>Téléphone *</span><input value={form.owner.phone} onChange={(e) => update('owner', 'phone', e.target.value)} placeholder="+243 ..." /></label>
              <label className="field"><span>Personne de tutelle</span><input value={form.owner.guardian_name} onChange={(e) => update('owner', 'guardian_name', e.target.value)} /></label>
              <label className="field"><span>Téléphone de la tutelle</span><input value={form.owner.guardian_phone} onChange={(e) => update('owner', 'guardian_phone', e.target.value)} /></label>
              <label className="field"><span>Commune *</span><input value={form.owner.commune} onChange={(e) => update('owner', 'commune', e.target.value)} /></label>
              <label className="field"><span>Chefferie / Secteur</span><input value={form.owner.chefferie_sector} onChange={(e) => update('owner', 'chefferie_sector', e.target.value)} /></label>
              <label className="field"><span>Quartier / Groupement</span><input value={form.owner.neighborhood_group} onChange={(e) => update('owner', 'neighborhood_group', e.target.value)} /></label>
              <label className="field"><span>Avenue / Village</span><input value={form.owner.avenue_village} onChange={(e) => update('owner', 'avenue_village', e.target.value)} /></label>
            </div>
            <PhotoField label="Photo du propriétaire" value={form.owner.photo} onChange={(v) => update('owner', 'photo', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <h2>II. Identification de l'engin</h2>
            <div className="form-grid">
              <label className="field"><span>Numéro de plaque *</span><input value={form.vehicle.registration_number} onChange={(e) => update('vehicle', 'registration_number', e.target.value.toUpperCase())} placeholder="KN-1234-AB" /></label>
              <label className="field"><span>Type *</span>
                <select value={form.vehicle.vehicle_type} onChange={(e) => update('vehicle', 'vehicle_type', e.target.value)}>
                  <option value="MOTO">Motocycle</option><option value="TRICYCLE">Tricycle</option>
                </select>
              </label>
              <label className="field"><span>Marque</span><input value={form.vehicle.brand} onChange={(e) => update('vehicle', 'brand', e.target.value)} placeholder="Honda, TVS, ..." /></label>
              <label className="field"><span>Numéro de châssis</span><input className="mono" value={form.vehicle.chassis_number} onChange={(e) => update('vehicle', 'chassis_number', e.target.value)} /></label>
              <label className="field"><span>Numéro moteur</span><input className="mono" value={form.vehicle.engine_number} onChange={(e) => update('vehicle', 'engine_number', e.target.value)} /></label>
              <label className="field"><span>Couleur</span><input value={form.vehicle.color} onChange={(e) => update('vehicle', 'color', e.target.value)} /></label>
              <label className="field"><span>Usage</span>
                <select value={form.vehicle.usage} onChange={(e) => update('vehicle', 'usage', e.target.value)}>
                  <option value="TAXI_TRANSPORT_PUBLIC">Taxi / Transport public</option>
                  <option value="PERSONNEL">Personnel</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-section">
            <h2>III. Identité du conducteur</h2>
            <div className="form-grid">
              <label className="field"><span>Nom *</span><input value={form.driver.first_name} onChange={(e) => update('driver', 'first_name', e.target.value)} /></label>
              <label className="field"><span>Post-nom *</span><input value={form.driver.last_name} onChange={(e) => update('driver', 'last_name', e.target.value)} /></label>
              <label className="field"><span>Prénom</span><input value={form.driver.middle_name} onChange={(e) => update('driver', 'middle_name', e.target.value)} /></label>
              <label className="field"><span>Date de naissance</span><input type="date" value={form.driver.date_of_birth} onChange={(e) => update('driver', 'date_of_birth', e.target.value)} /></label>
              <label className="field"><span>Lieu de naissance</span><input value={form.driver.place_of_birth} onChange={(e) => update('driver', 'place_of_birth', e.target.value)} /></label>
              <label className="field"><span>Sexe</span>
                <select value={form.driver.gender} onChange={(e) => update('driver', 'gender', e.target.value)}>
                  <option value="">— Sélectionner —</option><option value="M">Masculin</option><option value="F">Féminin</option><option value="AUTRE">Autre</option>
                </select>
              </label>
              <label className="field"><span>Téléphone</span><input value={form.driver.phone} onChange={(e) => update('driver', 'phone', e.target.value)} /></label>
              <label className="field"><span>Nom du père</span><input value={form.driver.father_name} onChange={(e) => update('driver', 'father_name', e.target.value)} /></label>
              <label className="field"><span>Nom de la mère</span><input value={form.driver.mother_name} onChange={(e) => update('driver', 'mother_name', e.target.value)} /></label>
              <label className="field"><span>État civil</span>
                <select value={form.driver.marital_status} onChange={(e) => update('driver', 'marital_status', e.target.value)}>
                  <option value="">— Sélectionner —</option><option value="CELIBATAIRE">Célibataire</option><option value="MARIE">Marié(e)</option><option value="DIVORCE">Divorcé(e)</option><option value="VEUF">Veuf / Veuve</option>
                </select>
              </label>
              <label className="field"><span>Commune *</span><input value={form.driver.commune} onChange={(e) => update('driver', 'commune', e.target.value)} /></label>
              <label className="field"><span>Chefferie / Secteur</span><input value={form.driver.chefferie_sector} onChange={(e) => update('driver', 'chefferie_sector', e.target.value)} /></label>
              <label className="field"><span>Quartier / Groupement</span><input value={form.driver.neighborhood_group} onChange={(e) => update('driver', 'neighborhood_group', e.target.value)} /></label>
              <label className="field"><span>Avenue / Village</span><input value={form.driver.avenue_village} onChange={(e) => update('driver', 'avenue_village', e.target.value)} /></label>
              <label className="field"><span>Originaire de</span><input value={form.driver.origin} onChange={(e) => update('driver', 'origin', e.target.value)} /></label>
            </div>
            <PhotoField label="Photo du conducteur" value={form.driver.photo} onChange={(v) => update('driver', 'photo', v)} />
          </div>
        )}

        {step === 4 && (
          <div className="form-section">
            <h2>IV. Informations administratives</h2>
            <div className="form-grid">
              <label className="field"><span>Lieu d'enregistrement *</span><input value={form.issue_location} onChange={(e) => setForm({ ...form, issue_location: e.target.value })} placeholder="Bureau, ville" /></label>
              <div className="field"><span>Date d'enregistrement</span><strong>{new Date().toLocaleDateString('fr-FR')}</strong></div>
              <div className="field"><span>Numéro d'identification</span><strong>Généré automatiquement</strong></div>
              <div className="field"><span>Statut</span><strong>ACTIF</strong></div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="form-section">
            <h2>V. Vérification des informations</h2>
            <p className="muted">Veuillez vérifier toutes les informations avant l'enregistrement définitif.</p>

            <h3 className="sheet-section-title">Propriétaire</h3>
            <div className="sheet-grid">
              <div className="sheet-item"><span>Nom</span><strong>{form.owner.first_name} {form.owner.last_name} {form.owner.middle_name}</strong></div>
              <div className="sheet-item"><span>Date de naissance</span><strong>{form.owner.date_of_birth || '—'}</strong></div>
              <div className="sheet-item"><span>Sexe</span><strong>{form.owner.gender || '—'}</strong></div>
              <div className="sheet-item"><span>Téléphone</span><strong>{form.owner.phone || '—'}</strong></div>
              <div className="sheet-item"><span>Adresse</span><strong>{[form.owner.commune, form.owner.chefferie_sector, form.owner.neighborhood_group, form.owner.avenue_village].filter(Boolean).join(' · ')}</strong></div>
            </div>

            <h3 className="sheet-section-title">Engin</h3>
            <div className="sheet-grid">
              <div className="sheet-item"><span>Plaque</span><strong className="mono">{form.vehicle.registration_number}</strong></div>
              <div className="sheet-item"><span>Type</span><strong>{form.vehicle.vehicle_type}</strong></div>
              <div className="sheet-item"><span>Marque</span><strong>{form.vehicle.brand || '—'}</strong></div>
              <div className="sheet-item"><span>Couleur</span><strong>{form.vehicle.color || '—'}</strong></div>
              <div className="sheet-item"><span>Châssis</span><strong className="mono">{form.vehicle.chassis_number || '—'}</strong></div>
              <div className="sheet-item"><span>Usage</span><strong>{form.vehicle.usage}</strong></div>
            </div>

            <h3 className="sheet-section-title">Conducteur</h3>
            <div className="sheet-grid">
              <div className="sheet-item"><span>Nom</span><strong>{form.driver.first_name} {form.driver.last_name} {form.driver.middle_name}</strong></div>
              <div className="sheet-item"><span>Date de naissance</span><strong>{form.driver.date_of_birth || '—'}</strong></div>
              <div className="sheet-item"><span>Sexe</span><strong>{form.driver.gender || '—'}</strong></div>
              <div className="sheet-item"><span>Téléphone</span><strong>{form.driver.phone || '—'}</strong></div>
              <div className="sheet-item"><span>Père / Mère</span><strong>{form.driver.father_name || '—'} / {form.driver.mother_name || '—'}</strong></div>
              <div className="sheet-item"><span>État civil</span><strong>{form.driver.marital_status || '—'}</strong></div>
              <div className="sheet-item"><span>Adresse</span><strong>{[form.driver.commune, form.driver.chefferie_sector, form.driver.neighborhood_group, form.driver.avenue_village].filter(Boolean).join(' · ')}</strong></div>
            </div>

            <h3 className="sheet-section-title">Administratif</h3>
            <div className="sheet-grid">
              <div className="sheet-item"><span>Lieu d'enregistrement</span><strong>{form.issue_location}</strong></div>
              <div className="sheet-item"><span>Date d'enregistrement</span><strong>{new Date().toLocaleDateString('fr-FR')}</strong></div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {step > 1 && <button className="secondary" onClick={back}>Retour</button>}
          <button className="text-button" onClick={onCancel}>Annuler</button>
          {step < 5 && <button className="primary" onClick={next}>Suivant</button>}
          {step === 5 && <button className="primary" onClick={submit} disabled={saving}>{saving ? 'Enregistrement...' : 'ENREGISTRER LA FICHE'}</button>}
        </div>
      </section>
    </div>
  );
}
export default App;
