import type { Layout } from "./types.js";

/**
 * The layouts every template offers, in this order (templates spec, "Layouts"; the recipes in
 * docs/layouts.md). Starting texts tell the owner what to write; the hero and the calls to action
 * are filled from the site's own details.
 */
export const SHARED_LAYOUTS: readonly Layout[] = [
  {
    id: "home",
    name: { cs: "Úvod", en: "Home" },
    description: {
      cs: "Úvodní fotka s názvem, pár slov o vás, služby, reference a výzva ozvat se.",
      en: "An opening photo with your name, a few words about you, services, reviews and a call to get in touch.",
    },
    blocks: [
      { type: "hero", heading: { from: "site-name" }, text: { from: "site-description" } },
      {
        type: "rich_text",
        body: {
          cs: "## O nás\n\nNapište pár vět o tom, kdo jste a co pro zákazníky děláte.",
          en: "## About us\n\nWrite a few sentences about who you are and what you do for your customers.",
        },
      },
      { type: "services", heading: { cs: "Co nabízíme", en: "What we offer" } },
      { type: "testimonials", heading: { cs: "Co říkají zákazníci", en: "What customers say" } },
      {
        type: "call_to_action",
        heading: { cs: "Ozvěte se nám", en: "Get in touch" },
        text: { cs: "Rádi vám poradíme.", en: "We're happy to help." },
        buttons: "contact",
      },
    ],
  },
  {
    id: "services",
    name: { cs: "Služby", en: "Services" },
    description: {
      cs: "Úvodní slovo, všechny vaše služby a výzva ozvat se.",
      en: "A short introduction, all your services and a call to get in touch.",
    },
    blocks: [
      {
        type: "rich_text",
        body: {
          cs: "Představte, s čím zákazníkům pomáháte a pro koho jsou vaše služby.",
          en: "Say what you help your customers with and who your services are for.",
        },
      },
      { type: "services" },
      {
        type: "call_to_action",
        heading: { cs: "Nevíte si rady?", en: "Not sure what you need?" },
        text: {
          cs: "Napište nám a společně najdeme řešení.",
          en: "Write to us and we'll find it together.",
        },
        buttons: "contact",
      },
    ],
  },
  {
    id: "about",
    name: { cs: "O nás", en: "About us" },
    description: {
      cs: "Váš příběh, celý tým a výzva ozvat se.",
      en: "Your story, the whole team and a call to get in touch.",
    },
    blocks: [
      {
        type: "rich_text",
        body: {
          cs: "## Náš příběh\n\nJak jste začali, co vás žene a v čem jste jiní.",
          en: "## Our story\n\nHow you started, what drives you and what sets you apart.",
        },
      },
      { type: "team", heading: { cs: "Kdo jsme", en: "Who we are" } },
      {
        type: "call_to_action",
        heading: { cs: "Ozvěte se nám", en: "Get in touch" },
        buttons: "contact",
      },
    ],
  },
  {
    id: "team",
    name: { cs: "Tým", en: "Team" },
    description: {
      cs: "Krátké představení a všichni lidé z vašeho týmu.",
      en: "A short introduction and everyone on your team.",
    },
    blocks: [
      {
        type: "rich_text",
        body: {
          cs: "Představte svůj tým: kdo se o zákazníky stará a na koho se mohou obrátit.",
          en: "Introduce your team: who looks after your customers and whom they can turn to.",
        },
      },
      { type: "team" },
    ],
  },
  {
    id: "contact",
    name: { cs: "Kontakt", en: "Contact" },
    description: {
      cs: "Adresa, telefon a e-mail, otevírací doba a jak se k vám dostat.",
      en: "Address, phone and email, opening hours and how to find you.",
    },
    blocks: [
      { type: "contact" },
      { type: "opening_hours", heading: { cs: "Otevírací doba", en: "Opening hours" } },
      {
        type: "rich_text",
        body: {
          cs: "## Jak k nám\n\nPopište, kudy se k vám dostat a kde zaparkovat, nebo na koho se obrátit s čím.",
          en: "## Finding us\n\nDescribe how to get to you and where to park, or whom to ask about what.",
        },
      },
    ],
  },
  {
    id: "faq",
    name: { cs: "Časté otázky", en: "FAQ" },
    description: {
      cs: "Všechny vaše otázky a odpovědi a kam se obrátit s dalšími.",
      en: "All your questions and answers, and where to ask more.",
    },
    blocks: [
      { type: "faq" },
      {
        type: "rich_text",
        body: {
          cs: "Nenašli jste odpověď? Napište nám a rádi poradíme.",
          en: "Didn't find your answer? Write to us and we'll help.",
        },
      },
    ],
  },
  {
    id: "careers",
    name: { cs: "Kariéra", en: "Careers" },
    description: {
      cs: "Koho hledáte, volná místa a výzva poslat životopis.",
      en: "Whom you're looking for, open positions and a call to send a CV.",
    },
    blocks: [
      {
        type: "rich_text",
        body: {
          cs: "## Pracujte s námi\n\nKoho hledáte, co nabízíte a jak se ozvat.",
          en: "## Work with us\n\nWhom you're looking for, what you offer and how to apply.",
        },
      },
      {
        type: "jobs",
        heading: { cs: "Volná místa", en: "Open positions" },
        note: {
          cs: "Teď nikoho nehledáme, ale životopis nám můžete poslat kdykoli.",
          en: "We have no openings right now, but you're welcome to send us your CV.",
        },
      },
      {
        type: "call_to_action",
        heading: { cs: "Pošlete nám životopis", en: "Send us your CV" },
        buttons: "contact",
      },
    ],
  },
];
