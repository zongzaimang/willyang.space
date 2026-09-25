# Will Yang Studio

这是一个由结构化内容生成的静态作品集。正式源码与内容生成到独立的 `dist-static/`，本地预览和 GitHub Pages 使用同一份产物。现有页面布局、项目地址与历史链接保持兼容。

## 环境与常用入口

Node.js >= 22.13，pnpm 11.19.0。构建、内容检查、图片优化和浏览器测试均使用锁定的开发依赖。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

打开 `http://127.0.0.1:4173`。开发命令只监控 `_projects`、项目图片、页面文案和前端资源；新增、修改或删除项目 Markdown 后会自动校验并重新构建，浏览器手动刷新即可看到结果。构建失败时保留上一次成功预览。服务器只暴露生成目录，不暴露内容源和本地导出资料。

没有包管理器时可直接运行：

```sh
node tools/check-content.mjs
node tools/build-site.mjs
node tools/serve-site.mjs
```

| 操作 | 命令 |
| --- | --- |
| 查看项目 | `pnpm run project list` |
| 新建草稿 | `pnpm run project new 260918-brand-model` |
| 预览导入差异 | `pnpm run project import 260918-brand-model mastergo-exports/260918-brand-model` |
| 应用素材导入 | 上一条命令末尾增加 `--apply` |
| 检查全部内容 | `pnpm run check` |
| 标记待发布 | `pnpm run project status 260918-brand-model ready` |
| 预览草稿和待发布项目 | `pnpm run dev:drafts` |
| 标记为正式内容 | `pnpm run project status 260918-brand-model published` |
| 撤下项目 | `pnpm run project status 260918-brand-model archived` |
| 更新响应式图片 | `pnpm run images` |
| 正式构建并检查页面内链 | `pnpm run build` |
| 发布流程测试 | `pnpm test` |
| 浏览器回归 | `pnpm exec playwright install chromium`，然后 `pnpm run test:browser` |
| 验证发布包 | `pnpm run release:verify` |
| 留存本地版本 | `pnpm run release:save` |
| 恢复本地发布包 | `pnpm run release:restore <版本号>` |
| 验证线上版本 | `pnpm run verify:live https://willyang.space` |

状态变更只修改内容文件，不自动提交或上线。`published` 必须由 `ready` 转入；草稿和待发布项目不进入正式构建。首次新建草稿资料不完整时可以正常构建正式站，预览草稿前须补齐必填资料。

## 内容放在哪里

```text
content/
  site.json                    品牌、联系方式、域名、导航
  pages/                       Works、About、News、404 等页面文案
  news.json                    动态条目及发布状态
  image-variants.json          图片工具生成的索引
_projects/                     唯一项目内容源；每个项目一份 Markdown
assets/                        Obsidian 粘贴的项目图片附件
assets/projects/<项目ID>/      迁移期旧图片与 MasterGo 导入快照
assets/responsive/             自动生成的响应式图片
tools/
  lib/content.mjs             内容校验、路径检查、图片尺寸读取
  lib/render.mjs              HTML 模板
  lib/artifact.mjs            发布包校验与替换
  project.mjs                 新建、状态与素材导入
  build-site.mjs              正式及草稿构建
  dev.mjs                     内容监控与本地预览
  release.mjs                 快照、校验与恢复
legacy/                        历史原型和旧生成页面，不参与发布
dist-static/                   正式产物，自动生成，不手改
dist-preview/                  草稿预览，不得发布
releases/                      本地发布快照，不提交
```

项目只从根目录 `_projects/*.md` 读取；新增一份 Markdown 就是新增项目。文件名使用 `YYMMDD 品牌 型号.md`，方便在 Obsidian 中浏览。YAML 区域只保存七个核心属性：`id`、`status`、`slug`、`date`、`brand`、`model`、`scope`。`aliases` 和 `legacyIds` 仅在有旧链接时保留；正文第一段可作为项目简介，之后的标题、段落、列表和图片顺序直接决定详情页内容。正文没有介绍文字时也可以只放图片。

