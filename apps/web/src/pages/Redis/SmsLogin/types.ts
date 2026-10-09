/** Redis 中一次写操作的记录，用于在页面上实时展示。 */
export type RedisOp = { id: number; op: string; key: string; note: string };

/** 单个客户端面板组件的 props。 */
export type ClientPanelProps = {
  label: string;
  accent: string;
  onLoginStateChange: () => void;
};
