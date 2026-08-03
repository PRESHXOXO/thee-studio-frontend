import React from 'react';
import { Sidebar } from './components/navigation/Sidebar.jsx';
import { Topbar } from './components/navigation/Topbar.jsx';
import { StudioHome } from './screens/StudioHome.jsx';
import { TheeDirector } from './screens/TheeDirector.jsx';
import { ImageGenerator } from './screens/ImageGenerator.jsx';
import { Characters } from './screens/Characters.jsx';
import { Scenes } from './screens/Scenes.jsx';
import { References } from './screens/References.jsx';
import { Campaigns } from './screens/Campaigns.jsx';
import { Library } from './screens/Library.jsx';
import { History } from './screens/History.jsx';
import { Settings } from './screens/Settings.jsx';
import { loadLibrary } from './lib/library.js';
import { useAuth } from './auth/AuthContext.jsx';
import { accessBadgeLabel, accessView, useStudioAccess } from './api/access.js';
import { LoginScreen } from './components/auth/LoginScreen.jsx';
import { AccessScreen } from './components/auth/AccessScreen.jsx';

const BASE_NAV = [
  { section: 'Create' },
  { id: 'home', label: 'Studio', icon: 'layout-dashboard' },
  { id: 'images', label: 'Image Generator', icon: 'image' },
  { id: 'director', label: 'Thee Director', icon: 'clapperboard' },
  { id: 'characters', label: 'Characters', icon: 'sparkles' },
  { id: 'scenes', label: 'Scenes', icon: 'mountain-snow' },
  { id: 'references', label: 'References', icon: 'images' },
  { section: 'Workspace' },
  { id: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
  { id: 'library', label: 'Library', icon: 'folder-open' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const SCREENS = {
  home: { label: 'Studio', component: StudioHome },
  director: { label: 'Thee Director', component: TheeDirector },
  images: { label: 'Image Generator', component: ImageGenerator },
  characters: { label: 'Characters', component: Characters },
  scenes: { label: 'Scenes', component: Scenes },
  references: { label: 'References', component: References },
  campaigns: { label: 'Campaigns', component: Campaigns },
  library: { label: 'Library', component: Library },
  history: { label: 'History', component: History },
  settings: { label: 'Engine Library', component: Settings },
};

function StudioShell({ access, onSignOut }) {
  const [activeNav, setActiveNav] = React.useState('home');
  const [pendingPrompts, setPendingPrompts] = React.useState(null);
  const [pendingCharacter, setPendingCharacter] = React.useState(null);
  const [pendingDirector, setPendingDirector] = React.useState(null);
  const [activeCharacter, setActiveCharacter] = React.useState(null);
  const [libCount, setLibCount] = React.useState(() => loadLibrary().length);

  const handleNav = React.useCallback((id, data) => {
    setLibCount(loadLibrary().length);
    if (id === 'images' && data) setPendingPrompts(data);
    if (id === 'characters' && data) setPendingCharacter(data);
    if (id === 'director' && data) setPendingDirector(data);
    if (id !== 'images') setPendingPrompts(null);
    if (id !== 'characters' || !data) setPendingCharacter(null);
    if (id !== 'director' || !data) setPendingDirector(null);
    setActiveNav(id);
  }, []);

  const navItems = React.useMemo(() => BASE_NAV.map(item =>
    item.id === 'library' && libCount > 0 ? { ...item, badge: String(libCount) } : item
  ), [libCount]);

  const Screen = SCREENS[activeNav]?.component || StudioHome;
  const screenLabel = SCREENS[activeNav]?.label || 'Studio Home';
  const screenProps = { onNav: handleNav };
  if (activeNav === 'images' && pendingPrompts) screenProps.initialPrompts = pendingPrompts;
  if (activeNav === 'characters' && pendingCharacter) screenProps.initialCharacter = pendingCharacter;
  if (activeNav === 'characters') screenProps.onCharacterChange = setActiveCharacter;
  if (activeNav === 'director' && pendingDirector) {
    screenProps.initialScene = pendingDirector.scene || 'None';
    screenProps.initialVision = pendingDirector.vision || '';
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar items={navItems} active={activeNav} onNavigate={id => handleNav(id)} activeCharacter={activeCharacter} />
      <div style={{ marginLeft: 'var(--sidebar-w, 248px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar
          context={screenLabel}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div title="Connected" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--cream-deep)', border: '1px solid var(--border)', font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                Connected
              </div>
              <div style={{ padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--rose-glass)', border: '1px solid var(--border)', font: '500 0.72rem/1 var(--font-ui)', color: 'var(--accent-deep)' }}>
                {accessBadgeLabel(access)}
              </div>
              <button onClick={onSignOut} style={{ border: '1px solid var(--border)', background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '7px 10px', cursor: 'pointer', font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-body)' }}>
                Sign Out
              </button>
            </div>
          }
        />
        <main key={activeNav} style={{ marginTop: 'var(--topbar-h, 56px)', padding: '32px', flex: 1, animation: 'screen-in 0.18s ease-out both' }}>
          <Screen {...screenProps} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { client, session, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const accessState = useStudioAccess(session, client);

  if (authLoading) return <AccessScreen title="Connecting…" loading />;
  if (!session) return <LoginScreen onSignIn={signIn} error={authError} configured={Boolean(client)} />;

  const view = accessView(accessState.access, accessState.error);
  if (accessState.loading) return <AccessScreen title="Connecting…" loading />;
  if (view.state !== 'allowed') {
    return <AccessScreen title={view.title} detail={view.detail} onRetry={accessState.error ? accessState.refresh : null} onSignOut={signOut} />;
  }
  return <StudioShell access={accessState.access} onSignOut={signOut} />;
}
