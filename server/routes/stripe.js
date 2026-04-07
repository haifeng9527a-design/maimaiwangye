const Stripe = require("stripe");
const db = require("../db");
const { requireEnv } = require("../utils");

function getStripeClient() {
  const secretKey = requireEnv("STRIPE_SECRET_KEY", "");
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

async function stripeWebhookHandler(req, res) {
  const stripe = getStripeClient();
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET", "");

  if (!stripe || !webhookSecret) {
    return res.status(400).send("Stripe webhook is not configured.");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).send("Missing Stripe signature.");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderNo = session.metadata?.orderNo;
        if (orderNo) {
          await db.updateOrderByNo(orderNo, {
            payment_status: "paid",
            order_status: "confirmed",
            payment_reference: session.payment_intent || session.id
          });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        const orderNo = session.metadata?.orderNo;
        if (orderNo) {
          await db.updateOrderByNo(orderNo, {
            payment_status: "paid",
            order_status: "confirmed",
            payment_reference: session.payment_intent || session.id
          });
        }
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object;
        const orderNo = session.metadata?.orderNo;
        if (orderNo) {
          await db.updateOrderByNo(orderNo, {
            payment_status: event.type === "checkout.session.expired" ? "expired" : "failed",
            order_status: "pending",
            payment_reference: session.payment_intent || session.id || ""
          });
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    return res.status(500).send(`Webhook processing failed: ${error.message}`);
  }
}

module.exports = {
  stripeWebhookHandler
};
