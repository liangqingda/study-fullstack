import { Badge, Text, Title } from '@mantine/core';

import styles from '../index.scss';

const RedisExplainer = () => (
  <section className={styles.explainer}>
    <Title order={3} size="h5">本案例用到的 Redis 原语</Title>
    <div className={styles.primitiveGrid}>
      <div><Badge color="teal" variant="light">SET … EX</Badge><p>验证码与会话都带有效期写入，过期自动清理。</p></div>
      <div><Badge color="teal" variant="light">SET … NX</Badge><p>仅当键不存在才写入，用于 60s 内限频，防止刷验证码。</p></div>
      <div><Badge color="teal" variant="light">GET / DEL</Badge><p>校验验证码后立即删除，保证一次性；登出删除会话。</p></div>
      <div><Badge color="teal" variant="light">EXPIRE</Badge><p>每次访问会话都续期，实现滑动过期，活跃用户不掉线。</p></div>
      <div><Badge color="teal" variant="light">SCAN</Badge><p>遍历 session:* 展示所有在线会话——证明它们是集中式共享状态。</p></div>
    </div>
    <Text c="dimmed" size="sm">
      为什么&ldquo;共享 session&rdquo;用 Redis？因为会话存在 Redis 这一份集中数据里，多个后端实例指向同一个 Redis 都能校验同一 token，
      而不是各自进程内的内存 Session。页面右侧的视图就是这份共享状态，任何登录终端都能看到全部在线会话。
    </Text>
  </section>
);

export default RedisExplainer;
