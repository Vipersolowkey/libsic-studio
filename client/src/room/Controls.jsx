import { Section } from './Sidebar.jsx';

const EFFECT_NAMES = { rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars', dust: 'Dust', bubbles: 'Bubbles', plankton: 'Plankton' };

// The list of rooms, each with a small picture. The room that is open is marked.
// The pictures are /scenes/<slug>/preview.webp; a room without one shows a plain dark card.
export function RoomList({ scenes, scene, onChooseScene }) {
  return (
    <div className="room-list" role="group" aria-label="Switch room">
      {scenes.map((s) => (
        <button key={s.slug} type="button" className="room-card" aria-pressed={s.slug === scene.slug} onClick={() => onChooseScene(s)}>
          <img src={`/scenes/${s.slug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={(e) => (e.target.style.visibility = 'hidden')} />
          <span>{s.name}</span>
        </button>
      ))}
    </div>
  );
}

// The main part of the side bar: the rooms, and one row of switches for the room that is open.
// Each effect of the scene is a switch (pressing the one that is on turns it off), next to the light and,
// where the scene allows it, Decorate.
export default function Controls({ scenes, scene, settings, onChooseScene, onSettingsChange, onDecorate }) {
  return (
    <>
      <Section title="Rooms">
        <RoomList scenes={scenes} scene={scene} onChooseScene={onChooseScene} />
      </Section>
      <Section title="This room">
        <div className="chip-row">
          <div className="chip-group" role="group" aria-label="Effects">
            {scene.effects.map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                aria-pressed={settings.effect === name}
                onClick={() => onSettingsChange({ ...settings, effect: settings.effect === name ? 'none' : name })}
              >
                {EFFECT_NAMES[name] || name}
              </button>
            ))}
          </div>
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
      </Section>
    </>
  );
}
