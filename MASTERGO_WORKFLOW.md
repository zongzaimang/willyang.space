# MasterGo 内容获取与发布规则

MasterGo 是 Will Yang Studio 项目资料的主内容源。日常项目中的草图、渲染、实拍、模型截图与过程推演继续保留在原有大白板中；网站只读取专门整理的展示页面。

## 页面用途

每个准备收录到个人作品集的网站项目，应在对应 MasterGo 项目中建立一个“网站”页面。

该页面是对外作品集的精选出口，不替代项目过程页面。

内容建议按展示顺序组织：

1. 项目封面（优先 16:9）
2. 项目信息：名称、品牌、年份、类别
3. 项目简介
4. 展示图片：渲染、实拍、过程图、模型截图等
5. 必要的图片说明

只有标记为可发布的内容才应放入该页面；草图、备选稿和内部资料保留在其他页面。

## 页面命名

- 默认名称：`网站`
- 当同一 MasterGo 项目中存在多个网站展示页面，使用：`项目名称 + 网站`

示例：

- `电子通行证 Max 网站`
- `HC65 UHE 网站`

MasterGo 页面依靠创建时间与手动拖动顺序管理，不按名称排序。因此不使用 `00 —` 等排序前缀；需要时将“网站”页面手动拖至易访问的位置。

## 发布流程

1. 在 MasterGo 的“网站”页面完成精选内容与排序。
2. 将该页面设为可发布，并提供其网页分享链接或在网页版打开。
3. Codex 读取页面中的文字与素材，整理为网站项目页。
4. 图片导出、下载或上传到 GitHub 前，需要用户确认相应外部操作。
5. 网站发布后，保留 MasterGo 页面作为后续更新的唯一内容依据。

## 权限与自动化边界

- 个人免费版当前采用“分享页面 + Codex 整理发布”的半自动方式。
- 个人免费版不具备 Magic MCP 的远程自动读取权限；该能力需要团队版及以上权限。
- 后续若升级并启用 MasterGo MCP，可评估从“网站”页面自动读取结构化内容，以减少人工整理。
# MasterGo → Will Yang Studio publishing workflow

## Source of truth

- MasterGo is the creative source of truth.
- Each project uses a page named `网站`; when a file needs several website pages, use `项目名称 + 网站`.
- Page order is manually arranged in MasterGo; names do not determine its order.

## Project ID and metadata

- Parse the MasterGo file title as: `YYMMDD BRAND MODEL`.
- Convert `YYMMDD` to `YYYY-MM-DD` and store it as `startedAt`. It controls Works sorting, newest first, even though the page only shows the year.
- Example: `240129 NITECORE HC65 UHE` → `id: 240129-nitecore-hc65-uhe`, `startedAt: 2024-01-29`, brand `NITECORE`, model `HC65 UHE`.
- Record every published project in `content/projects.json`.

## Export only once per update

1. In the project’s `网站` page, mark each selected container as an export slice.
2. Use the default numeric order only: `01.png`, `02.png`, `03.png`, `04.png` … `01` is always the Works cover; every following image is shown vertically on the project page in number order. Do not place alternative JPG/WebP/PNG versions of the same number in this export folder.
3. Use PNG or lossless WebP for transparent artwork. Do not use JPG when transparency matters.
4. Run MasterGo “Export all slices” (`Shift + Ctrl + E` on Windows) and export to the project source folder:
   `mastergo-exports/<project-id>/`
5. Preview changes locally:
   `./tools/sync-mastergo-project.ps1 -ProjectId '<project-id>' -Source 'mastergo-exports/<project-id>'`
6. If the list is correct, run the same command with `-Apply`, then tell Codex: `同步 <project-id>`.

`mastergo-exports/` is your local source archive and is ignored by Git. The script only copies new or changed files into the publish folder, so replacing one image in MasterGo updates only that image in the website asset folder.

