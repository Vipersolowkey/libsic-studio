// Part of: Accounts: the colour of a person's little disc (their picture), from a number 0 to 359.
// Used by: AccountChip.jsx, AccountPill.jsx, ProfilePage.jsx.
export const discColor = (hue) => `hsl(${Number.isInteger(hue) ? hue : 38} 70% 62%)`;
