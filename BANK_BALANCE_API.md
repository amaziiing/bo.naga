# Bank Balance API — 需求说明（给后端同事）

本文档说明 Deposit Approval / Withdraw Approval 页面上 **Bank Quick Selector + Balance
Summary** 这个新组件需要的数据，以及当前后端接口的缺口。

页面：`member-deposit.html`（`?tab=deposit` / `?tab=withdraw` / `?tab=all`）
前端文件：`assets/js/bo-bank-selector.js`（组件）、`assets/js/member-deposit.js`、
`assets/js/member-withdraw.js`

---

## 1. 这个 UI 现在显示什么

点击某一家银行后，在该行下方展开一条摘要条：

```
Hong Leong Bank                          30/09/2026 · Pending      Clear
Start                Deposit                Balance
RM 10,000.00         RM 5,250.00            RM 15,250.00
```

| 格子 | 现在的来源 | 是否真实 API 值 |
|---|---|---|
| **Balance** | `/admin/payment-method/list` 返回的 `bankUsage` | ✅ 真值（但语义待确认，见 §3） |
| **Deposit** | 该银行在当前筛选（日期 + 状态 + 关键词）下、**表格里那些行**的金额之和 | ✅ 真值（前端汇总） |
| **Start** | `Balance − Deposit`（前端反推） | ⚠️ 派生值，不是后端给的期初余额 |

Withdraw 页同理，中间格换成 `Withdraw`，恒等式为 `Start − Withdraw = Balance`
（因为 Withdraw 的审批弹窗写明：**APPROVED DEPOSIT = + USAGE；APPROVED WITHDRAWAL = − USAGE**，
所以提现是从余额里扣的）。

**尚未有后端值的地方只有 `Start`。** 前端目前用 `Balance − 本期流入` 反推，好处是恒等式
`Start + Deposit = Balance` 严格成立、数字可自洽；代价是它假设“本期除了这些存款之外没有别的
资金变动”。

---

## 2. 今天前端实际调用的接口（便于复现）

| 用途 | 请求 |
|---|---|
| 银行列表 + 余额 | `GET /admin/payment-method/list`（无参数）→ 读 `bankUsage` |
| 表格数据 | `GET /admin/member-deposit/list?keyword&status&dateFrom&dateTo&page&size` |
| 表格数据（Withdraw） | `GET /admin/member-withdraw/list?keyword&status&dateFrom&dateTo&page&size` |
| 待审角标 | 同上，按日期范围取回后在前端按 `status=PENDING` 计数 |

注意：**`/admin/member-deposit/list` 与 `/admin/member-withdraw/list` 目前都没有 bank 参数**。
选中某家银行时，前端只能把当前筛选条件下的**全部行**下载下来，再按银行过滤（见 §5 请求 4）。

---

## 3. 请求 1（必须确认）：`bankUsage` 到底是什么

`bankUsage` 现在只在 Withdraw 流程里被使用，从代码可以确定的行为是：

- 审批弹窗把它显示成 **`Current Bank Usage`**，并显示 `Withdrawal Deduction`（负号）与
  `Remaining After Withdrawal`；
- `usage <= 0` 或 `提现额 > usage` 时**直接拒绝审批**（"this bank has 0.00 available Bank Usage
  and cannot fund a withdrawal"）；
- 弹窗警告文案原文：**"Approved deposit = + usage; approved withdrawal = - usage."**

据此前端把它当作**该银行当前可用资金（余额）**。请确认：

1. `bankUsage` 的准确定义？是「银行账户当前余额/可用资金」还是「相对 `maxAmount` 的剩余额度」？
2. 它是否等于 **期初余额 + 已核准存款 + 人工入账 − 已核准提现 − 人工出账**？具体包含哪些来源
   （`ADMIN_DEPOSIT` / `ADMIN_WITHDRAW` 这类人工 ledger 记录算不算）？
3. 它是**实时快照**还是按某个时间点计算的？有没有时区/结算日的影响？
4. `/admin/member-wallet/bank-options` 返回的每 bank `usage` 与它是同一个值吗？
5. 若该字段实际不是余额语义，请给出正确字段名，并保留 `bankUsage` 现有的提现校验用途。

