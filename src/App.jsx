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
import { AdminTelemetry } from './screens/AdminTelemetry.jsx';
import { fetchAdminAccess } from './api/adminTelemetry.js';
import { loadLibrary } from './lib/library.js';
import { resolveActiveCreator } from './lib/activeCreator.js';
import { loadCharacters } from './lib/creatorCache.js';
import { StudioErrorBoundary } from './components/system/StudioErrorBoundary.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ProductionProvider } from './context/ProductionContext.jsx';
import { AccessScreen } from './components/auth/AccessScreen.jsx';
import { accessBadgeLabel, accessView, useStudioAccess } from './api/access.js';
import { isCloudMvpEnabled } from './lib/cloudMvp.js';
import { Landing } from './screens/Landing.jsx';
import { Auth } from './screens/Auth.jsx';
import { ForgotPassword } from './screens/ForgotPassword.jsx';
import { ResetPassword } from './screens/ResetPassword.jsx';
import { Plans } from './screens/Plans.jsx';

function useMediaQuery(query) {
  const read = React.useCallback(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  ), [query]);
  const [matches, setMatches] = React.useState(read);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);

  return matches;
}

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) return <AccessScreen title="Opening your studio…" loading />;
  if (!auth.session) return <Navigate to="/login" replace state={{ from: `${window.location.pathname}${window.location.search}` }} />;
  return children;
}

