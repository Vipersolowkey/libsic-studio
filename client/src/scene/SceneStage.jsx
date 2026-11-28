// Part of: Room picture: draws all layers, effects and clickable objects.
// Uses: Clock.jsx, Effects.jsx, framePace.js, parallax.js, placement.js, scene.css, sceneSettings.js.
// Used by: RoomScreen.jsx.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Clock from './Clock.jsx';
import Effect from './Effects.jsx';
import { useFramePace } from './framePace.js';
import { useParallax } from './parallax.js';
import { buildDrawList, defaultItems } from './placement.js';
import { activeEffect, applyObjectAction } from './sceneSettings.js';
import './scene.css';

// Draws one scene: all its layers stacked back to front (moving with the mouse), the effect on scene.effectLayer,
// and a clickable button (hotspot) over each object. Most visual rules (light/night, animations, curtains) are CSS
// in scene.css, switched by the classes and data-attributes set here.
//   scene             from the API
//   settings          { effect, lightOn, curtainsClosed }: the saved part of a room
//   onSettingsChange  new settings after a click on an object
//   onNextTrack       the music object was clicked (RoomScreen toggles the hologram)
//   playing           music is playing: the record spins (class `paused` otherwise)
//   items             placed decorations; null = the scene's default arrangement
//   frozen            decorating: no parallax, hotspots disabled
//   still             whole picture shown (zoom < 1.25): no parallax
//   calm              low power mode: all animation stopped
//   disc              CSS gradient of the chosen CD's printed face, drawn on the spinning record
//   children          drawn on top inside the stage (the decorate overlay)
// Layer options (box, blend, light, night, glide, curtain, anim, kind, tile, item) are documented in api/src/models/Scene.js.
export default function SceneStage({ scene, settings, onSettingsChange, onNextTrack, playing = true, items = null, frozen = false, still = false, calm = false, disc = null, children }) {
  // ===== 1. DRAW LIST: scene layers + the decorations a room placed, in drawing order (scene/placement.js) =====
  const drawList = useMemo(() => buildDrawList(scene, items ?? defaultItems(scene)), [scene, items]);
  const depths = useMemo(() => drawList.map(({ layer }) => layer.depth), [drawList]);
  // ===== 2. HOOKS: mouse parallax (parallax.js), 30 fps pacing (framePace.js), fade-in when pictures arrive, day/night warm-up =====
  const { stageRef, layerRef, handlers } = useParallax(depths, !frozen && !still);
  useFramePace(stageRef, undefined, !calm); // animations redraw at 30 fps instead of 60; calm = hand them back to the browser (they are stopped by CSS)
  const arrived = usePicturesArrived(stageRef, scene.slug);
  const hasLights = drawList.some(({ layer }) => layer.light || layer.night);
  useWarmUp(stageRef, arrived && hasLights, scene.slug);

  // Memoised on purpose: there are ~100 layers, so they are rebuilt only when scene / items / settings change, not on zoom or typing.
  // ===== 3. THE LAYERS: one <div class="layer"> per draw-list entry, with its picture, clickable objects (hotspots) and effect =====
  const layers = useMemo(() => {
    // A click on an object: the music object tells RoomScreen (toggles the hologram); the others change light / effect / curtains (sceneSettings.js).
    function handleClick(object) {
      if (object.action.type === 'nextTrack') onNextTrack?.(object);
      else onSettingsChange(applyObjectAction(settings, object));
    }

    const isOn = (object) =>
      (object.action.type === 'toggleLight' && settings.lightOn) ||
      (object.action.type === 'toggleCurtains' && settings.curtainsClosed) ||
      (object.action.type === 'toggleEffect' && settings.effect === object.action.effect);

    const content = (layer, flip) =>
      flip ? (
        <div className="flip" style={{ transform: 'scaleX(-1)' }}>
          <LayerContent layer={layer} disc={disc} />
        </div>
      ) : (
        <LayerContent layer={layer} disc={disc} />
      );

    // The invisible buttons of the scene's clickable objects (API: scene.objects, set in api/src/seed/<room>.js).
    const hotspots = (templateIndex) =>
      scene.objects
        .filter((object) => object.layer === templateIndex)
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
            data-action={object.action.type}
            disabled={frozen}
            onClick={() => handleClick(object)}
          >
            <span className="hotspot-label">{object.label}</span>
          </button>
        ));

    // One wrapper per layer: a glide (fish, jellyfish), a curtain, or a normal layer. The effect (rain...) is drawn inside layer scene.effectLayer.
    return drawList.map(({ key, layer, box, templateIndex, itemId, flip }, i) => (
      <div
        key={key}
        ref={layerRef(i)}
        className="layer"
        style={layerStyle(box)}
        data-item={itemId}
        data-light={layer.light ? 'true' : undefined}
        data-night={layer.night ? 'true' : undefined}
        data-blend={layer.blend && layer.blend !== 'normal' ? layer.blend : undefined}
      >
        {layer.glide ? (
          <div className={`glide${layer.glide.mirror ? ' glide-mirror' : ''}${layer.glide.pingpong ? ' glide-pingpong' : ''}`} style={glideStyle(layer.glide)}>
            {content(layer, flip)}
          </div>
        ) : layer.curtain ? (
          <div className="curtain" style={{ transformOrigin: `${layer.curtain.origin}% 0%`, '--closed-scale': layer.curtain.scale }}>
            {content(layer, flip)}
            {hotspots(templateIndex)}
          </div>
        ) : (
          <>
            {content(layer, flip)}
            {templateIndex === scene.effectLayer && <Effect name={activeEffect(scene, settings.effect)} />}
            {hotspots(templateIndex)}
          </>
        )}
      </div>
    ));
  }, [scene, drawList, settings, frozen, layerRef, onNextTrack, onSettingsChange, disc]);

  return (
    <div
      ref={stageRef}
      className={`stage${settings.lightOn ? '' : ' lights-off'}${settings.curtainsClosed ? ' curtains-closed' : ''}${hasLights ? ' has-lights' : ''}${playing ? '' : ' paused'}${!frozen && !still ? ' parallax' : ''}${arrived ? '' : ' arriving'}${calm ? ' calm' : ''}`}
      data-testid="stage"
      {...handlers}
    >
      {layers}
      <div className="dim" style={scene.nightDim != null ? { '--dim-alpha': scene.nightDim } : undefined} />
      {children}
    </div>
  );
}

