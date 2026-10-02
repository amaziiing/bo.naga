# BO / Main 内容替换（SPA）开发指南

> 给所有需要新增页面、改造现有页面的同事。
> 读完这一页，你应该能做到：**新页面自动获得无刷新切换；改页面时不破坏换页机制；出问题时自己定位。**

## TL;DR（赶时间只看这段）

新增页面 / 改造完页面，**四步跑完就能交付**：

```bash
node scripts/adopt-bo-spa.js                      # 补标记（幂等）
node scripts/check-spa-readiness.js --write-manifest   # 更新可换页清单
node scripts/pin-spa.js                           # 重算指纹（改了资源必须跑）
node scripts/serve-static.js 8098 & node scripts/audit-spa-swaps.js 你的页面.html  # 验证
```

写页面脚本时只需记两条最容易致命的（详细见第 4 节）：

1. **整个文件包在 `(function () { ... })();` 里**，且不与别的脚本重名（否则换页/回访直接 `SyntaxError`，整段脚本不执行）；
2. **可重复执行**：切换出去再切回来时不能报错、不能翻倍、不能重复绑定。

---

## 0. 一句话原理

点击侧栏 / 模块 tab 时**不再整页刷新**，路由 `assets/js/bo-spa.js` 会：

1. 取出目标页的 HTML（`fetch` + `DOMParser`，不执行）；
2. 把**目标页的样式表、内容帧、页面自有标记**在当前文档里收敛成一致；
3. 用 `pushState` 更新地址，再**按文档顺序执行目标页尚未运行过（或属于目标页自身）的脚本**；
4. 重放目标页脚本注册的 `DOMContentLoaded` 监听。

目标是：**换页进来的页面，跟直接打开这一页长得一样、行为一样。**

---

## 1. 范围与边界（先确认你的页面在不在范围内）

| 类别 | 判定方式 | 是否启用 SPA |
|---|---|---|
| **BO 页面**（Backoffice 外壳） | `<html data-bo-shell="bo">` | ✅ 在范围内 |
| **Main 面板页面** | `<html data-bo-shell="main">`（文件名 `main-*` / `main_*` / `menu-permission.html`） | ✅ 在范围内 |
| **agent 门户** | 页面里加载了 `assets/js/agent-portal.js` | ❌ 明确排除（有自己的外壳，见 `AGENTS.md`） |
| 跳转存根 | 只有 `meta refresh` 或 `location.replace('xxx.html')`，几百字节 | ❌ 不是页面 |
| 片段 | 没有 `<html>` / 没有 `<body class>`，被别的脚本拼进去用 | ❌ 不是页面 |

⚠️ **最容易搞错的一点**：判定 agent 门户**看的是"是否加载 `agent-portal.js`"，不是文件名**。
`agent-management.html`、`agent-detail.html`、`agent-commission-admin.html` 等 **9 个 `agent-*.html` 是普通 BO 页面**（它们就是 Agent 模块的 tab 行）。按文件名一刀切会把它们排除掉，从侧栏点进去就变成整页刷新。

---

## 2. 新增 / 改造一个页面：三步

### 第一步：打标记（一条命令，别手改）

```bash
node scripts/adopt-bo-spa.js --check     # 先看它缺什么
node scripts/adopt-bo-spa.js             # 自动补齐（幂等，可重复跑）
```

它会补上：

| 补的东西 | 作用 |
|---|---|
| `<html data-bo-spa="1" data-bo-shell="bo">` | 声明"我参与换页 + 我属于哪个外壳"（**外壳必须声明，不能靠猜**） |
| `<head>` 最前面的首屏画布 `<style>` | 防止切换时闪白（只给 BO 页；Main 页不能覆盖 `html{background}`） |
| `<head>` 最前面的主题引导 + `__boDCL` 注册表 | 防止主题闪 + 让路由器能重放页面的 `DOMContentLoaded` |
| `bo-global-quicknav.css` 的静态 `<link>` | 侧栏样式在首屏就位，避免"字体跳一下" |
| `<script src="assets/js/bo-spa-manifest.js">` + `<script src="assets/js/bo-spa.js">` | 清单 + 路由本体 |

### 第二步：重新生成清单 + 重算指纹

```bash
node scripts/check-spa-readiness.js --write-manifest   # 生成"可被换入的页面清单"
node scripts/pin-spa.js                                # 重算 ?v= 指纹
```

> **指纹必须重算**：页面用 `?v=<sha1[:8]>` 引用这几个文件。内容变了指纹不变，浏览器会继续用缓存里的旧版本——这正是"我明明修了却没生效"的主因。

