# Stripe Webhook 配置说明

## 本地联调

1. 确保本地服务运行在：
   - `http://localhost:3000`

2. 在 `.env` 中填写：

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

3. 安装 Stripe CLI 并登录后，转发 Webhook 到本地：

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

4. Stripe CLI 会输出一串 `whsec_...`，把它填进：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

5. 重启服务后，再创建测试订单并完成支付。

## 线上配置

1. 在 Stripe Dashboard 中进入：
   - `Developers` -> `Webhooks`

2. 新建 Endpoint：

```text
https://你的域名/api/stripe/webhook
```

3. 勾选这些事件：
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`

4. 保存后复制签名密钥，写入：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

5. 线上重启服务。

## 当前系统行为

- `Stripe Checkout` 创建订单后会先写入数据库
- 支付完成后，Webhook 会把订单状态更新为：
  - `payment_status = paid`
  - `order_status = confirmed`
- 支付失败或会话过期时，会把支付状态更新为 `failed` 或 `expired`

## 测试卡

```text
4242 4242 4242 4242
```

其余资料可填任意有效测试值。
