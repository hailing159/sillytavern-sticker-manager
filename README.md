# SillyTavern 表情包管理器

## 安装
1. 将 `sticker-manager` 文件夹放到 SillyTavern 的 `public/scripts/extensions/third-party/` 目录下。
2. 确认文件结构为：
   - `public/scripts/extensions/third-party/sticker-manager/manifest.json`
   - `public/scripts/extensions/third-party/sticker-manager/index.js`
   - `public/scripts/extensions/third-party/sticker-manager/style.css`
3. 刷新 SillyTavern 页面。若扩展未自动加载，请检查浏览器控制台及酒馆版本的第三方扩展加载设置。

## 使用
在扩展设置区域找到“表情包管理器”，点击“打开表情包管理”。创建分组后，点击“批量导入”，按每行 `含义 URL` 的格式粘贴数据，例如：
含义 URL
大脑宕机 https://example.com/001.png
逃走 https://example.com/002.png

也支持每行只放一个 http/https URL，或用 Tab 分隔名称和 URL。可导出 JSON 备份。

## 数据和兼容
- 图片不会上传到酒馆服务器，只保存 URL。
- 数据保存在当前浏览器的 localStorage，清除站点数据会清空它；建议定期导出 JSON 备份。
- 插件暴露 `window.findPlatformStickers()`、`window.renderStickerPanel()`、`window.getStickerManagerGroups()`。
- `findPlatformStickers()` 返回分组数组：`[{id,name,stickers:[{id,name,url}]}]`。
- `renderStickerPanel()` 会尝试寻找 `#stk-tabs`、`#stk-grid`、`#ri`、`#stk-panel` 等微信聊天界面元素；没有这些元素时只返回数据，不会报错。
- 点击表情会向 `#ri` 追加 `[表情:名称 URL]` 格式，保持原微信界面的消息格式。
- SillyTavern 扩展通常运行在酒馆页面上下文。若你的聊天界面位于 iframe 或不同页面中，需在该页面引入此扩展的兼容桥接代码，不能保证酒馆主页面的 `window` 函数自动出现在 iframe 的 `window` 上。
