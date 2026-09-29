import ResultView from './components/ResultView';

const EmptyRoutes = () => (
  <ResultView
    status="INFO"
    subTitle="在 src/pages 下添加 index.tsx 后，执行 pnpm gen:routes 即可生成菜单和路由。"
    title="还没有 demo 页面"
  />
);

export default EmptyRoutes;