function RequireProductAccess({ children }) {
  const auth = useAuth();
  const accessState = useStudioAccess(auth.session?.raw ?? null, auth.client);
  const location = useLocation();
  const view = accessView(accessState.access, accessState.error);

  React.useEffect(() => {
    if (new URLSearchParams(location.search).get('checkout') !== 'success' || view.state === 'allowed') return undefined;
    let checks = 0;
    const timer = window.setInterval(() => {
      checks += 1;
      accessState.refresh();
      if (checks >= 15) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [accessState.refresh, location.search, view.state]);

  if (accessState.loading) return <AccessScreen title="Connecting…" loading />;
  if (view.state === 'pricing_required') return <Navigate to="/plans" replace state={{ from: location.pathname }} />;
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
  admin: 'admin-telemetry', 'admin-telemetry': 'admin-telemetry', usage: 'admin-telemetry',
};

function slugToScreenId(slug) {
  if (!slug) return 'home';
  return SLUG_TO_ID[String(slug).toLowerCase()] || null;
}

const DIRECTOR_MODE_TO_SLUG = { guided: 'guided', describe: 'describe-it', talk: 'scene-flow' };

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

function UnknownRoute() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const id = slugToScreenId(segments[0]);
  if (id) return <Navigate to={`/studio/${segments.join('/')}`} replace />;
  return <Navigate to="/" replace />;
}

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
  { id: 'runs',       label: 'Jobs',            icon: 'activity' },
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
  'admin-telemetry': { label: 'Cost & Profitability', component: AdminTelemetry },
};

function StudioApp({ access }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { screen: screenSlug, projectId } = useParams();
  const auth = useAuth();
  const authSession = auth.session;
  const cloudMvp = isCloudMvpEnabled(import.meta.env);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const initialNav = slugToScreenId(screenSlug) || 'home';

  const [activeNav, setActiveNav] = React.useState(initialNav);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [pendingCharacter, setPendingCharacter] = React.useState(null);
  const [pendingDirector, setPendingDirector] = React.useState(null);
  const [pendingImages, setPendingImages] = React.useState(null);
  const [activeCharacter, setActiveCharacter] = React.useState(() => {
    try { return resolveActiveCreator(loadCharacters()); }
    catch { return null; }
  });

  const activeCharacterSessionRef = React.useRef(authSession?.id ?? null);
  React.useEffect(() => {
    const nextId = authSession?.id ?? null;
    if (activeCharacterSessionRef.current === nextId) return;
    activeCharacterSessionRef.current = nextId;
    setActiveCharacter(resolveActiveCreator(loadCharacters()));
  }, [authSession?.id]);

  React.useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  React.useEffect(() => {
    if (!isMobile || !mobileMenuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isMobile, mobileMenuOpen]);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const [libCount, setLibCount] = React.useState(() => loadLibrary().length);
  const [pendingImportRequest, setPendingImportRequest] = React.useState(false);
  const [adminAccess, setAdminAccess] = React.useState({ allowed: false, role: null, checked: auth.mode !== 'cloud' });
  const routeDirectorMode = activeNav === 'director'
    ? directorModeFromSlug(projectId) || directorModeFromSlug(screenSlug) || 'guided'
    : null;

  React.useEffect(() => {
    let active = true;
    if (auth.mode !== 'cloud') return undefined;
    fetchAdminAccess().then(result => { if (active) setAdminAccess({ ...result, checked: true }); });
    return () => { active = false; };
  }, [auth.mode, authSession?.user?.id]);

  const handleNav = React.useCallback((id, data) => {
    setMobileMenuOpen(false);
    setLibCount(loadLibrary().length);
    if (id === 'characters' && data === 'import') setPendingImportRequest(true);
    else if (id === 'characters' && data) setPendingCharacter(data);
    if (id === 'director' && data) setPendingDirector(data);
    if (id === 'images' && data) setPendingImages(data);
    if (id !== 'characters' || data !== 'import') setPendingImportRequest(false);
    if (id !== 'characters' || !data || data === 'import') setPendingCharacter(null);
    if (id !== 'director' || !data) setPendingDirector(null);
    if (id !== 'images' || !data) setPendingImages(null);
    setActiveNav(id);

    const query = id === 'library' && data?.filter
      ? `?filter=${encodeURIComponent(data.filter)}`
      : '';
    const target = id === 'director'
      ? directorModePath(directorModeFromSlug(data?.mode || data?.settings?.workflow) || 'guided')
      : `/studio/${id}${query}`;
    navigate(target, { replace: false });
  }, [navigate]);

  React.useEffect(() => {
    const id = slugToScreenId(screenSlug);
    if (id && id !== activeNav) setActiveNav(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSlug]);

  React.useEffect(() => {
    if (activeNav !== 'director') return;
    const canonical = directorModePath(routeDirectorMode);
    if (location.pathname !== canonical) navigate(canonical, { replace: true });
  }, [activeNav, location.pathname, navigate, routeDirectorMode]);

  const navItems = React.useMemo(() => {
    const items = BASE_NAV.map(item =>
      item.id === 'library' && libCount > 0 ? { ...item, badge: String(libCount) } : item
    );
    if (adminAccess.allowed) items.push(
      { section: 'Admin' },
      { id: 'admin-telemetry', label: 'Cost & Profitability', icon: 'activity' },
    );
    return items;
  }, [adminAccess.allowed, libCount]);

  const Screen = SCREENS[activeNav]?.component || StudioHome;
  const screenLabel = SCREENS[activeNav]?.label || 'Studio Home';
  const screenProps = {
    onNav: handleNav,
    cloudMvp: activeNav === 'images' ? cloudMvp : false,
    mobile: isMobile,
  };

  if (activeNav === 'characters' && pendingCharacter) screenProps.initialCharacter = pendingCharacter;
  if (activeNav === 'characters' && pendingImportRequest) screenProps.initialImportRequest = true;
  if (activeNav === 'characters') screenProps.onCharacterChange = setActiveCharacter;
  if (activeNav === 'library') screenProps.initialFilter = new URLSearchParams(location.search).get('filter') || 'all';
  if (activeNav === 'admin-telemetry') {
    screenProps.authorized = adminAccess.allowed;
    screenProps.accessChecked = adminAccess.checked;
    screenProps.adminRole = adminAccess.role;
  }
  if (activeNav === 'settings') screenProps.access = access;
  if (activeNav === 'images' && pendingImages) {
    screenProps.initialCreatorId = pendingImages.creatorId || null;
    screenProps.initialName = pendingImages.name || '';
    screenProps.initialNiche = pendingImages.niche || '';
    screenProps.initialVision = pendingImages.vision || '';
    screenProps.initialDescription = pendingImages.description || '';
  }
  if (activeNav === 'director') {
    screenProps.onActiveCreatorChange = setActiveCharacter;
    screenProps.initialMode = routeDirectorMode;
    screenProps.onModeChange = mode => navigate(directorModePath(mode), { replace: false });
  }
  if (activeNav === 'director' && pendingDirector) {
    screenProps.initialScene = pendingDirector.scene || 'None';
    screenProps.initialVision = pendingDirector.vision || '';
    screenProps.initialMode = directorModeFromSlug(pendingDirector.mode || pendingDirector.settings?.workflow) || routeDirectorMode;
    screenProps.initialSettings = pendingDirector.settings || null;
    if (pendingDirector.campaignId) {
      screenProps.initialCampaign = {
        id: pendingDirector.campaignId,
        name: pendingDirector.campaignName || '',
        brief: pendingDirector.campaignBrief || '',
        creatorId: pendingDirector.creatorId ?? null,
      };
    } else if (pendingDirector.creatorId != null) {
      screenProps.initialCreatorId = pendingDirector.creatorId;
    }
  }

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login', { replace: true });
  };

  const topbarOffset = isMobile
    ? 'calc(var(--topbar-h, 56px) + env(safe-area-inset-top))'
    : 'var(--topbar-h, 56px)';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', overflowX: 'hidden' }}>
      <Sidebar
        items={navItems}
        active={activeNav}
        onNavigate={handleNav}
        activeCharacter={activeCharacter}
        creatorDestination="characters"
        mobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div style={{
        marginLeft: isMobile ? 0 : 'var(--sidebar-w, 248px)',
        display: 'flex', flexDirection: 'column', minHeight: '100dvh', minWidth: 0,
      }}>
        <Topbar
          context={screenLabel}
          onNav={handleNav}
          user={authSession?.name || 'Thee Studio'}
          userEmail={authSession?.email}
          onSignOut={handleSignOut}
          allowedNavIds={null}
          showSettings
          mobile={isMobile}
          onMenuClick={() => setMobileMenuOpen(true)}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div title="Internal access with usage tracking" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-indigo-soft)', border: '1px solid var(--border)', font: '600 0.75rem/1 var(--font-ui)', color: 'var(--accent-indigo)' }}>
                <span>✦</span>{accessBadgeLabel(access)}
              </div>
              <div title="Connected" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--cream-deep)', border: '1px solid var(--border)', font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                Connected
              </div>
            </div>
          }
        />
        <main
          key={activeNav}
          style={{
            marginTop: topbarOffset,
            padding: isMobile
              ? '16px 14px max(24px, env(safe-area-inset-bottom))'
              : '32px',
            flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box',
            animation: 'screen-in 0.18s ease-out both',
          }}
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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/studio" element={protectedStudio} />
      <Route path="/studio/:screen" element={protectedStudio} />
      <Route path="/studio/:screen/:projectId" element={protectedStudio} />
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  );
}