Obsidian 已将粘贴附件目录设为仓库根目录的 `assets/`。直接粘贴图片后使用 Obsidian 自动生成的 `![[图片.png]]` 即可，也兼容标准 Markdown 的 `![说明](/assets/图片.png)`。网站始终使用正文第一张图片作为项目封面，并为透明 PNG 提供浅色中性背景，兼容系统高对比模式。文件重名时 Obsidian 可能生成带数字后缀的名称，Markdown 引用是唯一判断依据。

`_projects` 只允许 Markdown 文件，并且是项目内容的唯一来源。旧的 `content/projects` 和 JSON 项目清单不再参与构建。`assets` 保存二进制资源，不单独决定网站展示；未被 Markdown 引用的图片不会进入发布包。迁移期间仍兼容 `assets/projects/<项目ID>/` 的旧引用，删除旧文件夹前必须先替换相应 Markdown 中的图片。

`id` 是稳定内部标识，`slug` 决定公开地址，`aliases` 保存曾经使用的地址，`legacyIds` 保留旧 `project.html?id=...` 链接。不要为更新日期而改变 ID。修改 slug 时，把原 slug 加入 aliases。归档项目的当前地址和别名都不生成，旧查询地址回到项目选择页。

MasterGo 保留创作和精选展示素材，本地内容文件保存确认过的发布版本。来源链接记录在 `source.url`；未知来源保持空值，不猜测。导入记录包含时间和素材哈希版本，详情见 [MASTERGO_WORKFLOW.md](MASTERGO_WORKFLOW.md)。

仓库根目录可直接作为 Obsidian vault。便携的外观和核心插件设置可以提交；`.obsidian/workspace.json`、移动端工作区和缓存已排除，避免设备窗口、标签与搜索状态污染 Git 或触发内容构建。

## 发布与回滚

1. 完成内容及素材更新，执行检查、流程测试、构建和浏览器回归。
2. 查看 `dist-static/` 的预览；确认只包含本次要发布的内容。
3. 审阅 Git 差异，只提交预期文件。合入 `main` 后 GitHub Actions 自动验证并部署；PR 只检查，不部署。
4. 以 Actions 的部署结果和随后的线上校验为准。推送成功或本地构建成功都不等于线上已更新。

每份产物的 `release.json` 记录页面、文件哈希、发布版本和 CI 源提交。构建先写临时目录并完成校验，成功后替换旧产物；不会把整个 assets 目录直接复制上线。草稿、归档、无引用素材、MasterGo 来源和编辑备注不会进入正式产物。多人共享引用的图片仍会被保留。

本地恢复：先 `release:save` 留存版本，再用 `release:restore` 恢复。恢复只改变发布包，不改变内容源；不要在预览该恢复结果前重新构建，否则会重新使用当前内容。

线上恢复：在 GitHub Actions 的 **Deploy GitHub Pages → Run workflow** 中选择 `main`，将 `rollback_run_id` 填为此前成功部署的运行 ID。流程只接受这个仓库同一工作流在 main 上的成功正式运行，下载其 `site-release` 原样部署并再次验证。产物保留 30 天；过期时需从相应源码提交重新构建。架构迁移前的历史运行不含该产物，不能使用这个入口。

回滚后，应将需要长期保留的修复同步回内容源，防止下一次正常发布覆盖回滚结果。为避免错误自动恢复已撤下资料，线上回滚保留为人工选择。

## 验证范围

流程测试覆盖草稿隔离、缺图与重复地址、撤图和归档后的产物清理、导入差异、完整新增流程、响应式图过期回退、发布包篡改及回滚。浏览器测试覆盖 9 个页面 × 3 个宽度 × 2 个主题、图片解码、旧链接、查看器、焦点恢复、主题持久化、404、源码隔离及无 JavaScript 阅读。

这不代表 Safari、Firefox、真机和线上性能均已验证。图片和字体显示质量的进一步优化属于后续阶段。

项目文案审核和参考来源集中在 `docs/project-copy-review.md`；原始来源与导入信息保存在 `docs/project-import-history.md`。新导入的时间、版本和来源目录写入 `outputs/imports/<项目ID>/<版本>.json`，不写回笔记属性。封面始终取正文第一张图片，无需填写 `cover`。导入时 `01` 起的图片进入正文；可选的 `00` 图片仅保存在导入快照中，不作为网站封面。
