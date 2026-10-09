export type RedisOp = { id: number; op: string; key: string; note: string };

export type ClientPanelProps = {
  label: string;
  accent: string;
  onLoginStateChange: () => void;
};