### 第三步：验证

```bash
node scripts/check-spa-readiness.js      # 静态检查：135 页全部达标 / 0 short
node scripts/serve-static.js 8098 &      # 起本地服务（并发，别用 python 的单线程）
node scripts/audit-spa-swaps.js           # 真实浏览器里逐页换页审计
node scripts/audit-spa-swaps.js --twice    # 再走一遍：每页进入两次（验证"可重复执行"）
node scripts/audit-spa-swaps.js 你的页面.html   # 只测你改的页
```

### 如果你的页面**外壳不标准**（没有 `.report-content`）

老布局页面用属性声明自己的内容帧（帧 = 换页时被替换的那个元素）：

```html
<section class="cur-page" data-bo-frame>   <!-- currency-management.html 的做法 -->
```

规则：`[data-bo-frame]` 优先，找不到才用 `.report-content`。**两侧页面帧元素不同时，路由器会整体替换这个元素**（不是只换子节点），这样换页后的样子与直接打开完全一致。

### 如果要把页面加进某个模块的 tab 行

在 `assets/js/auth.js` 里加一行（`MODULE_TABS`）：

```js
'你的页面.html':{label:'显示名', order:9, module:'report'},
```

并在需要时把模块锚点写进 `MODULE_ANCHORS`。tab 行由 `renderModuleTabs` 依据当前 URL 生成，**不要自己在页面里写死 tab 行**。

---

## 3. 路由一次换页做了什么（顺序与"为什么"）

理解这张表，就知道自己的改动会不会踩坑。

| # | 步骤 | 为什么必须这样 |
|---|---|---|
| 1 | **拦截判定**：链接目的地是否在 `bo-spa-manifest.js` 清单里 | 不在清单（agent 门户、存根、无内容帧的页面）**一律交给浏览器原生跳转**；否则会"先 fetch 一次再整页跳"，比不拦截更慢 |
| 2 | `fetch` + `DOMParser` 解析目标页 | 只解析、不执行；解析结果缓存（上限 16 份，避免长会话内存膨胀），**并且只复用 5 秒**：超过 5 秒重新取。没有这条时限时，服务端改了页面（开发时是常态、部署时也是）在会话里永远看不到——实测：改掉服务端 `game.html` 后从 tab 再进去，**一个文档请求都没发出**，标题还是旧的。请求本身还带 `cache:'no-cache'`（每次强制重验证）：只带 `Last-Modified`、没有 `Cache-Control` 的响应允许启发性缓存，不重验证时 `fetch` 会直接吃浏览器缓存里的上一版 HTML——表现为“切页还是旧 CSS/旧 JS、刷新就正常”（实测：切到 `promotion-report.html` 拿到旧文档且**零请求**，刷新才重验证取到新版） |
| 3 | **样式表收敛**：补上目标页声明而当前文档还没有的表（**只会增加，不会移除**，同 `<head>` 里的 import map） | 与内容替换在**同一个任务**里完成，中间不给浏览器绘制机会 → 不会闪。是否"已有"按 **`文件名+?v=`** 判断：改了 CSS 重打指纹后那是一张**新表**，会被补上（旧指纹那张留着不撤，CSS 同特异性下后加的生效）；只按文件名判断的话，**重打指纹的新表永远不会被请求**，整个会话继续跑旧样式——这正是 `pin-spa.js` / `check-asset-pins.js` 要防的"我改了怎么没生效"（实测：声明 `bo-shell.css?v=deadbeef99` 的页面，新指纹 0 请求） |
| 4 | **内容帧替换**（实际顺序：紧随第 3 步，之后才是第 8 步的权限判定） | 帧元素（标签与全部属性）相同 → 只换子节点（保留脚本可能持有的引用）；不同 → 整体替换 |
| 5 | **body 级页面自有标记收敛**：`body > 非 shell、非 script` 的元素 | 页面自己的模态框（`#approveModal`、`#ruleModal`）在 body 级，既不进帧也不属外壳。不做这一步：换页后它们不存在 → 脚本 `$('x').onclick` 抛 null → **后面所有绑定都不执行，页面"在但用不了"** |
| 6 | **帧的后续兄弟节点收敛** | `slider-edit.html` 的 Save/Reset 在 `<footer id="bannerEditFooter">`——帧的兄弟。不做这一步 `#resetSliderBtn` 不存在，`slider-edit.js` 第一句绑定就抛错 |
| 7 | **清理 body 上的"本页已完成"标记** | 共享脚本常把 `body.dataset.xxx='1'` 当"只做一次"的守卫。**body 不参与换页**，标记会永久保留 → 后续页面该做的工作全被跳过（`crud-modal-pattern` 就是这个坑） |
| 8 | `pushState` → **先跑页面权限校验（紧跟第 3 步样式表、在第 4 步内容替换之前；拒绝即中止换页）** | 权限校验在 auth.js 启动时执行一次；不重跑的话，换页可以绕到菜单权限以外的页面。在替换前判定意味着被拒绝时目标页的 DOM 与脚本都不会出现（旧行为是先换内容、再跳转）；校验接收目标文件名，因为此时 `location` 已经指向目的地 |
| 9 | **立即绘制外壳状态**：标题/图标、高亮 tab、侧栏高亮、滚动归零 | 目标页脚本要跑 2–300ms；先绘制让点击**立刻有反馈** |
| 10 | **执行目标页脚本**：先并行预载，再按文档顺序执行 | 顺序不能变（同页脚本互相依赖）；预载只是把网络并行起来 |
| 11 | **重放 `DOMContentLoaded`**：只重放本次注册的 / 目标页自己的 / 白名单共享脚本的；`{once:true}` 的旧记录不再重放 | 不能无差别派发（会把上一页的监听在新 DOM 上再跑一遍 → 报错 + 请求风暴）。once 就是 once：它的原生调用已经在文档真实的 DOMContentLoaded 上发生过；需要“每次换页重做”的共享运行时请订阅 `bo:spa:content`（实例：`main-merchant-visibility.js`） |
| 12 | 再绘制一次外壳，派发 `bo:spa:content`（内容替换前已派发 `bo:spa:before`） | 目标页脚本可能重建了 tab 行。`bo:spa:before` 是页面关闭自己临时浮层/滚动锁的最后时机——它们放在 `body` 上，而 `body` 不参与换页 |

