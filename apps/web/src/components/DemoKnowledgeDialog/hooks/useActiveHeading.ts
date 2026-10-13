import { useEffect, useRef, type RefObject } from 'react';

/**
 * 基于滚动位置的阅读位置监听 hook：监听弹窗内容的滚动事件，每次滚动重算当前章节，
 * 回调章节变化。用于目录导航的滚动高亮（scroll-spy）。
 *
 * 当前章节判定：取文档序中最后一个"标题顶部已越过阅读带下界（视口 30% 处）"的标题；
 * 滚动回顶部（无标题越过下界）时回退到第一个标题。
 *
 * 相比 IntersectionObserver 方案，scroll-spy 不依赖标题恰好停留在窄阅读带内：
 * 标题间距较大时连续滚动也能让高亮始终跟随当前阅读位置。
 *
 * 必须在容器 ref 赋值后（随弹窗内容一起挂载）调用，保证能取到标题。
 */
export const useActiveHeading = (
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  onActiveChange: (id: string) => void,
) => {
  const lastIdRef = useRef<string | null>(null);

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

    const update = () => {
      // 阅读带下界：视口 30% 高度处；标题顶部越过该线即视为进入当前阅读区。
      const bandBottom = window.innerHeight * 0.3;
      let current: string | null = null;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= bandBottom) {
          current = heading.id;
        } else {
          break; // 标题按文档序排列，后续 top 只会更大。
        }
      }

      // 无标题越过下界（滚动在顶部附近）时回退到第一个标题。
      if (current === null) {
        current = headings[0].id;
      }

      if (current !== lastIdRef.current) {
        lastIdRef.current = current;
        onActiveChange(current);
      }
    };

    let raf = 0;

    // 捕获阶段监听，可收到弹窗内容滚动容器（非视口）的 scroll 事件。
    const onScroll = () => {
      if (raf !== 0) {
        return;
      }

      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('scroll', onScroll, true);

      if (raf !== 0) {
        cancelAnimationFrame(raf);
      }
    };
  }, [containerRef, selector, onActiveChange]);
};
