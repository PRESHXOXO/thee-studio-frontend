import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { Landing } from './screens/Landing.jsx';
import { Auth } from './screens/Auth.jsx';

const BASE_NAV = [
  { section: 'Create' },
  { id: 'home',       label: 'Studio',          icon: 'layout-dashboard' },
  { id: 'images',     label: 'Image Generator', icon: 'image' },
  { id: 'director',   label: 'Thee Director',   icon: 'clapperboard' },
  { id: 'characters', label: 'Characters',      icon: 'sparkles' },
  { id: 'scenes',     label: 'Scenes',          icon: 'mountain-snow' },
  { id: 'references', label: 'References',      icon: 'images' },
  { section: 'Workspace' },
  { id: 'campaigns',  label: 'Campaigns',       icon: 'megaphone' },
  { id: 'library',    label: 'Library',         icon: 'folder-open' },
  { id: 'history',    label: 'History',         icon: 'history' },
  { id: 'settings',   label: 'Settings',        icon: 'settings' },
];

const SCREENS = {
  home:       { label: 'Studio',           component: StudioHome },
  director:   { label: 'Thee Director',    component: TheeDirector },
  images:     { label: 'Image Generator',  component: ImageGenerator },
  characters: { label: 'Characters',       component: Characters },
  scenes:     { label: 'Scenes',           component: Scenes },
  references: { label: 'References',       component: References },
  campaigns:  { label: 'Campaigns',        component: Campaigns },
  library:    { label: 'Library',          component: Library },
  history:    { label: 'History',          component: History },
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
        const res = await fetch('/gradio_api/config', { signal: controller.signal });
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

export default function App() {
  const [activeNav, setActiveNav]             = React.useState('home');
  const [pendingPrompts,   setPendingPrompts]   = React.useState(null);
  const [pendingCharacter, setPendingCharacter] = React.useState(null);
  const [pendingDirector,  setPendingDirector]  = React.useState(null);
  const [activeCharacter,  setActiveCharacter]  = React.useState(null);
  const [libCount, setLibCount]               = React.useState(() => loadLibrary().length);
  const backendStatus = useBackendStatus();

  // Refresh library count whenever user navigates (catches new saves)
  const handleNav = React.useCallback((id, data) => {
    setLibCount(loadLibrary().length);
    if (id === 'images'     && data) setPendingPrompts(data);
    if (id === 'characters' && data) setPendingCharacter(data);
    if (id === 'director'   && data) setPendingDirector(data);
    if (id !== 'images')     setPendingPrompts(null);
    if (id !== 'characters' || !data) setPendingCharacter(null);
    if (id !== 'director'  || !data) setPendingDirector(null);
    setActiveNav(id);
  }, []);

  const navItems = React.useMemo(() => BASE_NAV.map(item =>
    item.id === 'library' && libCount > 0 ? { ...item, badge: String(libCount) } : item
  ), [libCount]);

  const Screen = SCREENS[activeNav]?.component || StudioHome;
  const screenLabel = SCREENS[activeNav]?.label || 'Studio Home';

  const screenProps = { onNav: handleNav };
  if (activeNav === 'images'     && pendingPrompts)   screenProps.initialPrompts   = pendingPrompts;
  if (activeNav === 'characters' && pendingCharacter) screenProps.initialCharacter = pendingCharacter;
  if (activeNav === 'characters') screenProps.onCharacterChange = setActiveCharacter;
  if (activeNav === 'director'   && pendingDirector) {
    screenProps.initialScene  = pendingDirector.scene  || 'None';
    screenProps.initialVision = pendingDirector.vision || '';
  }

  const statusColor = backendStatus === 'online' ? '#22c55e' : backendStatus === 'offline' ? '#ef4444' : '#f59e0b';
  const statusLabel = backendStatus === 'online' ? 'Backend online' : backendStatus === 'offline' ? 'Backend offline' : 'Connecting…';

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/studio/*" element={
        <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
          <Sidebar items={navItems} active={activeNav} onNavigate={id => handleNav(id)} activeCharacter={activeCharacter} />
          <div style={{ marginLeft: 'var(--sidebar-w, 248px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Topbar
              context={screenLabel}
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
              key={activeNav}
              style={{ marginTop: 'var(--topbar-h, 56px)', padding: '32px', flex: 1, animation: 'screen-in 0.18s ease-out both' }}
            >
              <Screen {...screenProps} />
            </main>
          </div>
        </div>
      } />
      {/* Fallback — redirect old root to landing */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
