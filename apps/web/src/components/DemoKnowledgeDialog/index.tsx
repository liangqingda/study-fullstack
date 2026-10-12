import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Components, ExtraProps } from 'react-markdown';

import { buildTree, collectAncestors, headingSelector, parseHeadings, type TocItem, type TocNode } from './utils';

import styles from './index.scss';

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

  /* 切换某个目录节点的展开/收起。 */
  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
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
          <aside className={styles.sidebar}>
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
                  onToggle={toggleCollapsed}
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
