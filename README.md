# SillyTavern 表情包管理器（手机友好版）

## 安装
把整个 `sticker-manager-mobile` 文件夹放进 `SillyTavern/public/scripts/extensions/third-party/`，刷新酒馆。插件会作为酒馆扩展设置中的可展开面板显示。

## 导入文件
点击“导入文件”，从手机或电脑文件选择器选择 `.txt` 或 `.docx` 文件。文件名（不含扩展名）会自动作为分组名；如果同名分组已存在，会把新表情合并进去并跳过重复 URL。

文件正文每行一条，推荐格式为：
```text
大脑宕机 https://example.com/001.png
逃走 https://example.com/002.png
```
也支持“名称 + Tab + URL”或每行只放一个 URL。DOCX 读取需要运行环境提供 `JSZip`。如果当前环境没有该组件，请将 DOCX 另存为 TXT 后导入。

“导出 TXT”会导出当前选中分组，格式为每行“名称 + Tab + URL”。“表情包整理页”按钮会打开 https://enchanting-zuccutto-4dd92c.netlify.app/ 。

## 其他功能
支持搜索、新建/重命名/删除文件夹，编辑/删除单个表情和复制 URL。图片只引用 URL，不会上传图片。

## 兼容函数
全局暴露 `window.findPlatformStickers()`、`window.renderStickerPanel()` 和 `window.getStickerManagerGroups()`。点击表情仍会生成 `[表情:名称 URL]`。若微信界面在独立 iframe 内，仍需将数据桥接到 iframe 页面。
