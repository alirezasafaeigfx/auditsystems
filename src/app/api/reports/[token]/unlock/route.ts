import { handleOrderCheckoutRequest } from "../../../../../lib/order-checkout-handler";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return handleOrderCheckoutRequest(request, {
    metricPath: "/api/reports/[token]/unlock",
    tokenOverride: token,
  });
}
