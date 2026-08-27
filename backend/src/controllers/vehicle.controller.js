import { vehicleService } from "../services/vehicle.service.js";
import { ok, created } from "../utils/apiResponse.js";

export const vehicleController = {
  async create(req, res) {
    const vehicle = await vehicleService.create(req.user.id, req.body);
    created(res, vehicle, "Vehicle verified and added");
  },

  async list(req, res) {
    const vehicles = await vehicleService.listMine(req.user.id);
    ok(res, vehicles);
  },

  async getById(req, res) {
    const vehicle = await vehicleService.getById(req.user.id, req.params.id);
    ok(res, vehicle);
  },

  async update(req, res) {
    const vehicle = await vehicleService.update(req.user.id, req.params.id, req.body);
    ok(res, vehicle, "Vehicle updated");
  },

  async uploadRcDocument(req, res) {
    const vehicle = await vehicleService.uploadRcDocument(req.user.id, req.params.id, req.file);
    ok(res, vehicle, "RC document uploaded");
  },

  async verify(req, res) {
    const result = await vehicleService.verify(req.user.id, req.params.id);
    ok(res, result, result.cached ? "Vehicle verification already completed" : result.rejected ? "Vehicle verification failed" : "Vehicle verified");
  },

  async remove(req, res) {
    await vehicleService.remove(req.user.id, req.params.id);
    ok(res, null, "Vehicle removed");
  },
};
