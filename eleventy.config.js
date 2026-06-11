import CleanCSS from "clean-css";
import { minify } from "html-minifier-terser";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

// Optional base path for sub-directory deploys (e.g. a /proposal review copy on the
// live site). Empty for the real root build. Set with BASE_PATH=/proposal.
const BASE_PATH = process.env.BASE_PATH || "";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addGlobalData("basePath", BASE_PATH);

  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts", "src/images": "images", "src/static": "/" });
  eleventyConfig.addFilter("cssmin", (code) => {
    let out = new CleanCSS({}).minify(code).styles;
    // HtmlBasePlugin rewrites HTML attributes but not url() inside inlined <style>.
    if (BASE_PATH) out = out.replace(/url\((['"]?)\//g, `url($1${BASE_PATH}/`);
    return out;
  });
  eleventyConfig.addFilter("chars", (s) => Array.from(String(s)));
  eleventyConfig.addFilter("confirmed", (arr) => (arr || []).filter((x) => x.confirmed));
  eleventyConfig.addFilter("ucfirst", (s) => { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); });
  eleventyConfig.addTransform("htmlmin", async function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      return minify(content, { collapseWhitespace: true, removeComments: true, minifyJS: true });
    }
    return content;
  });
  return {
    pathPrefix: BASE_PATH || "/",
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
