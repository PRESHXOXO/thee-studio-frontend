import React from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/navigation/Sidebar.jsx';
import { Topbar } from './components/navigation/Topbar.jsx';
import { StudioHome } from './screens/StudioHome.jsx';
import { TheeDirector } from './screens/TheeDirector.jsx';
import { ImageGenerator } from './screens/ImageGenerator.jsx';
import { Characters } from './screens/Characters.jsx';
import { Scenes } from './screens/Scenes.jsx';
import { References } from './screens/References.jsx';
import { CampaignStudio } from './screens/CampaignStudio.jsx';
import { ProductionExports } from './screens/ProductionExports.jsx';
import { ProductionRuns } from './screens/ProductionRuns.jsx';
import { Library } from './screens/Library.jsx';
import { History } from './screens/History.jsx';
import { Settings } from './screens/Settings.jsx';
import { loadLibrary } from './lib/library.js';
import { resolveActiveCreator } from './lib/activeCreator.js';
import { Landing } from './screens/Landing.jsx';
import { Auth } from './screens/Auth.jsx';
import { StudioErrorBoundary } from './components/system/StudioErrorBoundary.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ProductionProvider } from './context/ProductionContext.jsx';

function RequireAuth({ children }) {
  const location = useLocation();
  const auth = useAuth();
  if (auth.loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', font: 'var(--text-base)', color: 'var(--text-muted)' }}>Opening your studio…</div>;
  }
  if (!auth.session) {
    return <Navigate to="/auth?mode=login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

// URL slug -> internal screen id. Accepts both the friendly label form used in
// the UI (cast, new-creator, engine-library) and the raw nav id, so direct
// navigation and refresh resolve to the right screen instead of the landing
// page. Screens are state-switched (no per-screen route existed before), so
// these slugs are what makes them deep-linkable.
const SLUG_TO_ID = {
  home: 'home', studio: 'home',
  cast: 'characters', characters: 'characters',
  'new-creator': 'images', images: 'images',
  director: 'director', 'thee-director': 'director',
  scenes: 'scenes',
  references: 'references',
  campaigns: 'campaigns',
  library: 'library',
  history: 'history',
  exports: 'exports',
  runs: 'runs', 'provider-runs': 'runs',
  settings: 'settings', 'engine-library': 'settings',
};

function slugToScreenId(slug) {
  if (!slug) return 'home';
  return SLUG_TO_ID[String(slug).toLowerCase()] || null;
}

// Fallback for unknown paths: a bare app slug (e.g. /cast) redirects into the
// studio shell; anything genuinely unknown falls through to the landing page.
function UnknownRoute() {
  const location = useLocation();
  const seg = location.pathname.split('/').filter(Boolean)[0];
  const id = slugToScreenId(seg);
  if (id) return <Navigate to={`/studio/${seg}`} replace />;
  return <Landing />;
}

// Prompt Lab and Scene Flow are no longer top-level nav destinations — both
// are now input modes ("Describe It" / "Talk It Through") on the unified
// Thee Director screen, alongside "Guided". Their screen components are
// unchanged and still exist at src/screens/{PromptLab,SceneFlow}.jsx,
// rendered directly by TheeDirector.jsx.
// Nav order follows the workflow: check your Cast first, add a New Creator
// if you need one, then shoot with Thee Director. "Creator" no longer
// appears in two different destination names — Cast is roster/management,
// New Creator is the identity-creation wizard, Thee Director is generation.
const BASE_NAV = [
  { section: 'Create' },
  { id: 'home',       label: 'Studio',          icon: 'layout-dashboard' },
  { id: 'characters', label: 'Cast',            icon: 'sparkles' },
  { id: 'images',     label: 'New Creator',     icon: 'image' },
  { id: 'director',   label: 'Thee Director',   icon: 'clapperboard' },
  { id: 'scenes',     label: 'Scenes',          icon: 'mountain-snow' },
  { id: 'references', label: 'References',      icon: 'images' },
  { section: 'Workspace' },
  { id: 'campaigns',  label: 'Campaigns',       icon: 'megaphone' },
  { id: 'library',    label: 'Library',         icon: 'folder-open' },
  { id: 'history',    label: 'History',         icon: 'history' },
  { id: 'exports',    label: 'Exports',         icon: 'download' },
  { id: 'runs',       label: 'Provider Runs',   icon: 'activity' },
  { id: 'settings',   label: 'Engine Library',  icon: 'settings' },
];

const SCREENS = {
  home:       { label: 'Studio',           component: StudioHome },
  director:   { label: 'Thee Director',    component: TheeDirector },
  images:     { label: 'New Creator',      component: ImageGenerator },
  characters: { label: 'Cast',             component: Characters },
  scenes:     { label: 'Scenes',           component: Scenes },
  references: { label: 'References',       component: References },
  campaigns:  { label: 'Campaigns',        component: CampaignStudio },
  library:    { label: 'Library',          component: Library },
  history:    { label: 'History',          component: History },
  exports:    { label: 'Exports',          component: ProductionExports },
  runs:       { label: 'Provider Runs',    component: ProductionRuns },
  settings:   { label: 'Engine Library',   component: Settings },
};

// Poll Gradio /config to determine backend connectivity.
function useBackendStatus() {
  const [status, setStatus] = React.useState('checking'); // 'checking' | 'online' | 'offline'
  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/config', { signal: controller.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  return status;
}

function StudioApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { screen: screenSlug } = useParams();
  const auth = useAuth();
  const authSession = auth.session;
  const [activeNav, setActiveNav]             = React.useState(() => slugToScreenId(screenSlug) || 'home');
  const [pendingCharacter, setPendingCharacter] = React.useState(null);
  const [pendingDirector,  setPendingDirector]  = React.useState(null);
  const [pendingImages,    setPendingImages]    = React.useState(null);
  const [activeCharacter,  setActiveCharacter]  = React.useState(() => {
    try {
      const chars = JSON.parse(localStorage.getItem('ts_characters') || '[]');
      return resolveActiveCreator(chars);
    } catch { return null; }
  });
  const [libCount, setLibCount]               = React.useState(() => loadLibrary().length);
  const [pendingImportRequest, setPendingImportRequest] = React.useState(false);
  const backendStatus = useBackendStatus();

  // Refresh library count whenever user navigates (catches new saves)
  const handleNav = React.useCallback((id, data) => {
    setLibCount(loadLibrary().length);
    // data === 'import' is a sentinel from "Import Creator" entry points
    // (Studio Home) — distinct from the AI-builder handoff object, which
    // carries {name, image, ...} and goes through pendingCharacter instead.
    if (id === 'characters' && data === 'import') setPendingImportRequest(true);
    else if (id === 'characters' && data) setPendingCharacter(data);
    if (id === 'director'   && data) setPendingDirector(data);
    if (id === 'images'     && data) setPendingImages(data);
    if (id !== 'characters' || data !== 'import') setPendingImportRequest(false);
    if (id !== 'characters' || !data || data === 'import') setPendingCharacter(null);
    if (id !== 'director'  || !data) setPendingDirector(null);
    if (id !== 'images'    || !data) setPendingImages(null);
    setActiveNav(id);
    // Keep the URL in sync so deep-links, refresh, and back/forward work.
    const query = id === 'library' && data?.filter
      ? `?filter=${encodeURIComponent(data.filter)}`
      : '';
    navigate(`/studio/${id}${query}`, { replace: false });
  }, [navigate]);

  // Back/forward or a hand-typed /studio/<slug> changes the param — mirror it
  // into activeNav so the rendered screen follows the URL.
  React.useEffect(() => {
    const id = slugToScreenId(screenSlug);
    if (id && id !== activeNav) setActiveNav(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSlug]);

  const navItems = React.useMemo(() => BASE_NAV.map(item =>
    item.id === 'library' && libCount > 0 ? { ...item, badge: String(libCount) } : item
  ), [libCount]);

  const Screen = SCREENS[activeNav]?.component || StudioHome;
  const screenLabel = SCREENS[activeNav]?.label || 'Studio Home';

  const screenProps = { onNav: handleNav };
  if (activeNav === 'characters' && pendingCharacter) screenProps.initialCharacter = pendingCharacter;
  if (activeNav === 'characters' && pendingImportRequest) screenProps.initialImportRequest = true;
  if (activeNav === 'characters') screenProps.onCharacterChange = setActiveCharacter;
  if (activeNav === 'library') {
    screenProps.initialFilter = new URLSearchParams(location.search).get('filter') || 'all';
  }
  if (activeNav === 'images'     && pendingImages) {
    screenProps.initialName        = pendingImages.name        || '';
    screenProps.initialNiche       = pendingImages.niche       || '';
    screenProps.initialVision      = pendingImages.vision      || '';
    screenProps.initialDescription = pendingImages.description || '';
  }
  // Same setter as Characters' onCharacterChange — Director can change the
  // active creator too, and the sidebar chip needs to reflect it without
  // waiting for a nav/remount to Characters.
  if (activeNav === 'director') screenProps.onActiveCreatorChange = setActiveCharacter;
  if (activeNav === 'director'   && pendingDirector) {
    screenProps.initialScene  = pendingDirector.scene  || 'None';
    screenProps.initialVision = pendingDirector.vision || '';
    screenProps.initialMode = pendingDirector.mode || pendingDirector.settings?.workflow || 'guided';
    screenProps.initialSettings = pendingDirector.settings || null;
    if (pendingDirector.campaignId) {
      screenProps.initialCampaign = {
        id: pendingDirector.campaignId,
        name: pendingDirector.campaignName || '',
        brief: pendingDirector.campaignBrief || '',
        creatorId: pendingDirector.creatorId ?? null,
      };
    } else if (pendingDirector.creatorId != null) {
      // Re-run/fork handoffs (e.g. from History) carry a creator without a
      // campaign context — pre-select it the same way, just without the
      // pinned-campaign banner.
      screenProps.initialCreatorId = pendingDirector.creatorId;
    }
  }

  const statusColor = backendStatus === 'online' ? '#22c55e' : backendStatus === 'offline' ? '#ef4444' : '#f59e0b';
  const statusLabel = backendStatus === 'online' ? 'Backend online' : backendStatus === 'offline' ? 'Backend offline' : 'Connecting…';
  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/auth?mode=login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar items={navItems} active={activeNav} onNavigate={id => handleNav(id)} activeCharacter={activeCharacter} />
      <div style={{ marginLeft: 'var(--sidebar-w, 248px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar
          context={screenLabel}
          onNav={handleNav}
          user={authSession?.name || 'Thee Studio'}
          userEmail={authSession?.email}
          onSignOut={handleSignOut}
          actions={
            <div title={statusLabel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--cream-deep)', border: '1px solid var(--border)', font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-muted)' }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0,
                animation: backendStatus === 'online' ? 'none' : 'status-pulse 1.5s ease-in-out infinite',
              }} />
              {statusLabel}
            </div>
          }
        />
        <main
          key={`${activeNav}:${location.pathname}`}
          style={{ marginTop: 'var(--topbar-h, 56px)', padding: '32px', flex: 1, animation: 'screen-in 0.18s ease-out both' }}
        >
          <StudioErrorBoundary resetKey={activeNav} onReset={() => handleNav('home')}>
            <Screen {...screenProps} />
          </StudioErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const protectedStudio = (
    <RequireAuth>
      <ProductionProvider>
        <StudioApp />
      </ProductionProvider>
    </RequireAuth>
  );
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/studio" element={protectedStudio} />
      <Route path="/studio/:screen" element={protectedStudio} />
      <Route path="/studio/:screen/:projectId" element={protectedStudio} />
      {/* Unknown paths: a bare app slug (/cast) redirects into the shell;
          anything else falls through to the landing page. */}
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  );
}