**关于“脚本跑不跑”的两条规则**（第 10 步的细节）：

- **页面私有脚本（只有这一页加载）→ 每次进入都重跑**。因为整页加载就是这样：`promotion-workspace.js` 结尾直接调用 `load()`、**没有 `DOMContentLoaded`**，若按“本会话执行过就不再跑”，切回来的页面就不会再渲染数据（曾报“从 Promotion Log 切回 Promotion Bonus 数据不完整”）。
- **共享脚本（当前页也加载，如 `auth.js` / `reports.js` / `bo-topbar.js`）→ 不重跑**。它们的作用是全局的（定时器、document 监听、注入容器），重跑就是重复副作用。
- **一个文件服务两页时（被 2–3 页加载的“页面私有脚本”）→ 在 `<script>` 上加 `data-bo-spa-rerun`**。否则它在“另一页也加载”这条规则下被判成共享而跳过，目标页的启动代码 **一行都不跑**（实例：`site-customize.js` 同时被 `site-customize.html` / `layout-section.html` 加载，从 Site Customize 切到 Layout Section 后布局编辑器整块失效——菜单、保存/重载、查找、CodeMirror 全部没了，刷新才恢复；反方向则是 Site Customize 的卡片不渲染）。
- **共享运行时如果负责“把目标页的 DOM 建出来”→ 让它订阅 `bo:spa:content` 重绘一次，而不是用 `data-bo-spa-rerun` 重跑整个文件**。这类文件的副作用是文档级的（`window.fetch` 包装、document 监听、定时器），重跑就是每跳叠一层。实例：`main-currency-runtime.js` 被 ~158 页加载，负责渲染各报表页的 CURRENCY 行；换页时它被判成共享、一行不跑，目标页就停在静态骨架 `<span class="mre-cur-loading">…</span>` 上（**“切到 win/loss report，currency 要刷新才出来”，provider report 同样**）。实测 `main-win-lose-report.html → main_provider_report.html → 切回`：币种按钮 `3 → 0 → 0`、`skeleton: PRESENT`、`navlog phase:"ok"`、0 报错，`BO_SPA.debug.scriptTimes()` 两跳里都没有该文件；订阅 `bo:spa:content` 后 `3 → 3 → 3`，`click` 没多一层、`bo:spa:content` 监听数恒为 2（不随跳数增长）。**document 活得比内容帧久**，所以第一次加载注册的那一个 document 监听就够，不需要每页各写一份。当前用这个钩子的：`main-sidebar-account.js`、`member-transaction-page.js`、`main-currency-runtime.js`、`main-merchant-visibility.js`。

