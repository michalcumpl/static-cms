import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    // Turborepo caches `dist/**` for every package's build.
    adapter: adapter({ out: "dist" }),
    // The websites' contact forms post to the admin from their own origins. SvelteKit can only
    // trust origins for the whole app, so the same check runs in `hooks.server.ts`
    // (`isForeignFormPost`), with only `/forms/` open to other origins (contact-form design
    // decision 6).
    csrf: { trustedOrigins: ["*"] },
  },
};
