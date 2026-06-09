import CleanCSS from "clean-css";
import { minify } from "html-minifier-terser";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts", "src/images": "images", "src/static": "/" });
  eleventyConfig.addFilter("cssmin", (code) => new CleanCSS({}).minify(code).styles);
  eleventyConfig.addFilter("chars", (s) => Array.from(String(s)));
  eleventyConfig.addFilter("confirmed", (arr) => (arr || []).filter((x) => x.confirmed));
  eleventyConfig.addTransform("htmlmin", async function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      return minify(content, { collapseWhitespace: true, removeComments: true, minifyJS: true });
    }
    return content;
  });
  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