**导入映射（import map）**：`<head>` 里的 `<script type="importmap">` 属于“页面环境”，换页时和第 3 步的样式表一样会被带进当前文档（在跑目标页脚本之前）。声明它的页面（目前只有 `layout-section.html`）用 `import()` 加载 ES 模块，裸模块名只能靠这张表解析，而表里每个包只映射到一个 esm.sh URL——这正是 CodeMirror 只存在**一个** `@codemirror/state` 实例的原因（两个实例会让所有扩展失效）。不带过去就是 `Failed to resolve module specifier '@codemirror/view'`，编辑器静默退回纯 textarea。

---

## 4. 写页面脚本的 6 条铁律 ⭐

同事改页面时最常踩的就是这里。

### ① 顶层 `const / let / class` 不能与其他页面脚本重名

整页加载只跑一个页面的脚本，所以不报错；**换页时两个脚本进同一个全局作用域**，第二个声明直接 `SyntaxError`，**整段脚本一行都不执行**。

```js
// ❌ 曾真实出事：game-category.js 与 game-category-edit.js 都写了
const GAME_CATEGORY_API = { ... };
// ✅ 用 IIFE 包起来（本文件自用），或起唯一名字
(function () { const GAME_CATEGORY_API = { ... }; /* ... */ })();
```

闸门 `scripts/check-global-collisions.js` 会拦这类问题（它只看**文件顶层**、不在任何 IIFE 内的声明）。

### ② 页面脚本必须**可重复执行**（并且整体包在 IIFE 里）

因为私有脚本每次进入都会重跑（见第 3 节第 10 步），所以它必须**能在一个 realm 里跑第二次**：

```js
// ❌ 顶层 const 第二次执行直接 SyntaxError，整段脚本一行都不跑
const PROVIDER_API = { ... };
// ✅ 整体包进 IIFE（本文件自用）—— assets/js 里绝大多数文件都是这个形状
(function () { const PROVIDER_API = { ... }; /* ... */ })();
```

其次才是**副作用幂等**：

```js
// ❌ 每次回访都往表格追加一行 → 越切越多
list.appendChild(makeRow(x));
// ✅ 先清空再渲染
list.innerHTML = ''; rows.forEach(x => list.appendChild(makeRow(x)));

// ❌ 每次都注册新的全局监听/定时器
window.addEventListener('resize', onResize);
setInterval(poll, 5000);
// ✅ 用守卫，或先清理旧句柄
if (!window.__xResizeBound) { window.__xResizeBound = 1; window.addEventListener('resize', onResize); }
```

监听器、定时器要用**元素上的标记**或 **window 上的单槽**（先 `removeEventListener` 旧的再绑新的）。两种写法的区别很重要：

- **元素标记**（`el.dataset.xBound='1'`）适合绑在**本页元素**上的监听——每次进入都是新克隆的元素，所以“每个元素一次”就是“每次进入一次”。
- **window 单槽**（`if(window.__x) removeEventListener(...); window.__x=handler; addEventListener(...)`）适合必须绑在 `document` / `window` 上的监听：`document` 不参与换页，只加一个“已绑过”的标记会把**上一页的闭包**留下来，它读到的是上一页的状态。

两个真实测量（`DOMDebugger.getEventListeners`，换两次页后数监听器）：`bo-seg-bounce.js` 每组胶囊各一个 `window.resize` 监听（detached 元素一直没释放）→ 5 → 7 → 11；`main-i18n.js` 的 `document` click 监听 → 26 → 27 → 29。两者都改成“清理 / 单槽”后，二次进入与直接刷新完全一致。

### ③ 不要在 `body` 上放"只做一次"的标记

```js
// ❌ body 不参与换页，标记会留到下一个页面，把该做的工作永久跳过
if (document.body.dataset.xxxReady === '1') return;
document.body.dataset.xxxReady = '1';
// ✅ 用"当前页面元素"上的标记（会随内容帧一起被替换），或做成幂等的
if (root.querySelector('.xxx-ready')) return;
```

### ④ 元素查找要做 null 保护，别让一句失败拖垮整段脚本

页面脚本常见写法是**一整块连续绑定**，中间一句 null 就全废：

```js
// ❌ 第 2 句为 null，后面 20 个绑定全部不执行
$('save').onclick = save;
$('reset').onclick = reset;
// ✅ 至少给可能不存在的元素加保护
const reset = $('resetSliderBtn');
if (reset) reset.onclick = resetForm;
```

### ⑤ 页面自有标记放在这三个位置之一

都会被收敛：**内容帧内**、**`body` 级（`body > 非 shell、非 script`）**、**帧的后续兄弟**。
不要把它们搬进别的地方（尤其是**共享容器**）再假设路由器还会替你搬。

### ⑥ 不要用 `location.reload()` 刷新；换页就用普通 `<a href="xxx.html">`

