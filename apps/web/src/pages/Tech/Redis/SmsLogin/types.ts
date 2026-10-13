/**
 * Redis 中一次写操作的记录，用于在页面上实时展示。
 */
export type RedisOp = {
  /** 自增序号。 */
  id: number;
  /** 操作类型，如 SET、DEL、EXPIRE。 */
  op: string;
  /** Redis key。 */
  key: string;
  /** 操作说明。 */
  note: string;
};

/**
 * 单个客户端面板组件的 props。
 */
export type ClientPanelProps = {
  /** 客户端标识，如 A、B。 */
  label: string;
  /** 主题色。 */
  accent: string;
  /** 登录状态变化时的回调。 */
  onLoginStateChange: () => void;
};
