import { useEffect, useRef, useState } from 'react';

const EFFECT_NAMES = { none: 'None', rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars' };

// A button that opens a short list above it. The list closes when something in it is picked,
// on Escape, and on a click anywhere else.
function Menu({ label, value, children }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="menu" ref={box}>
      <button type="button" className="chip" aria-label={label} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {value} <span aria-hidden="true">&#9662;</span>
      </button>
      {open && (
        <div className="menu-list" role="group" aria-label={label} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

// The buttons on the room: switch room, pick an effect, the light and, where the scene allows it, Decorate.
export default function Controls({ scenes, scene, settings, onChooseScene, onSettingsChange, onDecorate }) {
  return (
    <div className="controls">
      <Menu label="Switch room" value={scene.name}>
        {scenes.map((s) => (
          <button key={s.slug} type="button" className="chip" aria-pressed={s.slug === scene.slug} onClick={() => onChooseScene(s)}>
            {s.name}
          </button>
        ))}
      </Menu>
      <Menu label="Effects" value={settings.effect === 'none' ? 'Effects' : EFFECT_NAMES[settings.effect] || settings.effect}>
        {['none', ...scene.effects].map((name) => (
          <button
            key={name}
            type="button"
            className="chip"
            aria-pressed={settings.effect === name}
            onClick={() => onSettingsChange({ ...settings, effect: name })}
          >
            {EFFECT_NAMES[name] || name}
          </button>
        ))}
      </Menu>
      <button
        type="button"
        className="chip"
        aria-pressed={settings.lightOn}
        onClick={() => onSettingsChange({ ...settings, lightOn: !settings.lightOn })}
      >
        Light {settings.lightOn ? 'on' : 'off'}
      </button>
      {onDecorate && (
        <button type="button" className="chip" onClick={onDecorate}>
          Decorate
        </button>
      )}
    </div>
  );
}
