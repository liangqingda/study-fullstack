import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2 } from '@tabler/icons-react';

import type { DemoKnowledgeDialogProps } from './types';

import KnowledgeContent from './KnowledgeContent';
import TocTree from './TocTree';
import { buildTree, collectAncestors, parseHeadings } from './utils';

import styles from './index.scss';

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
