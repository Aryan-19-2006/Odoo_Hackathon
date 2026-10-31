const express = require('express');
const { Invoice } = require('../invoices/model');
const { Payment } = require('../payments/model');
const { requirePermission, asyncRoute } = require('../../middleware/access');

const router = express.Router();

router.get('/billing/summary', requirePermission('billing:read'), asyncRoute(async (_req, res) => {
  const [currencies, queuedPayments] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: { $in: ['open', 'paid'] } } },
      {
        $group: {
          _id: '$currency',
          invoiceCount: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          openCount: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
          openAmount: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, '$totalAmount', 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, currency: '$_id', invoiceCount: 1, paidCount: 1, openCount: 1, paidAmount: 1, openAmount: 1 } }
    ]),
    Payment.countDocuments({ status: 'pending' })
  ]);
  res.json({ currencies, pendingPayments: queuedPayments });
}));

module.exports = router;