路由只拦截 `.report-nav a` / `.bo-module-tabs a` / `.bo-global-quicknav a` / `[data-bo-spa-link]` 这几类链接（同源、`.html`、且在清单内）。整页跳转的入口（钻取页、`location.href = ...`）**按设计保持整页加载**。

另：需要**强制走整页跳转**时，给链接加 `data-bo-no-spa`，链路就不会被拦截。

---

## 5. 外壳相关规范（与 `AGENTS.md` 一致）

- **`assets/css/bo-shell.css` 是外壳布局度量的唯一来源**（`padding*` / `gap*` / `font-size` / `height` / `flex*` …）。
  主题 sheet 只管**颜色、背景、边框色、阴影、自定义属性**，**不要**再声明外壳度量。
- **不要在新页面或模块 sheet 里写外壳度量 CSS**——`scripts/check-shell-drift.js` 会拦下提交并指出文件、选择器、属性。
- **有模块 tab 行的页面必须链接 `assets/css/bo-module-tabs.css`**。这是 `auth.js` 紧跟模块表写明的约定
  （"A page listed here must also link assets/css/bo-module-tabs.css"）：tab 行由 `renderModuleTabs` 生成，
  样式全靠这张表。曾经有 16 个页面漏链（整个 Report / Game 家族）→ 这些页面**刷新后**tab 行也是无样式纯链接。
  闸门 `check-spa-readiness.js` 现在会按 `auth.js` 的模块表逐页检查（缺了就报 `module-tabs.css`）。
- 常用 `data-bo-*` 属性（写在 `<header class="report-topbar" data-bo-topbar>` 上）：

| 属性 | 作用 |
|---|---|
| `data-bo-topbar` | 这个 header 由 `bo-topbar.js` 渲染（标题/图标取自菜单行） |
| `data-bo-title` / `data-bo-icon` | 本页固定标题/图标（不取菜单行） |
| `data-bo-subtitle` | 标题下第二行 |
| `data-bo-topbar-title-extra` | 标题旁的实时计数/徽标 |
| `data-bo-topbar-extra` | 右侧按钮组里的页面专属按钮 |
| `data-bo-frame` | 声明本页的内容帧（非标准外壳页用） |
| `data-bo-spa-link` | 强制让这个链接参与换页 |
| `data-bo-spa-rerun` | 这个脚本是页面私有构建代码：即使另一页也加载同一文件，进入本页时仍要重跑（见第 3 节的第三条规则） |
| `data-bo-no-spa` | 强制让这个链接走整页跳转 |

---

## 6. 四道闸门（已接入 pre-commit）

```bash
node scripts/check-shell-drift.js          # 外壳度量漂移（新声明就拦）
node scripts/check-global-collisions.js    # ① 跨文件全局重名 ② 页面脚本不可重跑
node scripts/check-spa-readiness.js        # 每页 7 项标记 + 清单是否最新
node scripts/pin-spa.js --check            # 指纹是否与磁盘文件一致
```

本地装钩子（**每个新克隆都要装一次**，hooks 不随 git 传递）：

