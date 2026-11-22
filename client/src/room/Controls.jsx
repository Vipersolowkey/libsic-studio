import { Section } from './Sidebar.jsx';
import { skinOf } from './skins.js';

const EFFECT_NAMES = { rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars', dust: 'Dust', bubbles: 'Bubbles', plankton: 'Plankton' };

// A small outline picture for each kind of weather. Stroke only, so it takes the colour of the button it is on.
const DOTS = <><circle cx="6" cy="8" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="17" cy="10" r="1" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="17" r="1" /><circle cx="5" cy="19" r="1" /></>;
const EFFECT_ICONS = {
  rain: <><path d="M7 12a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 12z" /><path d="M8 15l-1 3M12 15l-1 3M16 15l-1 3" /></>,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  fireflies: <><circle cx="7" cy="8" r="1.6" /><circle cx="16" cy="6" r="1.6" /><circle cx="12" cy="14" r="1.6" /><circle cx="18" cy="17" r="1.6" /><circle cx="5" cy="18" r="1.6" /></>,
  stars: <path d="M12 3l2.4 6 6.6.5-5 4.3 1.6 6.4-5.6-3.5L6.4 20.2 8 13.8 3 9.5 9.6 9z" />,
  bubbles: <><circle cx="9" cy="15" r="5" /><circle cx="17" cy="7" r="2.5" /><circle cx="6" cy="6" r="1.2" /></>,
  plankton: DOTS,
  dust: DOTS,
};
const Icon = ({ children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;

// The rooms: the one you are in is a big photo, the others are small photos to pick from (the room is pinned on
// like a polaroid). The pictures are /scenes/<slug>/preview.webp; a room without one shows a plain card.
export function RoomList({ scenes, scene, onChooseScene }) {
  const photo = (s) => (
    <>
      <img src={`/scenes/${s.slug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={(e) => (e.target.style.visibility = 'hidden')} />
      <span>{s.name}</span>
    </>
  );
  const here = scenes.find((s) => s.slug === scene.slug) || scene;
  return (
    <div className="room-list" role="group" aria-label="Switch room">
      <button type="button" className="polaroid here" aria-pressed="true" onClick={() => onChooseScene(here)}>
        <i className="tape" aria-hidden="true" />
        {photo(here)}
      </button>
      <div className="others">
        {scenes.filter((s) => s.slug !== scene.slug).map((s) => (
          <button key={s.slug} type="button" className="polaroid" aria-pressed="false" onClick={() => onChooseScene(s)}>
            {photo(s)}
          </button>
        ))}
      </div>
    </div>
  );
}

// The main part of the side bar, in the order a visitor thinks of it: which room, how it feels, changing it.
//   You are in   the rooms
//   Mood         the light (two buttons) and the weather of the room, each a round stamp that is on or off
//   Decorate     moving the objects of the room, a different job from the mood, so a button of its own
export default function Controls({ scenes, scene, settings, onChooseScene, onSettingsChange, onDecorate }) {
  const [lit, unlit] = skinOf(scene.slug).light;
  return (
    <>
      <Section title="You are in">
        <RoomList scenes={scenes} scene={scene} onChooseScene={onChooseScene} />
      </Section>
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
                aria-pressed={settings.effect === name}
                onClick={() => onSettingsChange({ ...settings, effect: settings.effect === name ? 'none' : name })}
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
