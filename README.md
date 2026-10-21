# SillyTavern 表情包管理器（手机友好版）

## 安装
把整个 `sticker-manager` 文件夹放进 `SillyTavern/public/scripts/extensions/third-party/`，刷新酒馆。插件会作为酒馆扩展设置中的可展开面板显示，不会打开全屏页面。

## 使用
展开“表情包管理器”，点击“导入”，选择文件夹并粘贴内容：
含义 URL
大脑宕机 https://example.com/001.png
逃走 https://example.com/002.png

也支持 Tab 分隔，或每行仅放一个 URL。支持新建、重命名、删除文件夹，编辑/删除单个表情，复制 URL 和导出 JSON 备份。图片只引用 URL，不会上传图片。

## 兼容函数
全局暴露 `window.findPlatformStickers()`、`window.renderStickerPanel()` 和 `window.getStickerManagerGroups()`。点击表情仍会生成 `[表情:名称 URL]`。若微信界面在独立 iframe 内，仍需将数据桥接到 iframe 页面。