```bash
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

- 需要**知情豁免**某一项标记：把页面写进 `scripts/spa-readiness-baseline.json`，并写清理由（保持列表短、理由诚实、能修就删条目）。
- 清单过期：`node scripts/check-spa-readiness.js --write-manifest`。
- 指纹过期：`node scripts/pin-spa.js`。
- 确有紧急情况：`git commit --no-verify`（请说明原因）。

---

## 7. 排查手册

### 打开控制台，粘这一行

```js
copy(BO_SPA.report())     // → 剪贴板，直接粘给同事/我
```

返回的 JSON 里：

| 字段 | 含义 |
|---|---|
| `nav[]` | 最近的每次换页记录 |
| `nav[].phase` | 停在哪一步：`start` / `fetched` / `content` / `scripts` / `ok` / `fallback` / `timeout` |
| `nav[].phases` | 各阶段耗时(ms)：`fetched` `content` `scripts` `ok` |
| `nav[].stuckAt` | **看门狗放弃时卡在哪一步**（定位关键） |
| `errors[]` | 同期 JS 报错（脚本文件名+行号） |

### 其他调试接口

```js
BO_SPA.debug.canSwap('xxx.html')   // 这个链接会不会被换页？（不发起请求、不跳转）
BO_SPA.debug.navlog()              // 换页记录数组
BO_SPA.debug.scriptTimes()         // 本次换页每个脚本的加载+执行耗时（找慢脚本）
BO_SPA.debug.scroll()              // 真正在滚动的容器与位置（外壳里 window 不滚动）
BO_SPA.debug.isBusy()              // 当前是否正在换页
```

### 控制台日志怎么看

```
[bo-spa] nav /promotion.html (via link, from /bulk-adjustment.html)      ← 开始换页
[bo-spa] /promotion.html | fetched {"timings":{"fetch":0}}               ← 取到目标文档
[bo-spa] /promotion.html | content                                        ← 内容/样式已替换（此刻界面已换）
[bo-spa] /promotion.html | scripts {"timings":{"scripts":212}}            ← 目标页脚本执行完
[bo-spa] /promotion.html | ok {"timings":{"total":213,...}}               ← 完成
[bo-spa] falling back to a full load: xxx.html - <原因>                    ← 放弃换页，改整页加载
```

- 有 `nav` 没有 `ok`：**卡在中间**，8 秒后看门狗会写 `| timeout {"stuckAt":"..."}` 并自动降级为整页加载（**不会再永久卡死**）。
- 频繁 `falling back`：看原因。`target has not opted in` = 该页没打标记 → 跑第 2 节第一步。

### 症状 → 常见原因

| 症状 | 先查什么 | 常见原因 |
|---|---|---|
| 某页点了整页刷新 | `BO_SPA.debug.canSwap('该页.html')` | 不在清单里（未打标记 / 无内容帧 / 跨外壳 / agent 门户） |
| 页面"在但用不了"（按钮没反应） | `BO_SPA.report()` 的 `errors` | 元素没到 → 脚本首句 `null.onclick` 中断；或页面脚本与别的页面**全局重名**（SyntaxError） |
| 切回来数据不全 | `BO_SPA.debug.scriptTimes()` | 页面私有脚本没重跑（脚本不是可重入的）或渲染被 body 级"只做一次"标记跳过 |
| 切换时报 `Identifier 'X' has already been declared` | `node scripts/check-global-collisions.js` | 脚本没包 IIFE / 与他页重名（见第 4 节 ① ②） |
| 切换后某块骨架不渲染（如 CURRENCY 行的 `…`），刷新才出来 | `BO_SPA.debug.scriptTimes()` 里有没有那个渲染脚本 | 它是**多页共享**的运行时，“共享脚本不重跑”把它跳过了 → 让它订阅 `bo:spa:content` 重绘（第 3 节第 4 条）；盲目加 `data-bo-spa-rerun` 会叠副作用 |
| 样式不对/像上一个页面 | 对比直接打开 | 样式表未收敛（多半是页面的样式表不是静态 `<link>`，而是被脚本延迟注入） |
| 改了页面/重打了 CSS 指纹，切过去还是旧版本（硬刷新才对） | 硬刷新能变、tab 切过去不变 | 文档缓存只复用 5 秒**且每次强制重验证**（第 2 步第 2 行），样式表按 `文件名+?v=` 收敛（第 2 步第 3 行）；仍不对时看 `check-asset-pins.js` 有没有漏打的指纹 |
| 切换瞬间闪一下 | 看该页有没有首屏画布 | 缺 `data-bo-spa` / 首屏画布（重跑 `adopt-bo-spa.js`） |
| 切换时字体跳 | 侧栏样式是不是静态 `<link>` | `bo-global-quicknav.css` 由脚本延迟注入 |

### 紧急关停（无需改代码）

```js
localStorage.setItem('bo_spa', '0');   // 关掉换页，恢复整页跳转
localStorage.removeItem('bo_spa');     // 恢复
```

或让运维注入 `window.BO_SPA_OFF = true`。

---

## 8. 已知边界（不是 bug，别去改）

1. **跨外壳一律整页跳转**：BO ↔ Main、以及任何页面 → agent 门户。这是 `AGENTS.md` 明确要求（不同外壳不能统一）。
2. **首次进入某页仍需加载该页脚本**（并行预载只消除串行等待）。第二次进入几乎为 0（已执行且在清单/缓存内）。
3. **钻取页缺参数会自己跳走**：例如 `provider-detail.html` 没有 `providerCode` 会 `location.replace('main-accounting-report.html')`。直接打开也是同样行为。
4. **5 个页面外壳不标准**（在 `scripts/spa-readiness-baseline.json` 登记）：`dashboard.html`（自有 dashboard 外壳）、`currency-management.html` / `main-dashboard.html`（旧布局）、`provider-detail.html` / `contact-sync.html` / `brand-detail.html`（自有 header）。它们**可以作为换页目标**，只是不带标准顶栏。
5. **审计器的 3 类"预期内 flagged"**（见 `scripts/audit-spa-swaps.js` 末尾）：`context died`（页面自身跳转）、`ids missing`（id 在 `<template>` 里或页面启动时主动剥离）、少数字段差异。

---

## 9. 交付前自检清单

- [ ] `node scripts/adopt-bo-spa.js --check` → 0 项待补
- [ ] `node scripts/check-spa-readiness.js --write-manifest` → 清单已更新
- [ ] `node scripts/pin-spa.js` → 0 页需要重算
- [ ] `node scripts/check-global-collisions.js` → 0 冲突、0 个不可重跑的页面脚本
- [ ] `node scripts/check-shell-drift.js` → OK
- [ ] 页面脚本**整体包在 IIFE 里**且**可重复执行**（切换出去再切回来，数据/行数不翻倍）
- [ ] 页面自有的模态框 / 页脚在**帧内、body 级或帧后兄弟**位置
- [ ] 元素绑定做了 null 保护
- [ ] `node scripts/audit-spa-swaps.js 你的页面.html` → 0 flagged
- [ ] `node scripts/audit-spa-swaps.js --twice 你的页面.html` → 0 flagged（第二次进入不报错）
- [ ] 手动切 2–3 次（含从别的模块切过来、再切回去），看数据与控制台

---

## 10. Main 面板（`data-bo-shell="main"`）

Main 面板和 BO 是**两个外壳**（`AGENTS.md`：不要统一它们），但换页机制是同一套。

### 10.1 Main ↔ Main 本来就能换页

真机实测（1568×900，本地 harness）：

| 起点 | 点的是 | 结果 | 耗时 |
|---|---|---|---|
| `main-report.html` | 侧栏 | `main-dashboard.html` | 77–130ms |
| `main-merchant-detail.html` | 页面内 tab | `main-merchant-settlement.html` | 268ms |
| `main-admin-detail.html` | 页面内链接 | `main-admin-security.html` | 232ms |
| `main-provider-detail.html` | 页面内 tab | `main-provider-credentials.html` | 127ms |

结论：**Main 面板内部换页一直是通的**，慢的是下面两类。

### 10.2 Main 页面自己的链接现在也参与换页

路由只拦截这四类链接：`.report-nav a`、`.bo-module-tabs a`、`.bo-global-quicknav a`、`[data-bo-spa-link]`。
BO 的侧栏/模块 tab 天然命中前两类；**Main 页面自己的 tab、钻取链接不属于任何一类**，所以以前每点一次都是整页刷新。

现在给 **29 个 Main 页面里的 96 个站内链接**加了 `data-bo-spa-link`（目标都在 `bo-spa-manifest.js` 清单里）。
新增 Main 页面里的站内链接时，记得同样加上这个属性——否则那一条就是整页刷新。

验证（真实浏览器，点 `[data-bo-spa-link]` 后等 `bo:spa:content`）：换页 `phase:"ok"`、**0 个 JS 报错**、
目标页声明的 id 在换页后的 DOM 里 **0 缺失**、换页后夜间模式按钮仍然可用。

### 10.3 跨外壳仍然是整页跳转（这是规范，不是 bug）

BO ↔ Main 一律整页刷新：两侧 `data-bo-shell` 不同，`bo-spa.js` 的 `swapBlocker()` 直接拒绝
（fail-closed），因为两个外壳的顶栏、侧栏、画布和样式表是两套。`AGENTS.md` 明确写了不许统一。
所以「从 BO 点进 Main 面板」永远会刷新一次，这是设计，不要试图绕。

### 10.4 换页会替换整个顶栏——所以绑定必须是委托的

`bo-spa.js` 在每次换页的最后，会用目标页的 header **克隆**替换 `.report-main > .report-topbar`。
克隆出来的 `#boThemeToggle` 是全新元素，**旧元素的监听不会跟过来**。

