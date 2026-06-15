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

const NAV_ITEMS = [
  { section: 'Create' },
  { id: 'home',       label: 'Studio',          icon: 'layout-dashboard' },
  { id: 'director',   label: 'Thee Director',   icon: 'clapperboard' },
  { id: 'images',     label: 'Image Generator', icon: 'image' },
  { id: 'characters', label: 'Characters',      icon: 'sparkles' },
  { id: 'scenes',     label: 'Scenes',          icon: 'mountain-snow' },
  { id: 'references', label: 'References',      icon: 'images', badge: '24' },
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

export default function App() {
  const [activeNav, setActiveNav] = React.useState('home');
  const [pendingPrompts,   setPendingPrompts]   = React.useState(null);
  const [pendingCharacter, setPendingCharacter] = React.useState(null);

  function handleNav(id, data) {
    if (id === 'images'     && data) setPendingPrompts(data);
    if (id === 'characters' && data) setPendingCharacter(data);
    // Clear pending state when navigating away or navigating back without fresh data
    if (id !== 'images')     setPendingPrompts(null);
    if (id !== 'characters' || !data) setPendingCharacter(null);
    setActiveNav(id);
  }

  const Screen = SCREENS[activeNav]?.component || StudioHome;
  const screenLabel = SCREENS[activeNav]?.label || 'Studio Home';

  const screenProps = { onNav: handleNav };
  if (activeNav === 'images'     && pendingPrompts)   screenProps.initialPrompts   = pendingPrompts;
  if (activeNav === 'characters' && pendingCharacter) screenProps.initialCharacter = pendingCharacter;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar items={NAV_ITEMS} active={activeNav} onNavigate={id => handleNav(id)} />
      <div style={{ marginLeft: 'var(--sidebar-w, 248px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar context={screenLabel} />
        <main style={{ marginTop: 'var(--topbar-h, 56px)', padding: '32px', flex: 1 }}>
          <Screen {...screenProps} />
        </main>
      </div>
    </div>
  );
}
