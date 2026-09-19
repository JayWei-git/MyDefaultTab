# Minimalist Tab

一个为个人使用而设计的 Chrome 新标签页扩展：将常用网站、独立隐私空间和本地壁纸放在同一个干净、低干扰的界面中。界面以快捷键为主，不保留底部工具栏；悬浮元素使用高透、带边缘折射的玻璃效果。

## 功能

- 默认空间与隐私空间相互独立，各自保存分类和网站。
- 分类、网站可右键编辑；网站和分类均支持拖拽排序。
- 图标可整体隐藏，并持久化此偏好。
- 支持 JSON 导入、导出，导入数据会进行格式校验。
- 支持图片和视频壁纸；双图层切换并预加载下一张，避免切换白屏。
- 顺序、随机、手动固定壁纸三种状态；策略逻辑可独立扩展。
- 图标、分类标题与 Add Site 使用真实的 SVG 位移折射玻璃。位移图以 2× 采样生成，兼顾高 DPI 边缘细节与运行开销。

## 快捷键

| 按键 | 操作 |
| --- | --- |
| `S` | 切换默认空间和隐私空间 |
| `H` | 隐藏或显示全部网站图标 |
| `E` | 导出网站数据为 JSON |
| `I` | 选择并导入 JSON 数据 |
| `A` | 打开新增分类编辑框 |
| `1` | 切换为顺序壁纸播放 |
| `2` | 切换为随机壁纸播放 |
| `B` | 输入壁纸编号并手动选择 |
| `W` | 显示当前壁纸编号 |
| `F` | 固定当前壁纸；再次按下恢复自动播放 |

编辑操作：右键网站图标可编辑网站；右键或双击分类名称可编辑分类。分类新增只有在编辑框点击 Confirm 后才会写入。

## 壁纸

将壁纸放入 `background/`，文件名必须以数字开头，例如 `1.jpg`、`2.mp4`。编号无需连续；按下 `B` 时会基于实际文件动态提示可用范围。支持：`mp4`、`webm`、`mkv`、`avi`、`mov`、`jpg`、`jpeg`、`png`、`gif`、`webp`、`bmp`、`svg`、`avif`、`ico`。

切换时播放器只保留两层媒体：当前显示层与下一张预加载层。手动选图、固定壁纸或快速连续切换会取消过期请求，并释放不再需要的图片或视频资源。

## 项目结构

```text
app.js                       启动与页面生命周期
src/config.js                默认配置、存储键和媒体规则
src/storage.js               数据持久化、迁移、导入导出状态
src/categories.js            分类与网站的领域操作
src/wallpaper.js             壁纸发现、切换、预加载与释放
src/wallpaper-strategies.js  播放策略注册表
src/ui.js                    UI 组合入口
src/navigation.js            导航渲染与拖拽交互
src/editor.js                编辑弹窗工作流
src/shortcuts.js             键盘命令与空间转场
src/transfer.js              JSON 文件导入导出
src/toast.js                 状态提示
src/glass.js                 悬浮玻璃镜片配置
src/vendor/                  第三方液态玻璃位移引擎及许可证
```

## 扩展壁纸播放逻辑

播放算法和播放器解耦。要增加新策略，在 `src/wallpaper-strategies.js` 注册一个具有 `pick(modes, currentIndex)` 方法的对象即可：

```js
registerWallpaperStrategy("custom", {
    async pick(modes, currentIndex) {
        const index = (currentIndex + 2) % modes.length;
        return { mode: modes[index], index };
    }
});
```

播放器本身无需修改；策略只负责返回下一张壁纸的模式和下标。

## 本地使用

1. 打开 `chrome://extensions`。
2. 开启开发者模式。
3. 选择“加载已解压的扩展程序”。
4. 选择本项目目录。

项目不需要安装依赖或构建。图标位于 `asserts/`；数据与偏好均存储在浏览器扩展的本地存储中。

## 第三方许可

`src/vendor/liquid-glass.js` 基于 [Liquid Glass](https://github.com/rizzytoday/liquid-glass) 的 MIT 许可版本，完整许可证见 `src/vendor/LIQUID-GLASS-LICENSE.txt`。本项目对其增加了高分辨率位移图和缓存控制。
