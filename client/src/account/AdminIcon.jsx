// Part of: Admin page: the small line drawings (24 x 24) used for the menu, the totals and the buttons.
// Used by: AdminPage.jsx, AdminMusic.jsx, ProfilePage.jsx.
// The small drawings (24 x 24, drawn with a thin line). Each one stands for the part it sits on.
const ICONS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" /></>,
  room: <><path d="M3 11l9-8 9 8" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  spark: <path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z" />,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.4" /><path d="M12 3a9 9 0 0 1 9 9" /></>,
  discPlus: <><circle cx="11" cy="13" r="8" /><circle cx="11" cy="13" r="2" /><path d="M19 2v6M16 5h6" /></>,
  discTick: <><circle cx="12" cy="12" r="9" /><path d="M8 12.4l2.7 2.7L16 9.6" /></>,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5L16 16" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  bars: <><path d="M5 20V10M12 20V4M19 20v-7" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
  scenes: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 15l5-4 4 3 3-2 6 5" /><circle cx="16.5" cy="8.5" r="1.4" /></>,
  keep: <path d="M5 12l4.5 4.5L19 7" />,
  note: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  out: <><path d="M9 4H5v16h4" /><path d="M16 8l4 4-4 4M20 12H9" /></>,
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />,
};
export function Ico({ n }) {
  return (
    <svg className="adm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[n]}
    </svg>
  );
}
