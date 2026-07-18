/**
 * Primary navigation, shared by the desktop nav and the mobile menu.
 *
 * Slimmed to the redesigned information architecture (see the redesign plan):
 * Explore (Market, Compare) and Operate (Portfolio, Strategy, Alerts). Routes
 * being folded away — /radar, /categories, /heatmap — or cut — /dex,
 * /derivatives — are intentionally off the nav; they still resolve by URL until
 * their migration/removal phase lands.
 */
export type NavLink = { href: string; label: string; group: "explore" | "operate" };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Market", group: "explore" },
  { href: "/compare", label: "Compare", group: "explore" },
  { href: "/portfolio", label: "Portfolio", group: "operate" },
  { href: "/sleeve", label: "Strategy", group: "operate" },
  { href: "/backtest", label: "Backtest", group: "operate" },
  { href: "/alerts", label: "Alerts", group: "operate" },
];
