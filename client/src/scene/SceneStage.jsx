import Effect from './Effects.jsx';
import { useParallax } from './parallax.js';
import { applyObjectAction } from './sceneSettings.js';
import './scene.css';

// Draws one scene: its layers stacked on top of each other (moving with the mouse),
// the effect on the right layer, and a button over each clickable object.
//   scene            the scene from the API
//   settings         { effect, lightOn }, kept by the parent so a saved room can remember them
//   onSettingsChange called with the new settings after a click
//   onNextTrack      called when the music object is clicked (the CD player will use this)
export default function SceneStage({ scene, settings, onSettingsChange, onNextTrack }) {
  const depths = scene.layers.map((layer) => layer.depth);
  const { stageRef, layerRef, handlers } = useParallax(depths);

  function handleClick(object) {
    if (object.action.type === 'nextTrack') onNextTrack?.(object);
    else onSettingsChange(applyObjectAction(settings, object));
  }

  const isOn = (object) =>
    (object.action.type === 'toggleLight' && settings.lightOn) ||
    (object.action.type === 'toggleEffect' && settings.effect === object.action.effect);

  return (
    <div
      ref={stageRef}
      className={`stage${settings.lightOn ? '' : ' lights-off'}`}
      data-testid="stage"
      {...handlers}
    >
      {scene.layers.map((layer, i) => (
        <div key={layer.image} ref={layerRef(i)} className="layer">
          <img src={layer.image} alt="" draggable={false} />
          {i === scene.effectLayer && <Effect name={settings.effect} />}
          {scene.objects
            .filter((object) => object.layer === i)
            .map((object) => (
              <button
                key={object.key}
                type="button"
                className={`hotspot${isOn(object) ? ' is-on' : ''}`}
                style={{
                  left: `${object.x}%`,
                  top: `${object.y}%`,
                  width: `${object.width}%`,
                  height: `${object.height}%`,
                }}
                aria-label={object.label}
                onClick={() => handleClick(object)}
              >
                <span className="hotspot-label">{object.label}</span>
              </button>
            ))}
        </div>
      ))}
      <div className="dim" />
    </div>
  );
}
