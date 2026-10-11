import { execSync } from 'node:child_process';

/**
 * 一键清理 study-fullstack 的开发服务进程树。
 *
 * 为什么需要它：dev 服务可以由 scripts/dev.mjs（pnpm dev）统一拉起，也可以被
 * 单独以 `pnpm --filter study-nodejs start:dev` / `pnpm --filter study-react dev`
 * 启动。单独启动的 pnpm/tsx/vite 没有父进程管理，停掉终端后会被 reparent 成
 * 孤儿进程继续后台运行。本脚本按项目特征匹配这些进程及其子进程树，SIGTERM 后
 * 兜底 SIGKILL，无论用哪种方式启动都能停干净。
 *
 * 用法：`pnpm dev:stop` 或 `node scripts/stop-dev.mjs`
 */

/** 本项目根目录标识，用于区分本项目进程与其它项目。 */
const ROOT_MARK = 'study-fullstack';

/** 这些进程不属于 dev 服务，跳过，避免误杀。 */
const EXCLUDED = /stop-dev\.mjs|dev\.mjs|eslint|prettier|husky|--exec|git\s/i;

/** 是否为本项目 dev 服务进程（根 pnpm / tsx / vite / esbuild / start:dev）。 */
const isDev = (cmd) => {
  if (EXCLUDED.test(cmd)) {
    return false;
  }
  if (/--filter\s+study-(nodejs|react)/.test(cmd)) {
    return true;
  }
  if (!cmd.includes(ROOT_MARK)) {
    return false;
  }
  return /tsx|vite|esbuild|start:dev|src\/index\.ts/.test(cmd);
};

const listProcesses = () =>
  execSync('ps -Ao pid=,ppid=,command=', { encoding: 'utf8' })
    .split('\n')
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[0]);
      const ppid = Number(parts[1]);
      if (!pid || !ppid) {
        return null;
      }
      return { pid, ppid, cmd: parts.slice(2).join(' ') };
    })
    .filter(Boolean);

const matchedPids = (rows) =>
  rows.filter((row) => isDev(row.cmd)).map((row) => row.pid);

const signal = (pid, value) => {
  try {
    process.kill(pid, value);
  } catch (error) {
    if (error.code !== 'ESRCH') {
      console.error(`  [stop-dev] kill ${pid} (${value}) 失败: ${error.message}`);
    }
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const before = matchedPids(listProcesses());

  if (before.length === 0) {
    console.info('[stop-dev] 未发现 study-fullstack 的 dev 服务进程。');
    return;
  }

  console.info(`[stop-dev] 终止 ${before.length} 个 dev 进程: ${before.join(', ')}`);
  before.forEach((pid) => signal(pid, 'SIGTERM'));
  await wait(1500);

  const alive = matchedPids(listProcesses());

  if (alive.length > 0) {
    console.info(`[stop-dev] SIGTERM 未退出，改用 SIGKILL: ${alive.join(', ')}`);
    alive.forEach((pid) => signal(pid, 'SIGKILL'));
    await wait(500);
  }

  const left = matchedPids(listProcesses());
  if (left.length > 0) {
    console.warn(`[stop-dev] 仍有进程存活，请手动检查: ${left.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.info('[stop-dev] dev 服务已全部停止。');
  }
};

main();
