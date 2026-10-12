import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2, IconListTree } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { CSSProperties } from 'react';

import styles from './index.scss';

type DemoKnowledgeDialogProps = {
  /** 知识点讲解内容，使用 Markdown 编写。 */
  content: string;
  /** 弹窗标题中展示的 Demo 名称。 */
  demoName: string;
};

type TocItem = {
  /** 章节锚点 id，对应正文标题的 DOM id。 */
  id: string;
  /** 章节标题文本。 */
  text: string;
  /** 标题层级（1-4，对应 h1-h4）。 */
  level: number;
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
 * 从 Markdown 源文本解析出目录项，顺序与正文渲染保持一致。
 * 跳过围栏代码块，只取 h1-h4；标题内联语法（行内代码、链接、强调）先剥掉再取文本。
 */
const parseHeadings = (markdown: string): TocItem[] => {
  const used = new Map<string, number>();
  let inFence = false;

  const items = markdown.split('\n').flatMap((line) => {
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

    return [{ id, text, level }];
  });

  return items;
};

const DemoKnowledgeDialog = ({
  content,
  demoName,
}: DemoKnowledgeDialogProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  const toc = useMemo(() => parseHeadings(content), [content]);
  const currentActive = activeId ?? (toc.length > 0 ? toc[0].id : null);

  /*
   * 弹窗打开后，给正文标题补上目录锚点 id（slug 规则与目录解析一致），
   * 并用 IntersectionObserver 跟踪当前阅读到的章节，高亮对应目录项。
   */
  useEffect(() => {
    if (!opened) {
      return;
    }

    const article = contentRef.current;

    if (!article) {
      return;
    }

    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(headingSelector),
    );
    const used = new Map<string, number>();

    for (const heading of headings) {
      const base = slugify(heading.textContent);
      const count = used.get(base) ?? 0;
      const id = count === 0 ? base : `${base}-${count + 1}`;

      used.set(base, count + 1);
      heading.id = id;
    }

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
          setActiveId((best.target as HTMLElement).id);
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
  }, [content, opened]);

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
    const target = contentRef.current?.querySelector(`#${CSS.escape(id)}`);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
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
          <nav aria-label="知识点目录" className={styles.sidebar} ref={sidebarRef}>
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarTitle}>
                <IconListTree size={16} />
                <Text fw={700} size="sm">
                  目录
                </Text>
              </div>
              {toc.length === 0 ? (
                <Text c="dimmed" size="sm">
                  本节暂无标题目录。
                </Text>
              ) : (
                <ul className={styles.tocList}>
                  {toc.map((item) => (
                    <li
                      className={`${styles.tocItem} ${currentActive === item.id ? styles.tocActive : ''}`}
                      data-toc-id={item.id}
                      key={item.id}
                      style={{ '--toc-depth': item.level - 1 } as CSSProperties}
                    >
                      <button onClick={() => scrollToSection(item.id)} type="button">
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </nav>
          <div className={styles.content}>
            <article className={styles.markdown} ref={contentRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DemoKnowledgeDialog;
