const service = require('../shared/service');

module.exports = {
  listPlans: service.listPlans,
  getPlan: service.getPlan,
  createPlan: service.createPlan,
  updatePlan: service.updatePlan,
  deletePlan: service.deletePlan
};
