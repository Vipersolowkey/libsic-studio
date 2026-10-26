const EFFECT_NAMES = { none: 'None', rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars' };

// The buttons under the picture: pick a scene, an effect, and the light.
export default function Controls({ scenes, scene, settings, onChooseScene, onSettingsChange }) {
  return (
    <div className="controls">
      <div className="control-group" role="group" aria-label="Scene">
        <span>Scene</span>
        {scenes.map((s) => (
          <button key={s.slug} type="button" className="chip" aria-pressed={s.slug === scene.slug} onClick={() => onChooseScene(s)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="control-group" role="group" aria-label="Effect">
        <span>Effect</span>
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
      </div>
      <div className="control-group">
        <button
          type="button"
          className="chip"
          aria-pressed={settings.lightOn}
          onClick={() => onSettingsChange({ ...settings, lightOn: !settings.lightOn })}
        >
          Light {settings.lightOn ? 'on' : 'off'}
        </button>
      </div>
    </div>
  );
}
