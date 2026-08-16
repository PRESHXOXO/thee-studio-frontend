import React from 'react';
import { SceneFlowV2 } from './SceneFlowV2.jsx';

// Compatibility export for older route imports. Scene Flow has one canonical
// implementation so a stale screen can never restore marker-driven rendering.
export function SceneFlow(props) {
  return <SceneFlowV2 {...props} />;
}
