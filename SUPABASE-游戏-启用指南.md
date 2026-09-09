# 联机收益管理游戏 · 启用指南

多人实时对战沙盘（对抗 Showdown + 协作 Co-op）。本文件说明如何在 Supabase 开启实时能力并建表，使 `games/arena.html` 可玩。

---

## 一、开启 Realtime（关键，漏了就收不到广播）

在 Supabase 后台一次性打开：

1. **Database → Replication**，确认已开启 Realtime（默认开）。
2. 把三张表加入实时发布（Postgres Changes 不是本游戏必需，但 Presence/Broadcast 需要表在 `supabase_realtime` 发布里才能用 RLS 鉴权）：
   ```sql
   alter publication supabase_realtime add table public.game_rooms;
   alter publication supabase_realtime add table public.game_players;
   alter publication supabase_realtime add table public.game_rounds;
   ```
   > 若提示 `already a member of publication`，忽略即可。
3. **Project Settings → API → Realtime**：确认 Allowed Origins 含你的站点域名（GitHub Pages：`https://hrma-city.github.io`）。本地联调时再加 `http://localhost:xxxx`。

本游戏实时部分用 **Presence（在线状态）+ Broadcast（出价/回合/结果广播）**，不走 Postgres Changes 订阅，所以第 2 步仅为满足 RLS 通道；核心同步不依赖 CDC。

---

## 二、建表（一次性）

Supabase → SQL Editor → 粘贴 `SUPABASE-游戏-schema.sql` → Run（幂等）。

会创建：

| 对象 | 作用 |
|------|------|
| `game_rooms` | 房间（模式/房主/状态/回合/配置） |
| `game_players` | 房间成员与累计得分 |
| `game_rounds` | 每回合出价与结果（复盘用） |
| 视图 `game_room_view` | 大厅列表聚合（匿名可读） |
| `tick_room(room_id)` | 无操作占位，预留给未来服务端回合机 |

RLS：房间成员可读写自己所在房间；大厅视图匿名可读。

---

## 三、玩法与架构

**大厅**（`arena.html` 默认视图）
- 选择模式、回合数 → 创建房间（你成为房主）。
- 或输入 6 位房间号加入。
- 大厅列表来自 `game_room_view`（status 为 lobby/playing 的房间）。

**对抗沙盘 Showdown**
- 每人独立经营一家虚拟酒店，面对同一条需求曲线 `出租率 = a − b·ADR`。
- 每回合在 18 秒内报一个 ADR（200–1200），系统算 `RevPAR = ADR × 出租率`，累计 RevPAR 排名。
- 收益管理核心：曲线内部存在最优定价，比谁更接近最优。

**协作沙盘 Co-op**
- 全员各报建议价，系统取**中位数**作统一售价，全员共享该 RevPAR。
- 合力把 RevPAR 推过目标线（目标线由 config 决定，默认 a、b 给定下的乐观值）。

**回合机（MVP 简化）**
- 结算由**房主客户端**权威：收集本回合并广播的出价 → 算结果 → 写库 + 广播。
- 非房主只负责出价与接收广播，不结算（避免分叉）。
- 房主断线则本局卡住（后续可升级为 DB/Edge Function 服务端回合机，`tick_room` 已预留）。

---

## 四、联调步骤

1. 两个浏览器（或一个隐身窗口）用**两个不同账号**登录 `https://hrma-city.github.io/login.html`。
2. A 进入 `games/arena.html` → 创建「对抗沙盘」房间，复制房间号。
3. B 进入 `arena.html` → 输入房间号加入。
4. A 点「开始游戏」→ 双方每回合出价 → 实时战报与累计榜更新 → 到回合数后弹出最终排名。
5. 刷新大厅可见该房间；结束后从列表消失。

---

## 五、上线检查清单

- [ ] Realtime 已对三张表开启、Allowed Origins 含站点域名
- [ ] `SUPABASE-游戏-schema.sql` 已 Run
- [ ] `arena.html` / `assets/js/rm-arena.js` / `assets/css/arena.css` 已部署
- [ ] 两个账号实测一局对战 + 一局协作

## 六、已知边界（MVP）

- 房主为权威，断线即停；胜在零后端依赖、立刻可玩。
- 出价窗口固定 18 秒，无中途加人（下一局重建房间即可）。
- 未做反作弊（房主可改结算），社区内测场景可接受；公测前建议改用 Edge Function 回合机。
