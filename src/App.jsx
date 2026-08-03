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
import { CreatorMemory } from './screens/CreatorMemory.jsx';
import { loadLibrary } from './lib/library.js';
import { resolveActiveCreator } from './lib/activeCreator.js';
import { StudioErrorBoundary } from './components/system/StudioErrorBoundary.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ProductionProvider } from './context/ProductionContext.jsx';
import { LoginScreen } from './components/auth/LoginScreen.jsx';
import { AccessScreen } from './components/auth/AccessScreen.jsx';
import { accessBadgeLabel, accessView, useStudioAccess } from './api/access.js';

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) {
    return <AccessScreen title="Opening your studio…" loading />;
  }
  if (!auth.session) {
    return (
      <LoginScreen
        configured={Boolean(auth.client)}
        error={auth.error}
        onSignIn={(email, password) => auth.signIn({ email, password })}
      />
    );
  }
  return children;
}

function RequireProductAccess({ children }) {
  const auth = useAuth();
  const accessState = useStudioAccess(auth.session?.raw ?? null, auth.client);
  const view = accessView(accessState.access, accessState.error);
  if (accessState.loading) return <AccessScreen title="Connecting…" loading />;
  if (view.state !== 'allowed') {
    return (
      <AccessScreen
        title={view.title}
        detail={view.detail}
        onRetry={accessState.error ? accessState.refresh : null}
        onSignOut={auth.signOut}
      />
    );
  }
  return children(accessState.access);
}

// URL slug -> internal screen id. Accepts both the friendly label form used in
// the UI (cast, new-creator, engine-library) and the raw nav id, so direct
// navigation and refresh resolve to the right screen instead of the landing
// page. Screens are state-switched (no per-screen route existed before), so
// these slugs are what makes them deep-linkable.
const SLUG_TO_ID = {
  home: 'home', studio: 'home',
  cast: 'characters', characters: 'characters',
  memory: 'memory', 'creator-memory': 'memory',
  'new-creator': 'images', images: 'images',
  director: 'director', 'thee-director': 'director',
  guided: 'director',
  'describe-it': 'director', describe: 'director', 'prompt-lab': 'director',
  'talk-it-through': 'director', talk: 'director', 'scene-flow': 'director',
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

const DIRECTOR_MODE_TO_SLUG = {
  guided: 'guided',
  describe: 'describe-it',
  talk: 'scene-flow',
};

function directorModeFromSlug(slug) {
  const value = String(slug || '').toLowerCase();
  if (value === 'guided') return 'guided';
  if (['describe', 'describe-it', 'prompt-lab'].includes(value)) return 'describe';
  if (['talk', 'talk-it-through', 'scene-flow'].includes(value)) return 'talk';
  return null;
}

function directorModePath(mode) {
  return `/studio/director/${DIRECTOR_MODE_TO_SLUG[mode] || 'guided'}`;
}

// Fallback for unknown paths: a bare app slug (e.g. /cast) redirects into the
// studio shell; anything genuinely unknown falls through to the landing page.
function UnknownRoute() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const seg = segments[0];
  const id = slugToScreenId(seg);
  if (id) return <Navigate to={`/studio/${segments.join('/')}`} replace />;
  return <Navigate to="/studio" replace />;
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
  { id: 'memory',     label: 'Creator Memory',  icon: 'brain' },
  { id: 'images',     label: 'New Creator',     icon: 'image' },
  { id: 'director',   label: 'Thee Director',   icon: 'clapperboard' },
  { id: 'scenes',     label: 'Scenes',          icon: 'mountain-snow' },
  { id: 'references', label: 'References',      icon: 'images' },
  { section: 'Workspace' },
  { id: 'campaigns',  label: 'Campaigns',       icon: 'megaphone' },
  { id: 'library',    label: 'Library',         icon: 'folder-open' },
  { id: 'history',    label: 'History',         icon: 'history' },
  { id: 'exports',    label: 'Exports',         icon: 'download' },
  { id: 'runs',       label: 'Jobs',             icon: 'activity' },
  { id: 'settings',   label: 'Generation Settings', icon: 'settings' },
];

