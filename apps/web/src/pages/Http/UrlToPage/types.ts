import type { UrlToPageLoadResponse } from '@liangqingda/study-nodejs-schema';

/** 网络链路阶段的 key，与契约中的枚举保持一致。 */
export type PhaseKey = 'url' | 'dns' | 'tcp' | 'tls' | 'request' | 'wait' | 'body';

/** 阶段在页面上的呈现状态。 */
export type PhaseStatus = 'idle' | 'done' | 'error';

/** 网络链路的静态阶段定义（含功能色槽位）。 */
export type NetworkPhase = {
  /** 阶段标识。 */
  key: PhaseKey;
  /** 阶段名称。 */
  label: string;
  /** 机制说明。 */
  note: string;
  /** 功能色槽位，与 scss 中的 hue 类对应。 */
  hue: PhaseKey;
};

/** 浏览器渲染阶段的静态定义。 */
export type RenderPhase = {
  /** 渲染子步骤名称。 */
  label: string;
  /** 该子步骤的说明。 */
  detail: string;
};

/** 服务端返回摘要（来自契约）。 */
export type ServerResult = UrlToPageLoadResponse['result'];

/** 一个已揭示状态的网络阶段。 */
export type RevealedPhase = NetworkPhase & {
  /** 呈现状态。 */
  status: PhaseStatus;
  /** 实测耗时；未测到（如 http 下的 TLS）时为 null。 */
  durationMs: number | null;
};

/** 预设 URL 快捷项。 */
export type PresetUrl = {
  /** 按钮文案。 */
  label: string;
  /** 目标 URL。 */
  url: string;
  /** 说明这次加载要观察什么。 */
  hint: string;
};
