import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Clock from './Clock.jsx';
import Effect from './Effects.jsx';
import { useFramePace } from './framePace.js';
import { useParallax } from './parallax.js';
import { buildDrawList, defaultItems } from './placement.js';
import { applyObjectAction } from './sceneSettings.js';
import './scene.css';

// Draws one scene: its layers stacked on top of each other (moving with the mouse),
// the effect on the right layer, and a button over each clickable object.
//   scene            the scene from the API
//   settings         { effect, lightOn, curtainsClosed }, kept by the parent so a saved room can remember them
//   onSettingsChange called with the new settings after a click
//   onNextTrack      called when the music object is clicked (the CD player will use this)
//   playing          true while music plays: the record spins and the tonearm rests on it
//   items            the objects a visitor placed (see placement.js); null shows the scene's default arrangement
//   frozen           true while decorating: the layers stay still instead of following the mouse
//   still            true when the whole picture is shown: the layers stay still, the mouse only moves them once zoomed in
//   calm             true in low power mode: every movement of the scene is stopped, so the graphics card can rest
//   children         drawn on top of everything inside the stage (the decorate overlay)
//
// A layer is a picture with a few optional extras (all set in the scene data):
//   box     where the picture sits, in percent of the stage (default: the whole stage)
//   blend   "screen" for glows, so they add light instead of covering what is below
//   light   true for lamp light: it disappears when the lights are switched off
//   night   true for a picture that only shows at night, when the lights are off (the night sky in a window)
//   glide   a slow trip across the scene that repeats (a fish, a drifting jellyfish)
//   curtain a curtain: it is drawn wider while settings.curtainsClosed is true
//   anim    a small movement: spin, tonearm, sway, steam, pulse, breathe, drift, flick, billow, throb, sweep, shut or cover
//   kind    "clock" draws the live clock instead of a picture
//   tile    repeats a small picture over the layer (film grain)
//   item    the layer belongs to an object a visitor can move: it is drawn once for each copy of that object
export default function SceneStage({ scene, settings, onSettingsChange, onNextTrack, playing = true, items = null, frozen = false, still = false, calm = false, children }) {
  const drawList = useMemo(() => buildDrawList(scene, items ?? defaultItems(scene)), [scene, items]);
  const depths = useMemo(() => drawList.map(({ layer }) => layer.depth), [drawList]);
  const { stageRef, layerRef, handlers } = useParallax(depths, !frozen && !still);
  useFramePace(stageRef); // the slow movements are redrawn 30 times per second instead of 60, which halves the drawing work
  const arrived = usePicturesArrived(stageRef, scene.slug);

  // The layers are only worked out again when the scene, the objects or the settings change. Zooming, typing the
  // room name or the buttons fading away redraw the room screen, but not the many layers of the picture.
  const layers = useMemo(() => {
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
          <LayerContent layer={layer} />
        </div>
      ) : (
        <LayerContent layer={layer} />
      );

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
            disabled={frozen}
            onClick={() => handleClick(object)}
          >
            <span className="hotspot-label">{object.label}</span>
          </button>
        ));

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
            {templateIndex === scene.effectLayer && <Effect name={settings.effect} />}
            {hotspots(templateIndex)}
          </>
        )}
      </div>
    ));
  }, [scene, drawList, settings, frozen, layerRef, onNextTrack, onSettingsChange]);

  const hasLights = drawList.some(({ layer }) => layer.light || layer.night);

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

// False while the pictures of a newly opened scene are still coming in, true once they are all there.
// Until then the stage is kept see-through and then fades in as one picture, instead of the layers popping in one
// by one. It never waits longer than a few seconds: a slow or missing picture must not hide the room.
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

// Position of a layer that does not cover the whole stage. The picture scales a little around the
// middle of the stage (see scene.css), so the point it scales from is worked out for this box.
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

const LayerContent = memo(function LayerContent({ layer }) {
  if (layer.kind === 'clock') {
    // The clock face in the picture is turned a little, so the digits are tilted to match.
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
  const picture = <LayerPicture src={layer.image} />;
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
    // The record turns inside a box that is squashed to match the view from above and in front.
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

// The picture of one layer.
//
// A plain <img> is enough to show it, but the browser then keeps a second copy of every layer, redrawn at the size
// of the screen. On a 4K screen that is about 230 MB of graphics memory for one room, and the copies are redrawn
// when the picture is zoomed. So, once the file has arrived, the picture is handed to the graphics card one time,
// at its own size (an ImageBitmap shown by a <canvas>), and the <img> steps aside. The card then only moves and
// enlarges that one sheet. Where the browser cannot do this, the <img> simply stays.
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
