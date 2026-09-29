# 仓库约定

除非明确要求，不要修改 ESLint、Prettier、TypeScript 配置及构建脚本；代码应适配现有工程规范。

所有后端 PostgreSQL 开发、迁移与联调只使用 `study_nodejs`，通过 `DATABASE_URL` 连接，不提交真实凭据。执行可能改动数据的操作前确认 `current_database()`；不要清空或重建已有数据。默认单元测试使用注入或模拟，真实数据库测试需显式启用且限定在该库。

实现学习型 demo 时使用 `.agents/skills/study-demo/SKILL.md`，其中包含前后端协作、数据库和验证要求。
