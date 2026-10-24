import crypto from 'node:crypto';
import { BASE_URL, WHOP } from './config.js';

const apiBase = () => (WHOP.sandbox ? 'https://sandbox-api.whop.com/api/v1' : 'https://api.whop.com/api/v1');

async function call(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(apiBase() + pathname, {
    method,
    headers: {
      Authorization: `Bearer ${WHOP.apiKey}`,
      'Content-Type': 'application/json',
      'Api-Version-Date': '2026-07-01',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Whop ${method} ${pathname} -> ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

// One checkout per order: an inline one-time plan at the current (agent-set) price,
// tagged with the order id so the payment webhook can find the order again.
export async function createCheckout({ order, gig }) {
  const plan = {
    company_id: WHOP.companyId,
    currency: 'usd',
    plan_type: 'one_time',
    initial_price: order.price,
    title: `${gig.title} · order ${order.id}`,
    ...(WHOP.productId
      ? { product_id: WHOP.productId }
      : { product: { external_identifier: `capygigs-${gig.id}`, title: `CapyGigs · ${gig.title}` } }),
    ...(WHOP.planVisibility ? { visibility: WHOP.planVisibility } : {}),
  };
  const cfg = await call('/checkout_configurations', {
    method: 'POST',
    body: {
      mode: 'payment',
      plan,
      metadata: { order_id: order.id, gig: gig.id },
      redirect_url: `${BASE_URL}/o/${order.id}?from=checkout`,
    },
  });
  let url = cfg.purchase_url;
  if (url?.startsWith('/')) url = `https://whop.com${url}`;
  return { checkoutId: cfg.id, planId: cfg.plan?.id, purchaseUrl: url };
}

export const getPayment = (id) => call(`/payments/${encodeURIComponent(id)}`);

// Standard Webhooks verification, as documented by Whop: HMAC-SHA256 over
// "{webhook-id}.{webhook-timestamp}.{raw body}" keyed with the ws_... secret as-is.
export function verifyWebhook(rawBody, headers) {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatures = headers['webhook-signature'];
  if (!id || !timestamp || !signatures) throw new Error('missing webhook headers');
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('webhook timestamp outside tolerance');
  const expected = Buffer.from(
    crypto.createHmac('sha256', WHOP.webhookSecret).update(`${id}.${timestamp}.${rawBody}`).digest('base64'),
  );
  const valid = signatures.split(' ').some((entry) => {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  if (!valid) throw new Error('invalid webhook signature');
  return { id, event: JSON.parse(rawBody) };
}
