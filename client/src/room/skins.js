// Part of: Room page: colours of the side bar and CD tower per room.
// Used by: Controls.jsx, Desk.jsx, RoomScreen.jsx.
// Colours of the side bar and CD tower per room (paper, wood, brass), keyed by scene slug. A skin = CSS variables put on the
// room element (RoomScreen.jsx) and read by kit.css. A new scene without a skin falls back to golden-loft.
//   paper, paper2   the side bar's paper and the darker paper of buttons on it
//   ink, soft       main and quiet writing on paper
//   accent          the colour of what is switched on; on-accent is the writing on it
//   edge, stitch    the thin edge of the paper and the dashed stitching inside it
//   w1, w2          the light and the shaded side of the wood; back is the dark back of the CD rack
//   brass, brass2, brass-ink   the little brass labels and buttons
// `light` = the two labels of the light switch ([on, off]), worded to suit the room.
export const SKINS = {
  'golden-loft': {
    vars: { '--paper': '#f3e5c8', '--paper2': '#ead6af', '--ink': '#4a2f1c', '--soft': '#7e5f3f', '--accent': '#d9733a', '--on-accent': '#fff6e6', '--edge': '#c9a56c', '--stitch': '#b98a52', '--w1': '#c28a55', '--w2': '#a8733f', '--brass': '#e0b05a', '--brass2': '#b8863a', '--brass-ink': '#3b2610', '--back': '#5e3e22' },
    light: ['Day', 'Night'],
  },
  'night-study': {
    vars: { '--paper': '#232c47', '--paper2': '#1a2238', '--ink': '#f2e6c9', '--soft': '#a9a58f', '--accent': '#f0b45a', '--on-accent': '#2a1a08', '--edge': '#3d486b', '--stitch': '#5b6a96', '--w1': '#5a4033', '--w2': '#46302a', '--brass': '#d3a257', '--brass2': '#9f742f', '--brass-ink': '#2a1a08', '--back': '#1b120f' },
    light: ['Lamp on', 'Lamp off'],
  },
  'underwater-nook': {
    vars: { '--paper': '#e2f1ec', '--paper2': '#cfe5de', '--ink': '#0f3d47', '--soft': '#4a7a82', '--accent': '#ef7d63', '--on-accent': '#fff5ef', '--edge': '#8fc3bd', '--stitch': '#6fb0a8', '--w1': '#c9b99c', '--w2': '#b3a283', '--brass': '#f0b9a4', '--brass2': '#cf8a72', '--brass-ink': '#4a1f12', '--back': '#6d6049' },
    light: ['Day', 'Night'],
  },
  'clover-meadow': {
    vars: { '--paper': '#f7f1de', '--paper2': '#ebe1c5', '--ink': '#3a2b1c', '--soft': '#6d5b43', '--accent': '#5d9451', '--on-accent': '#fbf9f0', '--edge': '#b8c49a', '--stitch': '#8fa673', '--w1': '#c89b62', '--w2': '#ad7f49', '--brass': '#e3b862', '--brass2': '#b98b39', '--brass-ink': '#38240e', '--back': '#593e22' },
    light: ['Sunny', 'Starlight'],
  },
  'aurora-observatory': {
    vars: { '--paper': '#1b2035', '--paper2': '#141829', '--ink': '#efe7d6', '--soft': '#9aa3bd', '--accent': '#4ec9b0', '--on-accent': '#09221e', '--edge': '#384366', '--stitch': '#536494', '--w1': '#633c32', '--w2': '#4b2b24', '--brass': '#dfb66c', '--brass2': '#a87f3a', '--brass-ink': '#291a07', '--back': '#1e1110' },
    light: ['Hearth', 'Aurora'],
  },
};

// Falls back to the Golden Loft skin.
export const skinOf = (slug) => SKINS[slug] || SKINS['golden-loft'];
