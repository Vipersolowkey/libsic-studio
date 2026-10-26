import { useEffect, useState } from 'react';
import { getScenes } from '../api.js';
import SceneStage from '../scene/SceneStage.jsx';
import { defaultSettings } from '../scene/sceneSettings.js';

const EFFECT_NAMES = { none: 'None', rain: 'Rain', snow: 'Snow', fireflies: 'Fireflies', stars: 'Stars' };

export default function HomePage() {
  const [scenes, setScenes] = useState(null); // null = still loading
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');
  const [settings, setSettings] = useState({ effect: 'none', lightOn: true });
  const [attempt, setAttempt] = useState(0); // bump to try loading again

  useEffect(() => {
    let cancelled = false;
    setError('');
    getScenes()
      .then((list) => {
        if (cancelled) return;
        setScenes(list);
        if (list.length > 0) {
          setSlug(list[0].slug);
          setSettings(defaultSettings(list[0]));
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <main className="message-page">
        <h1>Libsic Studio</h1>
        <p>{error}</p>
        <button type="button" className="chip" onClick={() => setAttempt(attempt + 1)}>
          Try again
        </button>
      </main>
    );
  }
  if (scenes === null) {
    return (
      <main className="message-page">
        <p>Loading scenes…</p>
      </main>
    );
  }
  if (scenes.length === 0) {
    return (
      <main className="message-page">
        <p>No scenes yet. Run "npm run seed:scenes" in the api folder.</p>
      </main>
    );
  }

  const scene = scenes.find((s) => s.slug === slug) || scenes[0];

  function chooseScene(next) {
    setSlug(next.slug);
    setSettings(defaultSettings(next));
  }

  return (
    <div className="home">
      <SceneStage
        key={scene.slug}
        scene={scene}
        settings={settings}
        onSettingsChange={setSettings}
      />
      <div className="controls">
        <div className="control-group" role="group" aria-label="Scene">
          <span>Scene</span>
          {scenes.map((s) => (
            <button key={s.slug} type="button" className="chip" aria-pressed={s.slug === scene.slug} onClick={() => chooseScene(s)}>
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
              onClick={() => setSettings({ ...settings, effect: name })}
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
            onClick={() => setSettings({ ...settings, lightOn: !settings.lightOn })}
          >
            Light {settings.lightOn ? 'on' : 'off'}
          </button>
        </div>
      </div>
    </div>
  );
}
