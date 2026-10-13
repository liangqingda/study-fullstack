import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import type { TocTreeProps } from '../types';

import styles from './index.scss';

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

export default TocTree;