后果（owner 报的「切换页面时 我的夜间模式点不了」）：换页后按钮在、但点了没反应。
实测 `index.html → menu-management.html`：换页前两次点击正常翻转，换页后 `bound=-`、连点两次
`data-bo-theme` 一直是 `light`。

修法：

- `assets/js/bo-theme.js` —— 点击改成 **document 级委托**（`closest('#boThemeToggle,.bo-theme-btn')`），
  并在 `window.__boThemeDelegateBound` 上只注册一次。委托是 `reports.js` 对 `[data-open-sidebar]`
  早就用的做法，同时也避免了这个文件被重跑时绑两份（两份监听 = 一次点击翻两次 = 又像坏了）。
- `assets/js/main-dashboard.js` —— 它自带了一份重复的 toggle 代码（`main-dashboard.html` 不加载
  `bo-theme.js`），同样改成委托 + 一次性守卫。
- `assets/js/bo-spa.js` —— 换完 header 后调用 `BO_THEME.initThemeToggle()`：**状态**（图标 / aria /
  深色时该显示月亮）是这一步的职责，克隆出来的按钮默认是浅色态。

> 写页面脚本的人注意：**任何绑在顶栏元素上的监听，换页后都会失效**。要么用委托，要么放进
> `SHARED_REPLAY` 白名单（见第 3 节第 11 步）。主题按钮就是踩了这个坑。

