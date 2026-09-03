import { useEffect, useMemo, useRef, useState } from "react";
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
import { authMe as apiAuthMe, createRider as apiCreateRider, deleteRider as apiDeleteRider, createUser as apiCreateUser, getChart as apiGetChart, getStats as apiGetStats, listRiders as apiListRiders, listUsers as apiListUsers, login as apiLogin, logout as apiLogout, patchRiderStatus as apiPatchRiderStatus, uploadRiderPhoto as apiUploadRiderPhoto, verifyRider as apiVerifyRider, type ApiUser } from "./api";

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
const initialForm = {
  firstName: "",
  lastName: "",
  type: "Motard",
  phone: "",
  plate: "",
  zone: "",
};

function App() {
  const [page, setPage] = useState<
    "login" | "dashboard" | "riders" | "add" | "verify" | "settings" | "help"
  >("login");
  const [riders, setRiders] = useState(demoRiders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [mobileNav, setMobileNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newRider, setNewRider] = useState(initialForm);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [createdRider, setCreatedRider] = useState<{ name: string; idNumber: string; plate: string; status: string; qrUrl: string; qrImage: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<{ riders: number; activeRiders: number; qrCodes: number; verifications: number } | null>(null);
  const [chartData, setChartData] = useState<{ day: string; count: number }[]>([]);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scannedRider, setScannedRider] = useState<Awaited<ReturnType<typeof apiVerifyRider>> | null>(null);
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
      const result = await apiVerifyRider(code);
      setScannedRider(result);
      setPage("riders");
    } catch (err) {
      setScannedRider(null);
      setScanError(err instanceof Error ? err.message : "Identité introuvable");
    }
  };
  if (publicCode) return <Verify initialCode={decodeURIComponent(publicCode)} />;
  const addRider = async () => {
    if (!newRider.firstName || !newRider.lastName) return;
    const saved = await apiCreateRider(newRider);
    if (photoPreview) {
      await apiUploadRiderPhoto(saved.id, photoPreview).catch(() => undefined);
    }
    const qrUrl = saved.qr_url ?? `${window.location.origin}/verify/${saved.unique_code}`;
    const qrImage = await QRCode.toDataURL(qrUrl, { width: 320, margin: 2, color: { dark: '#173c50', light: '#ffffff' } });
    setCreatedRider({ name: `${saved.first_name} ${saved.last_name}`, idNumber: saved.identification_number, plate: saved.plate_number ?? 'À attribuer', status: saved.status, qrUrl, qrImage });
    setNewRider(initialForm);
    setPhotoPreview(null);
    setPage("riders");
    setRiders([{ id: saved.id, name: `${saved.first_name} ${saved.last_name}`, initials: `${saved.first_name[0]}${saved.last_name[0]}`, type: newRider.type, idNumber: saved.identification_number, plate: saved.plate_number ?? 'À attribuer', zone: saved.activity_zone ?? 'Non renseignée', status: 'Actif', joined: 'À l’instant', color: '#9fb8ad', photoUrl: photoPreview ?? undefined }, ...riders]);
  };
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
            <>{createdRider && <CreationSuccess rider={createdRider} onClose={() => setCreatedRider(null)} />}{scannedRider && !page.includes('verify') && <div className="verify-result" style={{ marginBottom: 18 }}><strong>{scannedRider.first_name} {scannedRider.last_name}</strong><span>{scannedRider.identification_number} · {scannedRider.plate_number ?? "Plaque non renseignée"}</span><span>{scannedRider.activity_zone ?? "Zone non renseignée"} · {scannedRider.status}</span></div>}{scanError && <p className="login-error" style={{ marginBottom: 18 }}>{scanError}</p>}<Riders riders={filteredRiders} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onAdd={() => setPage("add")} onOpenQrScanner={() => setQrScannerOpen(true)} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}             onStatusChange={async (id, status) => { await apiPatchRiderStatus(id, status); setRiders(riders.map((r) => (r.id === id ? { ...r, status: status === "actif" ? "Actif" : status === "suspendu" ? "Suspendu" : status === "expire" ? "Expiré" : "Désactivé" } : r))); setOpenMenuId(null); }} onDelete={async (id) => { await apiDeleteRider(id); setRiders(riders.filter((r) => r.id !== id)); setOpenMenuId(null); }} /></>
          )}
          {page === "add" && (
            <AddRider
              data={newRider}
              setData={setNewRider}
              onSave={addRider}
              onCancel={() => { setPage("riders"); setPhotoPreview(null); }}
              photoPreview={photoPreview}
              setPhotoPreview={setPhotoPreview}
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
function CreationSuccess({ rider, onClose }: { rider: { name: string; idNumber: string; plate: string; status: string; qrUrl: string; qrImage: string }; onClose: () => void }) {
  return <section className="creation-success panel"><div><span className="success-badge"><Check size={16} /></span><p className="eyebrow">PROFIL ENREGISTRÉ</p><h2>Identité créée avec succès</h2><p className="muted">Le profil est maintenant enregistré dans votre base de données.</p><div className="success-details"><strong>{rider.name}</strong><span>{rider.idNumber} · {rider.plate}</span><span className="status actif"><i />{rider.status}</span></div><div className="success-actions"><a className="primary" href={rider.qrImage} download={`${rider.idNumber}-qr.png`}><Download size={16} /> Télécharger le QR</a><button className="secondary" onClick={() => window.print()}>Imprimer</button><a className="secondary" href={rider.qrUrl} target="_blank" rel="noreferrer">Voir la vérification</a><button className="text-button" onClick={onClose}>Fermer</button></div></div><div className="qr-preview"><img src={rider.qrImage} alt={`QR code de ${rider.name}`} /><small>Scanner pour vérifier l’identité</small></div></section>
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
function AddRider({
  data,
  setData,
  onSave,
  onCancel,
  photoPreview,
  setPhotoPreview,
}: {
  data: typeof initialForm;
  setData: (v: typeof initialForm) => void;
  onSave: () => void;
  onCancel: () => void;
  photoPreview: string | null;
  setPhotoPreview: (v: string | null) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">NOUVEAU PROFIL</p>
          <h1>Ajouter un conducteur</h1>
          <p className="muted">
            Créez une identité professionnelle et générez son QR code.
          </p>
        </div>
        <button className="secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="form-section">
            <h2>Informations personnelles</h2>
            <p className="muted">
              Les informations visibles sur la carte professionnelle.
            </p>
            <div className="photo-upload">
              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Aperçu" />
                  <button type="button" className="photo-remove" onClick={() => setPhotoPreview(null)}><X size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="upload-icon">
                    <UserRound size={24} />
                  </div>
                  <div>
                    <strong>Photo du conducteur</strong>
                    <small>JPG ou PNG, 5 MB maximum</small>
                  </div>
                </>
              )}
              <div>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setPhotoPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                <button type="button" className="secondary" onClick={() => document.getElementById('photo-input')?.click()}>
                  {photoPreview ? 'Changer' : 'Choisir une photo'}
                </button>
              </div>
            </div>
            <div className="form-grid">
              <Field
                label="Prénom *"
                value={data.firstName}
                onChange={(v) => setData({ ...data, firstName: v })}
                placeholder="Ex. Blaise"
              />
              <Field
                label="Nom *"
                value={data.lastName}
                onChange={(v) => setData({ ...data, lastName: v })}
                placeholder="Ex. Kanku"
              />
              <Field
                label="Téléphone"
                value={data.phone}
                onChange={(v) => setData({ ...data, phone: v })}
                placeholder="+243 000 000 000"
              />
              <Field
                label="Type de conducteur"
                value={data.type}
                onChange={(v) => setData({ ...data, type: v })}
                select
              />
            </div>
          </div>
          <div className="form-section">
            <h2>Informations professionnelles</h2>
            <p className="muted">
              Ces informations permettent une vérification rapide sur le
              terrain.
            </p>
            <div className="form-grid">
              <Field
                label="Numéro de plaque"
                value={data.plate}
                onChange={(v) => setData({ ...data, plate: v })}
                placeholder="Ex. KN-5421-AB"
              />
              <Field
                label="Zone d’activité"
                value={data.zone}
                onChange={(v) => setData({ ...data, zone: v })}
                placeholder="Ex. Ngaliema"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="secondary" onClick={onCancel}>
              Annuler
            </button>
            <button className="primary" onClick={onSave}>
              <Check size={17} /> Enregistrer le profil
            </button>
          </div>
        </section>
        <aside className="side-note">
          <div className="note-icon">
            <QrCode size={21} />
          </div>
          <h3>QR code automatique</h3>
          <p>
            Un QR code unique et sécurisé sera généré automatiquement après
            l’enregistrement du profil.
          </p>
          <div className="note-line">
            <ShieldCheck size={16} /> Identité vérifiable publiquement
          </div>
          <div className="note-line">
            <Download size={16} /> Téléchargeable et imprimable
          </div>
        </aside>
      </div>
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  select,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  select?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {select ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option>Motard</option>
          <option>Taxi</option>
          <option>Taxi-bus</option>
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
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
  const [result, setResult] = useState<Awaited<ReturnType<typeof apiVerifyRider>> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = async (value = initialCode) => {
    const normalized = value.trim();
    if (!normalized) return;
    setLoading(true);
    setError("");
    try { setResult(await apiVerifyRider(normalized)); } catch (verifyError) { setResult(null); setError(verifyError instanceof Error ? verifyError.message : "Identité introuvable"); } finally { setLoading(false); }
  };
  useEffect(() => {
    if (initialCode) {
      void verify(initialCode);
    }
  }, [initialCode]);
  const driverTypeLabel = result?.driver_type === 'chauffeur_taxi' ? 'Taxi' : result?.driver_type === 'chauffeur_taxi_bus' ? 'Taxi-bus' : result?.driver_type === 'motard' ? 'Motard' : result?.driver_type ?? '—';
  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-logo">
          <ShieldCheck size={21} />
        </div>
        <p className="eyebrow">MOTAED · VÉRIFICATION PUBLIQUE</p>
        <h1>Identité vérifiée</h1>
        {loading && <p className="muted">Vérification en cours...</p>}
        {error && <p className="login-error">{error}</p>}
        {result && (
          <div className="verify-public-card">
            <div className="verify-photo">
              {result.photo_url ? (
                <img src={result.photo_url} alt={`${result.first_name} ${result.last_name}`} />
              ) : (
                <div className="avatar-placeholder">
                  {result.first_name[0]}{result.last_name[0]}
                </div>
              )}
            </div>
            <div className="verify-info">
              <h2>{result.first_name} {result.last_name}</h2>
              <div className="verify-grid">
                <div className="verify-item">
                  <span className="verify-label">Type</span>
                  <span className="verify-value">{driverTypeLabel}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Identifiant</span>
                  <span className="verify-value mono">{result.identification_number}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Plaque</span>
                  <span className="verify-value mono">{result.plate_number ?? "Non renseignée"}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Marque / Modèle</span>
                  <span className="verify-value">{result.vehicle_brand ?? "—"} {result.vehicle_model ?? ""}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Zone d’activité</span>
                  <span className="verify-value">{result.activity_zone ?? "Non renseignée"}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Statut</span>
                  <span className={`verify-status ${result.status}`}>{result.status}</span>
                </div>
              </div>
              <small className="public-note">
                <ShieldCheck size={14} /> Données professionnelles vérifiées le {new Date(result.updated_at).toLocaleDateString('fr-FR')}
              </small>
            </div>
          </div>
        )}
        {!result && !loading && !error && (
          <div className="verify-empty">
            <QrCode size={48} strokeWidth={1.2} />
            <p>Scannez un QR code MOTAED pour vérifier une identité.</p>
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
export default App;
