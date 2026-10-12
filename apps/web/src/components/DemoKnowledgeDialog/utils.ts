type TocItem = {
  /** 章节锚点 id，由 React 直接渲染到正文标题上，保证点击跳转可靠。 */
  id: string;
  /** 章节标题文本。 */
  text: string;
  /** 标题层级（1-4，对应 h1-h4）。 */
  level: number;
  /** 标题在 Markdown 源文本中的行号（1 起），用于和正文标题一一对齐。 */
  line: number;
};

type TocNode = {
  /** 当前章节。 */
  item: TocItem;
  /** 其下的子章节。 */
  children: TocNode[];
};

/** 参与目录导航的标题层级。 */
const headingSelector = 'h1, h2, h3, h4';

/**
 * 由标题文本生成稳定锚点：保留中英文与数字，其余字符转为连字符；
 * 为空时回退为固定前缀，供后续去重。
 */
const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

/**
 * 从 Markdown 源文本解析出目录项，并记录每个标题的源行号，
 * 供渲染正文标题时按行号对齐锚点 id。
 * 跳过围栏代码块，只取 h1-h4；标题内联语法（行内代码、链接、强调）先剥掉再取文本。
 */
const parseHeadings = (markdown: string): TocItem[] => {
  const used = new Map<string, number>();
  let inFence = false;

  const items = markdown.split('\n').flatMap((line, index) => {
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;

      return [];
    }

    if (inFence) {
      return [];
    }

    const match = /^(#{1,6})\s+(.+?)(\s+#+)?$/.exec(trimmed);

    if (!match) {
      return [];
    }

    const level = match[1].length;

    if (level > 4) {
      return [];
    }

    const text = match[2]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(\*|_)(.+?)\1/g, '$2')
      .trim();

    if (!text) {
      return [];
    }

    const base = slugify(text);
    const count = used.get(base) ?? 0;
    const id = count === 0 ? base : `${base}-${count + 1}`;

    used.set(base, count + 1);

    return [{ id, text, level, line: index + 1 }];
  });

  return items;
};

/**
 * 把扁平的标题列表按层级构建成目录树。逐级下钻：当遇到更浅或同级的标题时
 * 回溯到正确祖先，跳级标题（如 h2 后直接 h4）就近挂到最近的祖先下。
 */
const buildTree = (items: TocItem[]): TocNode[] => {
  const root: TocNode = { item: { id: '', text: '', level: 1, line: 0 }, children: [] };
  let stack: TocNode[] = [root];

  for (const item of items) {
    while (
      stack.length > 1 &&
      item.level <= stack[stack.length - 1].item.level
    ) {
      stack = stack.slice(0, -1);
    }

    const node: TocNode = { item, children: [] };
    const parent = stack[stack.length - 1];

    parent.children = [...parent.children, node];
    stack = [...stack, node];
  }

  return root.children;
};

/**
 * 返回目标章节在目录树中的祖先 id（自根到其父级，不含自身）；
 * 目标不存在时返回 null。用于滚动到某章时自动展开其祖先链。
 */
const collectAncestors = (
  nodes: TocNode[],
  targetId: string,
): string[] | null => {
  for (const node of nodes) {
    if (node.item.id === targetId) {
      return [];
    }

    const found = collectAncestors(node.children, targetId);

    if (found !== null) {
      return [node.item.id, ...found];
    }
  }

  return null;
};

export { buildTree, collectAncestors, headingSelector, parseHeadings };

export type { TocItem, TocNode };