---

## 4. 请求 2（推荐、最小改动）：让 payment-method 列表给出余额与期初

```
GET /admin/payment-method/list?dateFrom=2026-09-29&dateTo=2026-09-29
```

在现有每个 method 对象上增加（或确认已存在）以下字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `balance` | decimal(18,2) | 该银行**当前**可用资金（即 `bankUsage` 的正式命名，若两者同值可直接复用） |
| `openingBalance` | decimal(18,2) | **`dateFrom` 当日开始时刻**的余额（期初）。无 `dateFrom` 时可省略 |
| `depositTotal` | decimal(18,2) | 该区间内该银行的入账合计（可选，若提供则前端不再自行汇总） |
| `withdrawTotal` | decimal(18,2) | 该区间内该银行的出账合计（可选） |
| `pendingDepositCount` | integer | 该银行**待审**存款笔数（可选，见请求 4） |

只给 `openingBalance` + `balance` 也足够：前端会显示真实期初，不再反推。

---

## 5. 请求 3（更完整，若排期允许）：银行余额汇总接口

```
GET /admin/bank-balance/summary?dateFrom=2026-09-29&dateTo=2026-09-29
```

```json
{
  "status": "success",
  "data": {
    "range": { "from": "2026-09-29", "to": "2026-09-29", "timezone": "Asia/Kuala_Lumpur" },
    "banks": [
      {
        "paymentMethodId": 12,
        "bankName": "Hong Leong Bank",
        "accountNumber": "1234567890",
        "currency": "MYR",
        "openingBalance": 10000.00,
        "depositTotal": 5250.00,
        "withdrawTotal": 400.00,
        "manualAdjustTotal": -100.00,
        "balance": 15250.00,
        "pendingDepositCount": 3
      }
    ]
  }
}
```

约定：

- `balance = openingBalance + depositTotal − withdrawTotal + manualAdjustTotal`
  （若人工入账/出账已含在 deposit/withdraw 里，请 `manualAdjustTotal` 置 0）；
- 金额一律 `decimal(18,2)`，不要四舍五入后的整数，也不要字符串加逗号；
- `paymentMethodId` 与 `/admin/payment-method/list` 的 `id` 必须一致（前端用它关联表格行）；
- 无数据时返回 `0.00` 还是 `null` 请明确，并在字段缺失时**不要**补 0 冒充真实余额
  （前端在字段缺失时显示 `—`，这是刻意的：宁可空着也不显示假数字）；
- `dateFrom`/`dateTo` 的时区语义请与 `/admin/member-deposit/list` 保持一致（后者现在接受
  `YYYY-MM-DD`）。

---

## 6. 请求 4（可选但很值得做）：给列表接口加 bank 过滤

```
GET /admin/member-deposit/list?paymentMethodId=12&status=PENDING&dateFrom=&dateTo=&page=1&size=20
GET /admin/member-withdraw/list?paymentMethodId=12&...
```

现状：选中某家银行时，前端必须把当前筛选条件下的全部行下载完再按银行过滤（列表接口没有 bank
参数），行数多时明显变慢。加上 `paymentMethodId`（做精确匹配，且与
`approvedPaymentMethodId ?? paymentMethodId` 的既有归属规则一致）后，表格就能服务端分页。

同一响应里若能顺带给出该银行的合计（`depositTotal` / `pendingDepositCount`），前端连“下载全量”
这一步都可以省掉。

---

## 7. 前端会怎么用（后端就位后无需再改前端）

1. `openingBalance` 存在 → `Start` 直接显示它（不再反推），并按
   `Balance = Start + Deposit − Withdraw` 校验/展示；
2. `paymentMethodId` 过滤参数上线 → 表格按银行服务端分页，删除前端的全量下载逻辑；
3. 字段缺失 → 对应格子保持 `—`，绝不用 0 或推测值填充。

如有疑问可以直接找前端这边确认字段名与语义；`bankUsage` 的确认（§3）是唯一阻塞项，其余都是
可选优化。
