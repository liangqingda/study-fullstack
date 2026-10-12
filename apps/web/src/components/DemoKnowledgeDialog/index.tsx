import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2, IconChevronDown, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Components, ExtraProps } from 'react-markdown';

import styles from './index.scss';

type DemoKnowledgeDialogProps = {
  /** 知识点讲解内容，使用 Markdown 编写。 */
  content: string;
  /** 弹窗标题中展示的 Demo 名称。 */
  demoName: string;
};

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

type KnowledgeContentProps = {
  /** 知识点 Markdown。 */
  content: string;
  /** 目录项，含每个标题的源行号，用于给正文标题渲染锚点 id。 */
  toc: TocItem[];
  /** 当前阅读到的章节变化时回调。 */
  onActiveChange: (id: string) => void;
};

/*
 * 正文与滚动高亮监听独立成组件：它随弹窗内容一起挂载，
 * 其 effect 在自身 ref 赋值后才运行，避免父组件按 opened 时序取到空 ref。
 */
const KnowledgeContent = ({
  content,
  toc,
  onActiveChange,
}: KnowledgeContentProps) => {
  const articleRef = useRef<HTMLElement | null>(null);

  /* 行号 → 目录项，正文标题渲染时按源行号取回锚点 id。 */
  const lineItems = useMemo(
    () => new Map(toc.map((item) => [item.line, item])),
    [toc],
  );

  /*
   * 标题由 React 直接渲染 id（React 拥有属性，重渲染不会被抹掉），
   * 目录点击、锚点跳转因此始终可靠。react-markdown 会把源行号放到 node 上。
   */
  const markdownComponents = useMemo<Components>(() => {
    const idFor = (node: ExtraProps['node']) => {
      const position = node?.position;

      if (position === undefined) {
        return undefined;
      }

      return lineItems.get(position.start.line)?.id;
    };

    return {
      h1: ({ node, ...rest }) => <h1 id={idFor(node)} {...rest} />,
      h2: ({ node, ...rest }) => <h2 id={idFor(node)} {...rest} />,
      h3: ({ node, ...rest }) => <h3 id={idFor(node)} {...rest} />,
      h4: ({ node, ...rest }) => <h4 id={idFor(node)} {...rest} />,
      h5: ({ node, ...rest }) => <h5 id={idFor(node)} {...rest} />,
      h6: ({ node, ...rest }) => <h6 id={idFor(node)} {...rest} />,
    };
  }, [lineItems]);

  /* 挂载后（articleRef 已赋值）用 IntersectionObserver 跟踪阅读位置。 */
  useEffect(() => {
    const article = articleRef.current;

    if (!article) {
      return;
    }

    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(headingSelector),
    );

    if (headings.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (
            !best ||
            entry.boundingClientRect.top < best.boundingClientRect.top
          ) {
            best = entry;
          }
        }

        if (best) {
          onActiveChange((best.target as HTMLElement).id);
        }
      },
      /*
       * 用视口作根：全屏弹窗铺满视口，阅读带取顶部（跳过 64px 弹窗头部）
       * 至 30% 高度之间，进入该带的章节视为当前章节。
       */
      { root: null, rootMargin: '-64px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of headings) {
      observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [content, onActiveChange]);

  return (
    <article className={styles.markdown} ref={articleRef}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  );
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

/* 递归渲染目录树：有子级的节点带展开箭头，文本点击跳转，缩进随深度递增。 */
const TocTree = ({
  activeId,
  collapsed,
  depth,
  nodes,
  onJump,
  onToggle,
}: TocTreeProps) => (
  <ul className={styles.tocList}>
    {nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isActive = activeId === node.item.id;
      const isCollapsed = collapsed.has(node.item.id);

      return (
        <li
          className={`${styles.tocItem} ${isActive ? styles.tocActive : ''}`}
          data-toc-id={node.item.id}
          key={node.item.id}
        >
          <div className={styles.tocRow} style={{ paddingLeft: depth * 14 }}>
            {hasChildren ? (
              <button
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? '展开' : '收起'} ${node.item.text}`}
                className={styles.tocToggle}
                onClick={() => onToggle(node.item.id)}
                type="button"
              >
                {isCollapsed ? (
                  <IconChevronRight size={14} />
                ) : (
                  <IconChevronDown size={14} />
                )}
              </button>
            ) : (
              <span className={styles.tocSpacer} />
            )}
            <button
              className={styles.tocLink}
              onClick={() => onJump(node.item.id)}
              type="button"
            >
              {node.item.text}
            </button>
          </div>
          {hasChildren && !isCollapsed && (
            <TocTree
              activeId={activeId}
              collapsed={collapsed}
              depth={depth + 1}
              nodes={node.children}
              onJump={onJump}
              onToggle={onToggle}
            />
          )}
        </li>
      );
    })}
  </ul>
);

const DemoKnowledgeDialog = ({
  content,
  demoName,
}: DemoKnowledgeDialogProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  const toc = useMemo(() => parseHeadings(content), [content]);
  const tocTree = useMemo(() => buildTree(toc), [toc]);
  const currentActive = activeId ?? (toc.length > 0 ? toc[0].id : null);

  /*
   * 章节变化（点击跳转或滚动高亮）时，记录当前章并自动展开其祖先链，
   * 保证高亮项在折叠的子树里也能露出，行为与飞书/Notion 一致。
   */
  const handleActiveChange = useCallback(
    (id: string) => {
      setActiveId(id);

      const ancestors = collectAncestors(tocTree, id) ?? [];

      if (ancestors.length === 0) {
        return;
      }

      setCollapsed((prev) => {
        const next = new Set(prev);
        let changed = false;

        for (const ancestorId of ancestors) {
          if (next.delete(ancestorId)) {
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    },
    [tocTree],
  );

  /* 阅读位置变化时，让目录随动，保证高亮项始终在左侧可视范围内。 */
  useEffect(() => {
    const sidebar = sidebarRef.current;

    if (!sidebar || !currentActive) {
      return;
    }

    const item = sidebar.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(currentActive)}"]`,
    );

    if (!item) {
      return;
    }

    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;

    if (top < sidebar.scrollTop) {
      sidebar.scrollTop = Math.max(0, top - 8);
    } else if (bottom > sidebar.scrollTop + sidebar.clientHeight) {
      sidebar.scrollTop = bottom - sidebar.clientHeight + 8;
    }
  }, [currentActive]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      handleActiveChange(id);
    }
  };

  return (
    <>
      <Button
        leftSection={<IconBook2 size={16} />}
        onClick={open}
        size="sm"
        variant="default"
      >
        知识点讲解
      </Button>
      <Modal
        classNames={{
          body: styles.modalBody,
          content: styles.modalContent,
          header: styles.modalHeader,
        }}
        fullScreen
        onClose={close}
        opened={opened}
        title={
          <div className={styles.modalTitle}>
            <strong>{demoName} · 知识点讲解</strong>
            <Text c="dimmed" size="sm">
              Markdown
            </Text>
          </div>
        }
      >
        <div className={styles.knowledgeLayout}>
          <aside
            className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
          >
            <button
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? '展开目录' : '收起目录'}
              className={styles.sidebarHandle}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              type="button"
            >
              {sidebarCollapsed ? (
                <IconChevronsRight size={16} />
              ) : (
                <IconChevronsLeft size={16} />
              )}
            </button>
            <nav aria-label="知识点目录" className={styles.sidebarBody} ref={sidebarRef}>
              {toc.length === 0 ? (
                <Text c="dimmed" size="sm">
                  本节暂无标题目录。
                </Text>
              ) : (
                <TocTree
                  activeId={currentActive}
                  collapsed={collapsed}
                  depth={0}
                  nodes={tocTree}
                  onJump={scrollToSection}
                  onToggle={(id) =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);

                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }

                      return next;
                    })
                  }
                />
              )}
            </nav>
          </aside>
          <div className={styles.content}>
            <KnowledgeContent
              content={content}
              onActiveChange={handleActiveChange}
              toc={toc}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DemoKnowledgeDialog;
