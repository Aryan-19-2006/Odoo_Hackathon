const service = require('../shared/service');

module.exports = {
  createSubscription: service.createSubscription,
  updateSubscription: service.updateSubscription,
  createQuotationFromSubscription: service.createQuotationFromSubscription,
  listSubscriptions: service.listSubscriptions,
  getSubscriptionDocument: service.getSubscriptionDocument,
  listDueForBilling: service.listDueForBilling,
  transitionSubscription: service.transitionSubscription,
  recordBilling: service.recordBilling,
  getSubscriptionHistory: service.getSubscriptionHistory
};
