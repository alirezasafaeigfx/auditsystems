import { handleOrderCheckoutRequest } from "../../../lib/order-checkout-handler";

export async function POST(request: Request) {
  return handleOrderCheckoutRequest(request, { metricPath: "/api/orders" });
}