// false until the pictures of a newly opened scene have loaded (then the stage fades in as one picture).
// Gives up after 4 s so a slow or missing picture never hides the room.
const ARRIVE_WAIT_MS = 4000;
function usePicturesArrived(stageRef, slug) {
  const [arrivedSlug, setArrivedSlug] = useState(null);
  useEffect(() => {
    const pictures = [...(stageRef.current?.querySelectorAll('.layer img') ?? [])].filter((img) => !img.complete);
    // typeof createImageBitmap: the test browser never loads pictures, so there is nothing to wait for
    if (pictures.length === 0 || typeof createImageBitmap !== 'function') return setArrivedSlug(slug);
    let waiting = pictures.length;
    const done = () => {
      waiting -= 1;
      if (waiting === 0) setArrivedSlug(slug);
    };
    for (const img of pictures) {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
    const timer = setTimeout(() => setArrivedSlug(slug), ARRIVE_WAIT_MS);
    return () => {
      clearTimeout(timer);
      for (const img of pictures) {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
      }
    };
  }, [stageRef, slug]);
  return arrivedSlug === slug;
}

// Pre-draws the hidden day/night layers once (almost invisible, class `warming`) so the first day/night switch does not stutter.
// The class is set on the element directly, so React does not redraw the layers.
const WARM_UP_MS = 700;
function useWarmUp(stageRef, ready, slug) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!ready || !stage) return undefined;
    stage.classList.add('warming');
    const timer = setTimeout(() => stage.classList.remove('warming'), WARM_UP_MS);
    return () => {
      clearTimeout(timer);
      stage.classList.remove('warming');
    };
  }, [stageRef, ready, slug]);
}

// Inline style for a layer with a box. transformOrigin is set so the parallax scale(1.06) grows around the STAGE centre, not the box centre.
export function layerStyle(box) {
  const style = {};
  if (box) {
    const { x, y, width, height } = box;
    style.inset = 'auto';
    style.left = `${x}%`;
    style.top = `${y}%`;
    style.width = `${width}%`;
    style.height = `${height}%`;
    style.transformOrigin = `${((50 - x) / width) * 100}% ${((50 - y) / height) * 100}%`;
  }
  return style;
}

