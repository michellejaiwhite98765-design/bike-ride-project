import { ratingService } from "../services/rating.service.js";
import { created } from "../utils/apiResponse.js";

export const ratingController = {
  async create(req, res) {
    const rating = await ratingService.create(req.user.id, req.body);
    created(res, rating, "Rating submitted");
  },
};
