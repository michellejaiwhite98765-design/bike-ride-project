import { locationService } from "../services/location.service.js";
import { ok } from "../utils/apiResponse.js";

export const locationController = {
  async resolveSharedLink(req, res) {
    const result = await locationService.resolveSharedLink(req.body.url);
    ok(res, result, "Link resolved");
  },
};
