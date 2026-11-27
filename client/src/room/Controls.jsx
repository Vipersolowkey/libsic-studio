// Part of: Room page, side bar: light and weather buttons, Decorate button.
// Uses: Sidebar.jsx, sceneSettings.js, skins.js.
// Used by: RoomScreen.jsx.
import { Section } from './Sidebar.jsx';
import { skinOf } from './skins.js';
import { activeEffect } from '../scene/sceneSettings.js';

// Button labels and icons per effect name (the names allowed by the API). A new effect needs an entry in both, or it shows its raw name and a dots icon.
const EFFECT_NAMES = { rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars', dust: 'Dust', bubbles: 'Bubbles', plankton: 'Plankton', glitter: 'Glitter' };

// Outline icons (stroke only, so they take the button colour).
const DOTS = <><circle cx="6" cy="8" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="17" cy="10" r="1" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="17" r="1" /><circle cx="5" cy="19" r="1" /></>;
const EFFECT_ICONS = {
  rain: <><path d="M7 12a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 12z" /><path d="M8 15l-1 3M12 15l-1 3M16 15l-1 3" /></>,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  fireflies: <><circle cx="7" cy="8" r="1.6" /><circle cx="16" cy="6" r="1.6" /><circle cx="12" cy="14" r="1.6" /><circle cx="18" cy="17" r="1.6" /><circle cx="5" cy="18" r="1.6" /></>,
  stars: <path d="M12 3l2.4 6 6.6.5-5 4.3 1.6 6.4-5.6-3.5L6.4 20.2 8 13.8 3 9.5 9.6 9z" />,
  bubbles: <><circle cx="9" cy="15" r="5" /><circle cx="17" cy="7" r="2.5" /><circle cx="6" cy="6" r="1.2" /></>,
  plankton: DOTS,
  glitter: <path d="M12 2c.6 5.5 3.5 8.4 9 9-5.5.6-8.4 3.5-9 9-.6-5.5-3.5-8.4-9-9 5.5-.6 8.4-3.5 9-9z" />,
  dust: DOTS,
};
const Icon = ({ children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;

// Main part of the side bar: Mood (light + effect toggles) and the Decorate button. Choosing or making another room happens on the studio page (/me).
// Clicking the active effect again switches it off ('none'). onDecorate is omitted for scenes without a catalog (button hidden).
// Light labels come from the room's skin (skins.js).
// ===== SIDE BAR MAIN PART: Mood (light + weather; changes the saved settings) and the Decorate button =====
export default function Controls({ scene, settings, onSettingsChange, onDecorate }) {
  const [lit, unlit] = skinOf(scene.slug).light;
  return (
    <>
      <Section title="Mood">
        <div className="daynight" role="group" aria-label="Light">
          <button type="button" aria-pressed={settings.lightOn} onClick={() => onSettingsChange({ ...settings, lightOn: true })}>{lit}</button>
          <button type="button" aria-pressed={!settings.lightOn} onClick={() => onSettingsChange({ ...settings, lightOn: false })}>{unlit}</button>
        </div>
        {scene.effects.length > 0 && (
          <div className="stamps" role="group" aria-label="Effects">
            {scene.effects.map((name) => (
              <button
                key={name}
                type="button"
                className="stamp"
                aria-pressed={activeEffect(scene, settings.effect) === name}
                onClick={() => onSettingsChange({ ...settings, effect: activeEffect(scene, settings.effect) === name ? 'none' : name })}
              >
                <Icon>{EFFECT_ICONS[name] || DOTS}</Icon>
                <span>{EFFECT_NAMES[name] || name}</span>
              </button>
            ))}
          </div>
        )}
      </Section>
      {onDecorate && (
        <Section>
          <button type="button" className="make" onClick={onDecorate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" /></svg>
            Decorate this room
          </button>
        </Section>
      )}
    </>
  );
}
