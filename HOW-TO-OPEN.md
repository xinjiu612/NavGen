# 如何访问这个网站

这台机器是 `hxj612`，有两个非本机地址：

| 地址 | 用途 |
|---|---|
| `127.0.0.1` | 本机（推荐，不受系统代理影响） |
| `192.168.68.140` | 局域网 Wi-Fi |
| `192.168.124.3` | ZeroTier 虚拟局域网 |

## 为什么之前打不开

不是端口转发的问题，是**服务本身没了**。原因有两个：

1. **重启**：我之前是用 DSH 的后台任务起的服务器，机器一重启就没了。
2. **DSH 沙箱会回收进程**：我这边执行的命令一旦结束，它派生的所有进程（包括 `setsid` 脱离的）都会被回收。所以**服务器必须由你自己在终端里启动**，我起的只能撑到会话结束。

另外你机器上有系统代理：

```
http_proxy=http://127.0.0.1:7890
no_proxy=localhost,127.0.0.1,::1
```

`no_proxy` 里**只有 localhost**，不含 `192.168.*`。所以用 `192.168.68.140:5299` 访问时，请求会被丢给 7890 代理，返回 **502**。要么用 `127.0.0.1`，要么把网段加进代理绕过列表。

---

## 方案 A：你就在这台机器前（最简单）

```bash
cd /home/hxj/Paper/work/icra_2027/website/v2
./serve.sh start
```

然后浏览器打开 **http://127.0.0.1:5299/**

`serve.sh` 会自动：装依赖（如果没有）→ 构建（如果 `dist` 过期）→ 后台起服务 → 打印所有可用地址。

其他子命令：

```bash
./serve.sh status      # 看是否在跑、有哪些地址
./serve.sh stop        # 停掉
./serve.sh restart     # 重启
./serve.sh log         # 跟踪日志
./serve.sh dev         # 前台起开发服务器（改代码自动热更新）
```

v1 在 `../website/serve.sh`，默认端口 `5199`。

## 方案 B：从另一台电脑用 SSH 端口转发

在你**笔记本**上执行（不是在这台机器上）：

```bash
ssh -N -L 5299:127.0.0.1:5299 hxj@192.168.68.140
```

`-N` 表示只转发不开 shell。保持这个终端开着，然后在笔记本浏览器打开
**http://127.0.0.1:5299/** —— 笔记本的 5299 就接到了这台机器上。

想同时转发 v1 和 v2：

```bash
ssh -N -L 5299:127.0.0.1:5299 -L 5199:127.0.0.1:5199 hxj@192.168.68.140
```

## 方案 C：VS Code / Cursor Remote-SSH

连上这台机器后，打开 **PORTS（端口）** 面板 → **Forward a Port** → 输入 `5299`。
编辑器会自动在本地建一条隧道，点它给的 `localhost:5299` 链接即可。
这个方式重启编辑器后需要重新转发，但比手敲命令省事。

## 方案 D：不转发，局域网直连

`serve.sh` 已经绑的是 `0.0.0.0`，所以同一 Wi-Fi 下的手机 / 平板 / 另一台电脑
直接打开 **http://192.168.68.140:5299/** 就行。走 ZeroTier 的话是
**http://192.168.124.3:5299/**（前提是那台设备也在这个 ZeroTier 网络里）。

⚠️ 如果那台设备的系统代理没把 `192.168.*` / `192.168.124.*` 排除掉，会出现
502 或超时。在系统代理设置里加上绕过列表，或者改用方案 B 的隧道。

---

## 方案 E：开机自启（一劳永逸）

装一个 systemd **用户**服务，以后重启电脑自动起来，不用开终端：

```bash
cd /home/hxj/Paper/work/icra_2027/website/v2
./deploy/install-service.sh install
```

它会自动把 unit 文件里的路径替换成这台机器的真实路径，启用服务，并打开
`linger`（这样不登录也会启动）。之后：

```bash
./deploy/install-service.sh status      # 看状态
./deploy/install-service.sh uninstall   # 卸载
systemctl --user restart paper-site-v2  # 手动重启
journalctl --user -u paper-site-v2 -f   # 看日志
```

装好之后开机直接访问 http://127.0.0.1:5299/ 即可。

> 注意：服务跑的是 `dist/`（生产构建）。改了源码要先 `npm run build`，
> 再 `systemctl --user restart paper-site-v2`。想边改边看就用 `./serve.sh dev`。

---

## 排查清单

```bash
# 1. 服务在不在
./serve.sh status
ss -ltnp | grep 5299

# 2. 本机能不能通（绕过代理）
curl --noproxy '*' -I http://127.0.0.1:5299/

# 3. 局域网能不能通
curl --noproxy '*' -I http://192.168.68.140:5299/

# 4. 端口被占用了就换一个
./serve.sh start 5399
```

看到 **502** 基本都是代理问题；看到 **connection refused** 才是服务没起来。
