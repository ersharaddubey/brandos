/**
 * FILE: frontend/src/components/navbar/TitleBar.jsx
 * PURPOSE: Custom title-bar for the frameless Electron window —
 * minimize/maximize/close buttons + drag-handle, since main.js sets
 * frame: false.
 */

import { useState,useEffect  } from 'react';
import './TitleBar.css';

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isStealthOn, setIsStealthOn] = useState(true);
  const [opacity, setOpacityState] = useState(1);


  useEffect(() => {
    window.electronAPI?.getStealthMode().then((result) => {
      if (result) setIsStealthOn(result.stealthEnabled);
    });
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    const result = await window.electronAPI?.maximizeWindow();
    if (result) setIsMaximized(result.isMaximized);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleToggleStealth = async () => {
    const next = !isStealthOn;
    const result = await window.electronAPI?.setStealthMode(next);
    if (result) setIsStealthOn(result.stealthEnabled);
  };

  const handleOpacityChange = async (e) => {
    const value = parseFloat(e.target.value);
    const result = await window.electronAPI?.setOpacity(value);
    if (result) setOpacityState(result.opacity);
  };

  return (
    <div className="titlebar">
      <div className="titlebar__drag-region">
        <span className="titlebar__title">Support Assistant</span>
      </div>
      <div className="titlebar__controls">
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={opacity}
          onChange={handleOpacityChange}
          className="titlebar__opacity-slider"
          title={`Opacity: ${Math.round(opacity * 100)}%`}
        />
        <button
          className={`titlebar__btn titlebar__btn--stealth ${isStealthOn ? 'titlebar__btn--active' : ''}`}
          onClick={handleToggleStealth}
          aria-label="Toggle Stealth Mode"
          title={isStealthOn ? 'Stealth Mode: ON' : 'Stealth Mode: OFF'}
        >
          {isStealthOn ? '🙈' : '👁️'}
        </button>
        <button className="titlebar__btn" onClick={handleMinimize} aria-label="Minimize">
          &#8211;
        </button>
        <button className="titlebar__btn" onClick={handleMaximize} aria-label="Maximize">
          {isMaximized ? '❐' : '□'}
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={handleClose} aria-label="Close">
          &#10005;
        </button>
      </div>
    </div>
  );
}

export default TitleBar;