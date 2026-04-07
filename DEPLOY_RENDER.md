# Render 部署说明

## 1. 准备代码仓库

先把当前项目上传到 GitHub。

## 2. 在 Render 创建 Web Service

1. 登录 Render
2. 点击 `New +`
3. 选择 `Web Service`
4. 连接你的 GitHub 仓库
5. 选择当前项目

如果 Render 识别到 `render.yaml`，可直接按默认配置创建。

## 3. 基础配置

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

## 4. 必填环境变量

在 Render 的 Environment 里填写这些值：

```env
BASE_URL=https://你的-render-域名.onrender.com
JWT_SECRET=换成你自己的随机长字符串
ADMIN_USERNAME=你的后台账号
ADMIN_PASSWORD=你的后台密码

SUPABASE_URL=https://qoguyweyqxpdbbsgdhab.supabase.co
SUPABASE_ANON_KEY=你的 Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase secret key

STRIPE_SECRET_KEY=你的 Stripe secret key
STRIPE_WEBHOOK_SECRET=你的 Stripe webhook secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=haifeng9527a@gmail.com
SMTP_PASS=你的 Gmail 应用专用密码
MAIL_FROM=haifeng9527a@gmail.com
```

## 5. Stripe 线上回调

上线后去 Stripe Dashboard：

1. `Developers` -> `Webhooks`
2. 新建 endpoint：

```text
https://你的-render-域名.onrender.com/api/stripe/webhook
```

3. 勾选事件：
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`

4. 保存后复制 `whsec_...`
5. 回 Render 更新：

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 6. 上线后检查

上线完成后先检查这些地址：

- 首页：`https://你的-render-域名.onrender.com`
- 下单页：`https://你的-render-域名.onrender.com/checkout`
- 后台：`https://你的-render-域名.onrender.com/admin`
- 健康检查：`https://你的-render-域名.onrender.com/api/health`

## 7. 首次上线建议

- 先用 Stripe 测试模式验证
- 先改掉默认后台账号密码
- 确认邮件通知正常后，再切正式支付
