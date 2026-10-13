import { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Components, ExtraProps } from 'react-markdown';
import type { KnowledgeContentProps } from '../types';

import { HEADING_SELECTOR } from '../constants';
import { useActiveHeading } from '../hooks/useActiveHeading';

import styles from './index.scss';

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

  useActiveHeading(articleRef, HEADING_SELECTOR, onActiveChange);

  return (
    <article className={styles.markdown} ref={articleRef}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  );
};

export default KnowledgeContent;
