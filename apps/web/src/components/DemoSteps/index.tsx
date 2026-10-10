import styles from './index.scss';

type DemoStepsProps = {
  /** 步骤文本，按顺序渲染为有序列表。 */
  steps: readonly string[];
};

/**
 * 带强调标记的有序步骤列表，用于展示“这次请求会怎样走”等执行顺序。
 */
const DemoSteps = ({ steps }: DemoStepsProps) => (
  <ol className={styles.steps}>
    {steps.map((step) => (
      <li key={step}>{step}</li>
    ))}
  </ol>
);

export default DemoSteps;
