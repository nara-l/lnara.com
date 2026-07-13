const getText = (node: any): string => {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map(getText).join("");
};

export function removeTrailingIndex() {
  return (tree: any) => {
    if (!Array.isArray(tree?.children)) return;

    const lastHeadingIndex = tree.children.findLastIndex(
      (node: any) => node.type === "heading" && node.depth === 2
    );

    if (lastHeadingIndex === -1) return;

    const heading = tree.children[lastHeadingIndex];
    if (getText(heading).trim().toLowerCase() !== "index") return;

    tree.children.splice(lastHeadingIndex);
  };
}
