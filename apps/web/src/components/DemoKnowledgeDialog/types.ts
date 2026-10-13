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

type DemoKnowledgeDialogProps = {
  /** 知识点讲解内容，使用 Markdown 编写。 */
  content: string;
  /** 弹窗标题中展示的 Demo 名称。 */
  demoName: string;
};

type KnowledgeContentProps = {
  /** 知识点 Markdown。 */
  content: string;
  /** 目录项，含每个标题的源行号，用于给正文标题渲染锚点 id。 */
  toc: TocItem[];
  /** 当前阅读到的章节变化时回调。 */
  onActiveChange: (id: string) => void;
};

type TocTreeProps = {
  /** 当前高亮的章节 id。 */
  activeId: string | null;
  /** 收起的章节 id 集合。 */
  collapsed: Set<string>;
  /** 当前渲染到的树深度（从 0 起），用于缩进。 */
  depth: number;
  /** 目录树节点。 */
  nodes: TocNode[];
  /** 点击章节文本跳转。 */
  onJump: (id: string) => void;
  /** 点击箭头展开/收起。 */
  onToggle: (id: string) => void;
};

export type {
  DemoKnowledgeDialogProps,
  KnowledgeContentProps,
  TocItem,
  TocNode,
  TocTreeProps,
};
