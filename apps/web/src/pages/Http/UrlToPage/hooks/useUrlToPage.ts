import { useCallback, useState } from 'react';

import type { UrlToPageLoadResponse } from '@liangqingda/study-nodejs-schema';
import type { PhaseKey } from '../types';

import { postApiUrlToPageLoad } from '@/apis/http/url-to-page';
import { isApiError } from '@/utils/http';
import { useDemoRequest } from '@/hooks/useDemoRequest';

/** 一次加载失败的结构化信息：错误文案 + 失败前已完成的链路阶段。 */
export type LoadFailure = {
  /** 可直接展示给用户的错误文案。 */
  message: string;
  /** 失败前已完成的链路阶段（含实测耗时），便于定位卡在哪一步。 */
  reached: { key: PhaseKey; durationMs: number }[];
};

/**
 * 封装"从 URL 到页面"的真实加载请求。
 *
 * 底层复用公共 hook useDemoRequest：AbortController、竞态守卫、卸载中止、
 * loading / result 三态由公共 hook 提供；本 hook 额外把失败解析为带
 * `reached`（已完成阶段）的结构化信息，供页面定位失败阶段。
 */
export const useUrlToPage = () => {
  const { result, loading, reset, run } =
    useDemoRequest<UrlToPageLoadResponse>();
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  /** 发起一次真实链路加载，自动取消上一个未完成的请求。 */
  const runLoad = useCallback(
    (url: string) => {
      setFailure(null);

      void run(async (signal) => {
        try {
          const response = await postApiUrlToPageLoad({
            body: { url },
            signal,
          });

          return response.data;
        } catch (cause) {
          if (signal.aborted) {
            throw cause;
          }

          if (isApiError(cause)) {
            const payload = cause.data as
              | { reached?: { key: PhaseKey; durationMs: number }[] }
              | undefined;
            const reached = (payload?.reached ?? []).map(({ key, durationMs }) => ({
              key,
              durationMs,
            }));

            setFailure({ message: cause.message, reached });
          } else {
            setFailure({ message: '请求失败，请确认后端已在 localhost:3001 启动', reached: [] });
          }

          throw cause;
        }
      });
    },
    [run],
  );

  return { result, loading, reset, run: runLoad, failure };
};
