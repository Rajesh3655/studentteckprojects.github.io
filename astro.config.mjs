import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://studenttechprojects.com",
  output: "static",
  integrations: [sitemap()],
  trailingSlash: "always"
});
