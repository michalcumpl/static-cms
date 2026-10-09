import { SHARED_LAYOUTS } from "./layouts.js";
import type { Template } from "./types.js";

/**
 * The template every site used before templates existed (templates spec, "The Standard
 * template"). Its tokens are the values the shared styles had written out, so release 1 renders
 * exactly as before; it adds no styles, takes each block's first look and offers the shared
 * layouts only.
 */
export const STANDARD: Template = {
  id: "standard",
  release: 1,
  name: { cs: "Standard", en: "Standard" },
  description: {
    cs: "Klidný a přehledný vzhled, který sedne každému oboru.",
    en: "A calm, clear look that suits any trade.",
  },
  trades: [
    { cs: "služby", en: "services" },
    { cs: "obchod", en: "shops" },
    { cs: "řemeslo", en: "crafts" },
  ],
  tokens: {
    "text-small": "0.9rem",
    "text-body": "1.125rem",
    "text-h3": "1.3rem",
    "text-h2": "1.75rem",
    "text-hero": "clamp(1.75rem, 5vw, 3.5rem)",
    "text-title": "clamp(2rem, 5cqi, 3rem)",
    "leading-body": "1.6",
    "leading-heading": "1.2",
    "space-1": "0.25rem",
    "space-2": "0.75rem",
    "space-3": "1rem",
    "space-4": "1.5rem",
    "space-5": "2rem",
    "block-padding": "2rem",
    "block-padding-wide": "3rem",
  },
  css: "",
  looks: { hero: "beside", services: "cards", team: "cards", gallery: "fill", cards: "below" },
  layouts: SHARED_LAYOUTS,
  upgrades: {},
};
