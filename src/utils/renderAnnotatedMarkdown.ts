import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import remarkCollapse from "remark-collapse";
import remarkToc from "remark-toc";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./transformers/fileName";
import { removeTrailingIndex } from "./remark/removeTrailingIndex";
import { rehypeAnnotations } from "./rehype/annotations";

export const renderAnnotatedMarkdown = async (
  body: string,
  entryId: string
) => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [
      removeTrailingIndex,
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
    ],
    rehypePlugins: [[rehypeAnnotations, { entryId }]],
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  });

  return processor.render(body);
};