function glideStyle({ from, to, duration, delay }) {
  return { '--fx': `${from.x}%`, '--fy': `${from.y}%`, '--tx': `${to.x}%`, '--ty': `${to.y}%`, '--dur': `${duration}s`, '--delay': `${delay ?? 0}s` };
}

// A spinning layer whose image name ends in disc_flat / vinyl_flat is replaced by the chosen CD's printed face. (Name-based: keep this naming for new record layers.)
const PLAYER_DISC = /(disc|vinyl)_flat\.webp$/;

// What is INSIDE a layer: the live clock, a tiled picture, or the picture with its animation (CSS classes anim-<name> in scene.css).
const LayerContent = memo(function LayerContent({ layer, disc = null }) {
  if (layer.kind === 'clock') {
    // anim.skew tilts the digits to match a clock drawn at an angle.
    const skew = layer.anim?.skew ? { transform: `skewY(${layer.anim.skew}deg)`, transformOrigin: '0 0' } : undefined;
    return (
      <div className="clock" style={skew}>
        <Clock />
      </div>
    );
  }
  if (layer.tile) {
    const style = { backgroundImage: `url(${layer.image})`, backgroundSize: `${layer.tile}% auto` };
    return <div className="tiled" style={style} />;
  }
  const printed = disc && layer.anim?.name === 'spin' && PLAYER_DISC.test(layer.image);
  const picture = printed ? <div className="cd-print" style={{ '--face': disc }} /> : <LayerPicture src={layer.image} />;
  const anim = layer.anim;
  if (!anim?.name) return picture;
  const style = { '--dur': `${anim.duration ?? 6}s`, '--delay': `${anim.delay ?? 0}s` };
  if (anim.pivot) style.transformOrigin = `${anim.pivot.x}% ${anim.pivot.y}%`;
  if (anim.squash) style['--squash'] = anim.squash;
  if (anim.rest !== undefined) style['--rest'] = `${anim.rest}deg`;
  if (anim.distance !== undefined) style['--distance'] = `${anim.distance}%`;
  if (anim.amplitude !== undefined) style['--amp'] = `${anim.amplitude}deg`;
  if (anim.scaleFrom && anim.scaleTo) {
    style['--sx0'] = anim.scaleFrom.x;
    style['--sy0'] = anim.scaleFrom.y;
    style['--sx1'] = anim.scaleTo.x;
    style['--sy1'] = anim.scaleTo.y;
  }
  if (anim.name === 'spin') {
    // The disc turns inside a box squashed by anim.squash (the view from the side).
    return (
      <div className="anim anim-spin" style={style}>
        <div className="spin">{picture}</div>
      </div>
    );
  }
  return (
    <div className={`anim anim-${anim.name}`} style={style}>
      {picture}
    </div>
  );
});

// One layer's picture. GPU-memory workaround: a plain <img> makes the browser keep a screen-sized copy of every layer
// (~230 MB on a 4K screen, redrawn on zoom). So once loaded, the image is handed to a <canvas> at its own size
// (ImageBitmap) and the <img> hides (class stepped-aside). Browsers without createImageBitmap just keep the <img>.
function LayerPicture({ src }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    setHandedOver(false);
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || typeof createImageBitmap !== 'function') return undefined;
    let cancelled = false;
    const handOver = () => {
      createImageBitmap(img)
        .then((bitmap) => {
          const sheet = cancelled ? null : canvas.getContext('bitmaprenderer');
          if (!sheet) return bitmap.close();
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          sheet.transferFromImageBitmap(bitmap);
          setHandedOver(true);
        })
        .catch(() => {}); // a broken picture: the <img> stays and shows nothing, as before
    };
    if (img.complete && img.naturalWidth) handOver();
    else img.addEventListener('load', handOver, { once: true });
    return () => {
      cancelled = true;
      img.removeEventListener('load', handOver);
    };
  }, [src]);

  return (
    <>
      <img ref={imgRef} src={src} alt="" draggable={false} decoding="sync" className={handedOver ? 'stepped-aside' : undefined} />
      <canvas ref={canvasRef} className={handedOver ? 'sheet' : 'sheet stepped-aside'} aria-hidden="true" />
    </>
  );
}
