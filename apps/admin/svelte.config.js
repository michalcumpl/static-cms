import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    // Turborepo caches `dist/**` for every package's build.
    adapter: adapter({ out: "dist" }),
  },
};
