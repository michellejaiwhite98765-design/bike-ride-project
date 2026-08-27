import { paymentService } from "../services/payment.service.js";
import { ok } from "../utils/apiResponse.js";

export const paymentController = {
  async createOrder(req, res) {
    const order = await paymentService.createOrder(req.user.id, req.body.bookingId);
    ok(res, order, "Payment order created");
  },

  async verify(req, res) {
    const result = await paymentService.verifyPayment(req.user.id, req.body);
    ok(res, result.booking, result.alreadyProcessed ? "Payment already verified" : "Payment verified");
  },

  async webhook(req, res) {
    const signature = req.headers["x-webhook-signature"];
    await paymentService.handleWebhook(req.body.toString("utf8"), signature);
    res.status(200).json({ success: true });
  },
};
