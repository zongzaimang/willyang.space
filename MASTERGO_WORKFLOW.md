# MasterGo → 网站内容发布

## 来源与责任

创作资料继续保留在 MasterGo。每个项目建立“网站”页面，多项目文件可使用“项目名称 + 网站”。只有已确认可公开的内容放入该页面。页面名称不决定网站顺序。

网站内容文件是经过整理确认的发布版本，MasterGo 是创作与精选素材来源。项目中记录来源文件名、页面名称和实际分享链接，素材导入自动记录时间与哈希。未经实际读取的资料不补写，不根据模板推断真实项目职责。

## 新建项目

```sh
node tools/project.mjs new 260918-brand-model
```

命令会在根目录 `_projects` 新建一份草稿 Markdown。将文件改名为易读的 `YYMMDD 品牌 型号.md`，再填写品牌、型号、日期、简介、真实服务范围和来源链接。`date` 控制作品排序，公开地址为 `/<slug>/`；稳定身份由 front matter 中的 `id` 决定，不依赖文件名。

## 导出与导入

1. 在 MasterGo 网站页面整理切片。
2. 使用 `01.png`、`02.png`…，或 `01@1x.jpg` 等数字命名。同一序号只能有一张图片。
3. `00` 是可选独立封面；`01` 必须存在，作为第一张详情图。没有 `00` 时，`01` 也作为封面。透明素材使用 PNG 或保留透明通道的 WebP。
4. 导出到 `mastergo-exports/<项目ID>/`。此目录只在本地保留，不进入 Git 或发布包。
5. 查看差异：

```sh
node tools/project.mjs import 260918-brand-model mastergo-exports/260918-brand-model
```

6. 确认新增、替换、改名和移除清单后，执行相同命令并增加 `--apply`。

PowerShell 兼容入口仍可使用：

```powershell
./tools/sync-mastergo-project.ps1 -ProjectId '260918-brand-model' -Source 'mastergo-exports/260918-brand-model'
```

加 `-Apply` 才会应用。每次导入会将素材存为 `assets/projects/<项目ID>/imports/<版本>/` 下的不可变快照，并直接更新对应 Markdown 的封面、图片顺序和来源版本。旧文件保留以便恢复；未被 Markdown 引用的旧文件不再发布。图片说明按内容哈希保留，替换成新图片时应重新检查说明。导入会以本次完整导出重新决定封面和图片顺序，其他正文保留，手工调整请在导入后完成。

## 检查与发布

```sh
pnpm run images
node tools/project.mjs status 260918-brand-model ready
pnpm run dev:drafts
```

确认封面、排序、说明、透明效果和可公开范围，再执行：

```sh
node tools/project.mjs status 260918-brand-model published
pnpm run check
pnpm test
pnpm run build
pnpm run test:browser
```

之后审阅 Git 差异并按 README 的发布流程上线。已经发布的项目导入新素材不会自动上传或部署，但下次正式构建会采用新清单。

## 撤下与恢复

```sh
node tools/project.mjs status 260918-brand-model archived
pnpm run build
```

重新发布这个产物后，项目页面与无其他引用的图片从站点移除，本地原件仍在。部署不能删除访问者此前下载的文件或立即清除所有第三方缓存。

恢复项目需检查内容后依次标记 `ready`、`published`。若要恢复整站历史产物，使用 README 中的发布包回滚流程。

所有本地脚本只读取已导出的素材，不自动获取 MasterGo 权限，也不执行外部导出或上传。
