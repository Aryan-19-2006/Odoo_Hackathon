const service = require('../shared/service');

module.exports = {
  listTemplates: service.listTemplates,
  getTemplate: service.getTemplate,
  createTemplate: service.createTemplate,
  updateTemplate: service.updateTemplate,
  deleteTemplate: service.deleteTemplate,
  createQuotation: service.createQuotation,
  listQuotations: service.listQuotations,
  getQuotation: service.getQuotation,
  updateQuotation: service.updateQuotation,
  confirmQuotation: service.confirmQuotation
};