### 10.5 换页后残留的页面级 `document` 监听会报错

换页只替换内容帧，**`document` 上的监听不会消失**。页面脚本里常见的
`document.addEventListener('click', e => { if(!e.target.closest('.ref-range-wrap')) $('reportRangePicker').classList.remove('show') })`
在离开该页后继续存在，`$()` 取到 `null` → 之后**每一次点击**都会抛
`Cannot read properties of null (reading 'classList')`（实测 `main-report.js:41`、
`main-merchant-report.js:431`）。

它不会打断别的监听（每个监听独立），但控制台会一直脏。属于第 4 节第 ④ 条「元素查找要做 null 保护」，
按这条修即可。

### 10.6 换页后侧栏要把「当前所在模块」那一行点亮

owner 报的：「在 transaction 页面 我点 Win/Lose Adjustment / Bonus Adjustment / Bank Deposit Usage，
sidebar 的 transaction 不会 active 着」。实测是两个**独立**缺陷，各自都会把那一行弄丢：

**缺陷 A —— 模块页在自己的菜单里没有行。** 模块组的侧栏行是**一条直链**（指向模块的第一个页面），而
高亮是拿**当前文件名**去和组内菜单行比对的。`bulk-adjustment.html` 的 Win/Lose 与 Bonus 两个入口来自
页面自己的 tab 行，数据库里没有任何菜单行指向它，所以比对全部落空 → 整条侧栏**没有任何一行**是 active。

修法（`auth.js` → `renderSidebar`）：原来的匹配逻辑抽成 `resolvePrimary(file)`，先按当天文件找；**一个都没
匹配到时**，再拿这个页面所属模块的 **anchor 页**（`MODULE_ANCHORS`，模块组本来就"必须拥有 anchor"才会被
认领）重找一次。只在"什么都没匹配到"时兜底，所以任何本来就有行的页面，亮的行和以前**完全一样**。

实测（本地 harness，同一套菜单）：`bulk-adjustment.html` 修复前 `active row(s): NONE`，修复后
`nav-group-btn:"Wallet Management"`（owner 的库里就是 `Transaction`）。

**缺陷 B —— 换页时侧栏如果被重建，`activateRail` 会先把高亮清掉，然后因为找不到目标什么都不点亮。**
`bo-spa.js` 的 `activateRail()` 原本这样：找出 href 等于目标文件的 rail 链接；找不到就退回"换页前那一个
active 元素"（`nav.contains(prev)`）；**然后无条件清掉所有 `.active`**。

而好几个页面脚本在 boot 时会调用 `BO_AUTH.renderSidebar()`（`bank-deposit-usage.js:309`、
`bulk-member-operation.js` 等），它会重写 `nav.innerHTML` → 换页前捕获的那个节点**被摘掉**了，
`nav.contains(prev)` 变 false → 退回失败 → 清空之后再无目标 → **整条侧栏空白**。

实测证据：换页前给 `.report-nav` 和那个 active `<a>` 打标记，换页后 `.report-nav` 节点还在（`true`），
但标记过的那个 `<a>` 已经不在 DOM 里（`false`）——即行被重建了。

修法（`bo-spa.js`）：
1. `prev` 已经脱离 DOM 时，改按**它携带的 key 重新认行**（先 `data-menu-key`，再 `href`），不再依赖节点同一性；
2. **找不到目标就直接 return，不清空**——要么它本来就亮着正确的行，要么重建已经按新 URL 算好了，
   在这里清掉正是"什么都没有"的来源。

实测：`member-deposit.html → bank-deposit-usage.html`（点模块 tab）换页后
`nav-group-btn "Wallet Management" ... active [ACTIVE]` 保持不变；跨模块时高亮正确**移动**
（`index.html → promotion.html`：Wallet Management 灭、Bonus Management 亮）。

> 排查手法：想知道"侧栏该亮哪一行"，直接打开页面比对比对，别只看换页——**直接打开**和**换页进入**是两条
> 不同的代码路径（`renderSidebar` vs `activateRail`），这次两个 bug 分属其中一条。
