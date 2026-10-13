import { useEffect, type RefObject } from 'react';

/**
 * 监听正文容器内标题进入"阅读带"的情况，标题变化时回调。
 * 阅读带 = 视口顶部（跳过 64px 弹窗头部）至 30% 高度之间，进入该带的标题视为当前章节。
 * 必须在容器 ref 赋值后（随弹窗内容一起挂载）调用，保证 observer 能取到标题。
 */
export const useActiveHeading = (
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  onActiveChange: (id: string) => void,
) => {
  useEffect(() => {
    const article = containerRef.current;

    if (!article) {
      return;
    }

    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(selector),
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
      { root: null, rootMargin: '-64px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of headings) {
      observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [containerRef, selector, onActiveChange]);
};