const SCREENS = {
  home:       { label: 'Studio',           component: StudioHome },
  director:   { label: 'Thee Director',    component: TheeDirector },
  images:     { label: 'New Creator',      component: ImageGenerator },
  characters: { label: 'Cast',             component: Characters },
  memory:     { label: 'Creator Memory',   component: CreatorMemory },
  scenes:     { label: 'Scenes',           component: Scenes },
  references: { label: 'References',       component: References },
  campaigns:  { label: 'Campaigns',        component: CampaignStudio },
  library:    { label: 'Library',          component: Library },
  history:    { label: 'History',          component: History },
  exports:    { label: 'Exports',          component: ProductionExports },
  runs:       { label: 'Jobs',             component: ProductionRuns },
  settings:   { label: 'Generation Settings', component: Settings },
};

function StudioApp({ access }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { screen: screenSlug, projectId } = useParams();
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
  const routeDirectorMode = activeNav === 'director'
    ? directorModeFromSlug(projectId) || directorModeFromSlug(screenSlug) || 'guided'
    : null;

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
    const target = id === 'director'
      ? directorModePath(
          directorModeFromSlug(data?.mode || data?.settings?.workflow) || 'guided'
        )
      : `/studio/${id}${query}`;
    navigate(target, { replace: false });
  }, [navigate]);

  // Back/forward or a hand-typed /studio/<slug> changes the param — mirror it
  // into activeNav so the rendered screen follows the URL.
  React.useEffect(() => {
    const id = slugToScreenId(screenSlug);
    if (id && id !== activeNav) setActiveNav(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSlug]);

  // Canonical Director URLs give every input mode a refresh-safe link while
  // retaining friendly legacy aliases such as /studio/prompt-lab.
  React.useEffect(() => {
    if (activeNav !== 'director') return;
    const canonical = directorModePath(routeDirectorMode);
    if (location.pathname !== canonical) navigate(canonical, { replace: true });
  }, [activeNav, location.pathname, navigate, routeDirectorMode]);

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
  if (activeNav === 'director') {
    screenProps.onActiveCreatorChange = setActiveCharacter;
    screenProps.initialMode = routeDirectorMode;
    screenProps.onModeChange = mode => navigate(directorModePath(mode), { replace: false });
  }
  if (activeNav === 'director'   && pendingDirector) {
    screenProps.initialScene  = pendingDirector.scene  || 'None';
    screenProps.initialVision = pendingDirector.vision || '';
    screenProps.initialMode = directorModeFromSlug(
      pendingDirector.mode || pendingDirector.settings?.workflow
    ) || routeDirectorMode;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div title="Internal access with usage tracking" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-indigo-soft)', border: '1px solid var(--border)', font: '600 0.75rem/1 var(--font-ui)', color: 'var(--accent-indigo)' }}>
                <span>✦</span>{accessBadgeLabel(access)}
              </div>
              <div title="Connected" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--cream-deep)', border: '1px solid var(--border)', font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0,
                }} />
                Connected
              </div>
            </div>
          }
        />
        <main
          key={activeNav}
          style={{ marginTop: 'var(--topbar-h, 56px)', padding: '32px', flex: 1, animation: 'screen-in 0.18s ease-out both' }}
        >
          <StudioErrorBoundary resetKey={`${activeNav}:${routeDirectorMode || ''}`} onReset={() => handleNav('home')}>
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
      <RequireProductAccess>
        {access => (
          <ProductionProvider>
            <StudioApp access={access} />
          </ProductionProvider>
        )}
      </RequireProductAccess>
    </RequireAuth>
  );
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/studio" replace />} />
      <Route path="/auth" element={protectedStudio} />
      <Route path="/studio" element={protectedStudio} />
      <Route path="/studio/:screen" element={protectedStudio} />
      <Route path="/studio/:screen/:projectId" element={protectedStudio} />
      {/* Unknown paths: a bare app slug (/cast) redirects into the shell;
          anything else falls through to the landing page. */}
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  );
}
