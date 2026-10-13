import { useCallback, useEffect, useRef, useState } from 'react';

export type CountdownOptions = {
  /**
   * 持久化 key：提供时 hook 初始化会从 localStorage 恢复剩余秒数，
   * start 写入结束时间，倒计时归零或主动 reset 时清除；用于刷新后恢复倒计时。
   */
  persistKey?: string;
  /** 倒计时自然归零时回调（start 或刷新恢复的倒计时结束都会触发）。主动 reset 不触发。 */
  onFinish?: () => void;
};

export type CountdownResult = {
  /** 剩余秒数，归零后保持 0。 */
  remaining: number;
  /** 以 seconds 秒开始一段倒计时，会覆盖进行中的倒计时。 */
  start: (seconds: number) => void;
  /** 主动停止并清零，不触发 onFinish、不清理持久化的结束时间。 */
  reset: () => void;
};

/**
 * 每秒递减的倒计时 hook，统一多个页面反复出现的倒计时骨架：
 * - start(seconds) 启动一段倒计时（覆盖旧倒计时），每秒递减直到 0；
 * - persistKey 提供时自动持久化到 localStorage，刷新后恢复剩余时间；
 * - 归零时清掉定时器并触发 onFinish（若提供）；组件卸载自动清理定时器。
 *
 * 用法：
 * ```ts
 * const { remaining, start, reset } = useCountdown({
 *   persistKey: 'sms-login:cooldown-end:demo',
 *   onFinish: () => doSomething(),
 * });
 *
 * start(60);
 * ```
 */
export const useCountdown = ({
  persistKey,
  onFinish,
}: CountdownOptions = {}): CountdownResult => {
  const [remaining, setRemaining] = useState(0);
  const endAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);

  // 每次渲染后刷新回调引用，避免定时器闭包读到过期的 onFinish。
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  /** 停止并清空定时器引用。 */
  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** 每秒递减一步；到 0 时停表、清持久化并触发 onFinish。 */
  const tick = useCallback(() => {
    const next = Math.max(
      0,
      Math.round((endAtRef.current - Date.now()) / 1000),
    );

    setRemaining(next);

    if (next > 0) {
      return;
    }

    clear();

    if (persistKey) {
      try {
        localStorage.removeItem(persistKey);
      } catch {
        // 忽略存储失败。
      }
    }

    onFinishRef.current?.();
  }, [persistKey, clear]);

  /** 以 seconds 秒开始一段倒计时（覆盖进行中的倒计时）。 */
  const start = useCallback(
    (seconds: number) => {
      endAtRef.current = Date.now() + seconds * 1000;

      if (persistKey) {
        try {
          localStorage.setItem(persistKey, String(endAtRef.current));
        } catch {
          // 忽略存储失败，倒计时退化为纯内存态。
        }
      }

      setRemaining(seconds);
      clear();
      timerRef.current = window.setInterval(tick, 1000);
    },
    [persistKey, clear, tick],
  );

  /** 主动停止并清零（不清持久化、不触发 onFinish）。 */
  const reset = useCallback(() => {
    clear();
    setRemaining(0);
  }, [clear]);

  // 刷新后恢复持久化的倒计时（persistKey 提供时）。
  useEffect(() => {
    if (!persistKey) {
      return undefined;
    }

    let saved = 0;

    try {
      saved = Number(localStorage.getItem(persistKey) ?? '0');
    } catch {
      // 忽略读取失败。
    }

    if (saved <= Date.now()) {
      return undefined;
    }

    endAtRef.current = saved;
    timerRef.current = window.setInterval(tick, 1000);

    return clear;
  }, [persistKey, tick, clear]);

  // 组件卸载时清理定时器。
  useEffect(() => clear, [clear]);

  return { remaining, start, reset };
};
