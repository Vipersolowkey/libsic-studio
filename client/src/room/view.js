// How close the room is shown. Zoom 1 shows the whole picture; bigger numbers move in.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.4;
export const ZOOM_STEP = 1.15; // each press of + or - changes the size by 15%

// The widest the whole 16:9 picture can be on this window.
export function fitWidth(width, height) {
  return Math.min(width, (height * 16) / 9);
}

// The zoom at which the picture just covers the window, with no empty bars (1 when the window is 16:9).
export function fillZoom(width, height) {
  return Math.max(width, (height * 16) / 9) / fitWidth(width, height);
}

// Where the room starts: halfway between "whole picture" and "covers the window".
export function startZoom(width, height) {
  return 1 + (fillZoom(width, height) - 1) / 2;
}

export function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// How far to shift the picture so that the mouse looks around it. `pointer` is the mouse position from 0 to 1
// across the window. The picture only moves as far as it sticks out past the window edge, in each direction.
export function panOffset(pointer, zoom, width, height) {
  const stageWidth = fitWidth(width, height) * zoom;
  const stageHeight = (stageWidth * 9) / 16;
  return {
    x: (0.5 - pointer.x) * Math.max(0, stageWidth - width) + 0, // + 0 turns -0 into 0
    y: (0.5 - pointer.y) * Math.max(0, stageHeight - height) + 0,
  };
}
