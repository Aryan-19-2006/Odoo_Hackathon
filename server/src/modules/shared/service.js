const mongoose = require('mongoose');
const {
  Product,
  ProductVariant,
  Plan,
  QuotationTemplate,
  Quotation,
  Subscription,
  SubscriptionItem,
  SubscriptionHistory,
  SubscriptionBillingEvent
} = require('./models');
const { addBillingPeriod } = require('../subscriptions/billingDates');

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

function fail(status, message) {
  throw new ServiceError(status, message);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function transaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function paging(query, filter) {
  const { page, limit } = query;
  return { page, limit, skip: (page - 1) * limit, filter };
}

async function paged(model, query, filter, sort = { createdAt: -1 }) {
  const { page, limit, skip } = paging(query, filter);
  const [results, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(filter)
  ]);
  return { results, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

function activeAvailability(plan, date = new Date()) {
  if (!plan || plan.status !== 'active') fail(404, 'Active plan not found');
  if (plan.availableFrom && date < plan.availableFrom) fail(422, 'The plan is not available yet');
  if (plan.availableTo && date > plan.availableTo) fail(422, 'The plan is no longer available');
}

async function validatePlanProducts(plan, lines) {
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (totalQuantity < plan.minQuantity) {
    fail(422, `This plan requires a minimum quantity of ${plan.minQuantity}`);
  }
  const allowedProducts = new Set(plan.productIds.map((id) => id.toString()));
  const productIds = [...new Set(lines.map((line) => line.productId))];
  if (productIds.some((id) => !allowedProducts.has(id))) {
    fail(422, 'One or more products are not included in the selected plan');
  }
}

async function priceLines(lines, plan, session) {
  await validatePlanProducts(plan, lines);
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await Product.find({ _id: { $in: productIds }, status: 'active' }).session(session).lean();
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  if (productMap.size !== productIds.length) fail(422, 'One or more products are unavailable');

  const variantIds = [...new Set(lines.filter((line) => line.variantId).map((line) => line.variantId))];
  const variants = variantIds.length
    ? await ProductVariant.find({ _id: { $in: variantIds }, status: 'active' }).session(session).lean()
    : [];
  const variantMap = new Map(variants.map((variant) => [variant._id.toString(), variant]));

  return lines.map((line) => {
    const product = productMap.get(line.productId);
    const variant = line.variantId ? variantMap.get(line.variantId) : null;
    if (line.variantId && (!variant || variant.product.toString() !== product._id.toString())) {
      fail(422, `Variant is not available for product "${product.name}"`);
    }

    const unitPrice = money(product.salesPrice + (variant ? variant.priceDelta : 0));
    const subtotal = money(unitPrice * line.quantity);
    const taxAmount = money(subtotal * line.taxRate / 100);
    return {
      productId: product._id,
      variantId: variant ? variant._id : null,
      productName: product.name,
      variantName: variant ? variant.name : null,
      quantity: line.quantity,
      unitPrice,
      taxId: line.taxId || null,
      taxRate: line.taxRate || 0,
      taxAmount,
      lineTotal: money(subtotal + taxAmount)
    };
  });
}

function lineItemsTotal(lines) {
  return money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
}

function isEarlyClose(expiryDate, now) {
  return !expiryDate || now < expiryDate;
}

function dueBillingFilter({ asOf, planId, frequency, matchingPlanIds = [] }) {
  const filter = {
    status: 'active',
    nextBillingDate: { $lte: asOf }
  };
  if (planId) filter.planId = planId;

  const conditions = [
    { $or: [{ expiryDate: null }, { expiryDate: { $gt: asOf } }] }
  ];
  if (frequency) {
    conditions.push({
      $or: [
        { billingFrequency: frequency },
        { billingFrequency: null, planId: { $in: matchingPlanIds } }
      ]
    });
  }
  filter.$and = conditions;
  return filter;
}

async function createSubscriptionRecord({
  customerId,
  plan,
  lines,
  startDate,
  expiryDate,
  paymentTerms,
  status,
  quotationId,
  taxId,
  session,
  actorId,
  action
}) {
  const startsAt = startDate || new Date();
  if (expiryDate && expiryDate <= startsAt) fail(422, 'expiryDate must be after startDate');
  const subscription = new Subscription({
    subscriptionNumber: `SUB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    customerId,
    planId: plan._id,
    billingFrequency: plan.frequency,
    quotationId: quotationId || null,
    startDate: startsAt,
    billingAnchorDate: startsAt,
    expiryDate: expiryDate || null,
    paymentTerms: paymentTerms || '',
    totalAmount: lineItemsTotal(lines),
    nextBillingDate: addBillingPeriod(startsAt, plan.frequency, startsAt),
    status,
    taxId: taxId || null
  });
  await subscription.save({ session });
  if (lines.length) {
    await SubscriptionItem.insertMany(
      lines.map((line) => ({ ...line, subscriptionId: subscription._id })),
      { session }
    );
  }
  if (actorId) {
    await addHistory(subscription._id, action || 'created', null, status, actorId, {}, session);
  }
  return subscription;
}

async function addHistory(subscriptionId, action, fromStatus, toStatus, actorId, details = {}, session) {
  await SubscriptionHistory.create(
    [{ subscriptionId, action, fromStatus, toStatus, actorId: String(actorId), details }],
    { session }
  );
}

async function expireSubscriptions(filter = {}) {
  const now = new Date();
  const expiredSubscriptions = await Subscription.find({
    ...filter,
    status: { $in: ['active', 'confirmed'] },
    expiryDate: { $type: 'date', $lte: now }
  }).select('_id').limit(250).lean();

  for (const { _id } of expiredSubscriptions) {
    await transaction(async (session) => {
      const subscription = await Subscription.findOne({
        _id,
        status: { $in: ['active', 'confirmed'] },
        expiryDate: { $type: 'date', $lte: now }
      }).session(session);
      if (!subscription) return;
      const previous = subscription.status;
      subscription.status = 'expired';
      subscription.closedAt = subscription.expiryDate;
      await subscription.save({ session });
      await addHistory(
        subscription._id,
        'expired',
        previous,
        'expired',
        'system',
        { expiryDate: subscription.expiryDate },
        session
      );
    });
  }
}

async function getSubscriptionDocument(id, filter = {}, session = null) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  if (!session) await expireSubscriptions({ _id: id });
  const subscription = await Subscription.findOne({ _id: id, ...filter }).session(session).lean();
  if (!subscription) fail(404, 'Subscription not found');
  const [items, plan] = await Promise.all([
    SubscriptionItem.find({ subscriptionId: id }).session(session).sort({ createdAt: 1 }).lean(),
    Plan.findById(subscription.planId).session(session).lean()
  ]);
  return { ...subscription, items, plan: plan || null };
}

function makeSearch(search) {
  return search ? { $regex: escapeRegex(search), $options: 'i' } : undefined;
}

async function listProducts(query, { customer = false } = {}) {
  const filter = {};
  if (customer) filter.status = 'active';
  else if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = makeSearch(query.search);
    filter.$or = [{ name: regex }, { type: regex }, { description: regex }];
  }
  const result = await paged(Product, query, filter);
  const ids = result.results.map((item) => item._id);
  const variants = await ProductVariant.find({
    product: { $in: ids },
    ...(customer ? { status: 'active' } : {})
  }).sort({ createdAt: 1 }).lean();
  const byProduct = new Map();
  for (const variant of variants) {
    const key = variant.product.toString();
    byProduct.set(key, [...(byProduct.get(key) || []), variant]);
  }
  result.results = result.results.map((product) => ({
    ...product,
    variants: byProduct.get(product._id.toString()) || []
  }));
  return result;
}

async function getProduct(id, { customer = false } = {}, session = null) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Product not found');
  const product = await Product.findOne({ _id: id, ...(customer ? { status: 'active' } : {}) }).session(session).lean();
  if (!product) fail(404, 'Product not found');
  product.variants = await ProductVariant.find({
    product: product._id,
    ...(customer ? { status: 'active' } : {})
  }).session(session).sort({ createdAt: 1 }).lean();
  return product;
}

async function saveProductVariants(productId, variants, session) {
  const existing = await ProductVariant.find({ product: productId }).session(session);
  const existingMap = new Map(existing.map((variant) => [variant._id.toString(), variant]));
  const retained = new Set();
  for (const input of variants) {
    if (input.id) {
      const variant = existingMap.get(input.id);
      if (!variant) fail(422, 'A variant ID does not belong to this product');
      Object.assign(variant, {
        name: input.name,
        sku: input.sku || undefined,
        priceDelta: input.priceDelta,
        costDelta: input.costDelta,
        status: input.status
      });
      await variant.save({ session });
      retained.add(input.id);
    } else {
      const [created] = await ProductVariant.create(
        [{ product: productId, ...input }],
        { session }
      );
      retained.add(created._id.toString());
    }
  }
  const removedIds = [...existingMap.keys()].filter((id) => !retained.has(id));
  if (removedIds.length) {
    await ProductVariant.updateMany(
      { _id: { $in: removedIds } },
      { $set: { status: 'inactive' } },
      { session }
    );
  }
}

async function createProduct(input) {
  return transaction(async (session) => {
    const product = new Product(input);
    await product.save({ session });
    if (input.variants) await saveProductVariants(product._id, input.variants, session);
    return getProduct(product._id, {}, session);
  });
}

async function updateProduct(id, input) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Product not found');
  return transaction(async (session) => {
    const product = await Product.findById(id).session(session);
    if (!product) fail(404, 'Product not found');
    const { variants, ...fields } = input;
    Object.assign(product, fields);
    await product.save({ session });
    if (variants) await saveProductVariants(product._id, variants, session);
    if (fields.status && fields.status !== 'active') {
      await ProductVariant.updateMany(
        { product: product._id, status: 'active' },
        { $set: { status: 'inactive' } },
        { session }
      );
      await Plan.updateMany(
        { productIds: product._id, status: 'active' },
        { $set: { status: 'inactive' } },
        { session }
      );
    }
    return getProduct(product._id, {}, session);
  });
}

async function deleteProduct(id) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Product not found');
  return transaction(async (session) => {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { status: 'archived' } },
      { new: true, session }
    );
    if (!product) fail(404, 'Product not found');
    await ProductVariant.updateMany({ product: id }, { $set: { status: 'inactive' } }, { session });
    await Plan.updateMany({ productIds: id, status: 'active' }, { $set: { status: 'inactive' } }, { session });
    return getProduct(id, {}, session);
  });
}

async function listPlans(query, { customer = false } = {}) {
  const filter = {};
  if (customer) filter.status = 'active';
  else if (query.status) filter.status = query.status;
  if (query.frequency) filter.frequency = query.frequency;
  if (query.search) filter.name = makeSearch(query.search);
  const now = new Date();
  if (customer) {
    filter.$and = [
      { $or: [{ availableFrom: null }, { availableFrom: { $exists: false } }, { availableFrom: { $lte: now } }] },
      { $or: [{ availableTo: null }, { availableTo: { $exists: false } }, { availableTo: { $gte: now } }] }
    ];
  }
  return paged(Plan, query, filter);
}

async function getPlan(id, { customer = false } = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Plan not found');
  const plan = await Plan.findOne({
    _id: id,
    ...(customer ? { status: 'active' } : {})
  }).lean();
  if (!plan) fail(404, 'Plan not found');
  if (customer) activeAvailability(plan);
  return plan;
}

async function validatePlanInput(input) {
  const products = await Product.find({ _id: { $in: input.productIds }, status: 'active' }).select('_id').lean();
  if (products.length !== new Set(input.productIds).size) {
    fail(422, 'Plans may only include active products');
  }
}

async function createPlan(input) {
  await validatePlanInput(input);
  return Plan.create(input);
}

async function updatePlan(id, input) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Plan not found');
  const current = await Plan.findById(id);
  if (!current) fail(404, 'Plan not found');
  const merged = { ...current.toObject(), ...input };
  if (merged.availableFrom && merged.availableTo && merged.availableTo < merged.availableFrom) {
    fail(422, 'availableTo must be on or after availableFrom');
  }
  if (merged.autoClose && !merged.autoCloseAfterCycles) {
    fail(422, 'autoCloseAfterCycles is required when autoClose is enabled');
  }
  if (input.productIds || (input.status === 'active' && current.status !== 'active')) {
    await validatePlanInput({ productIds: merged.productIds.map((value) => value.toString()) });
  }
  Object.assign(current, input);
  await current.save();
  return current;
}

async function deletePlan(id) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Plan not found');
  const plan = await Plan.findByIdAndUpdate(id, { $set: { status: 'archived' } }, { new: true });
  if (!plan) fail(404, 'Plan not found');
  return plan;
}

async function resolveLines(lines, plan, session) {
  return priceLines(lines, plan, session);
}

async function createTemplate(input, actorId) {
  const plan = await Plan.findById(input.planId);
  if (!plan) fail(404, 'Plan not found');
  activeAvailability(plan);
  const items = await resolveLines(input.items, plan, null);
  return QuotationTemplate.create({
    ...input,
    items,
    totalAmount: lineItemsTotal(items),
    createdBy: String(actorId)
  });
}

async function listTemplates(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = makeSearch(query.search);
  return paged(QuotationTemplate, query, filter);
}

async function getTemplate(id) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Quotation template not found');
  const template = await QuotationTemplate.findById(id).lean();
  if (!template) fail(404, 'Quotation template not found');
  return template;
}

async function updateTemplate(id, input) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Quotation template not found');
  const template = await QuotationTemplate.findById(id);
  if (!template) fail(404, 'Quotation template not found');
  const planId = input.planId || template.planId;
  const plan = await Plan.findById(planId);
  if (!plan) fail(404, 'Plan not found');
  activeAvailability(plan);
  const items = input.items ? await resolveLines(input.items, plan, null) : undefined;
  const resolvedItems = items || template.items;
  if (!items && input.planId) await validatePlanProducts(plan, resolvedItems);
  const update = { ...input, ...(items ? { items } : {}) };
  if (items) update.totalAmount = lineItemsTotal(items);
  return QuotationTemplate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
}

async function deleteTemplate(id) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Quotation template not found');
  const template = await QuotationTemplate.findByIdAndUpdate(id, { $set: { status: 'inactive' } }, { new: true });
  if (!template) fail(404, 'Quotation template not found');
  return template;
}

async function expireOpenQuotations(filter = {}) {
  const now = new Date();
  const expired = await Quotation.find({
    ...filter,
    status: 'quotation',
    expiresAt: { $lte: now }
  }).select('_id').limit(250).lean();

  for (const { _id } of expired) {
    await transaction(async (session) => {
      const quotation = await Quotation.findOne({
        _id,
        status: 'quotation',
        expiresAt: { $lte: now }
      }).session(session);
      if (!quotation) return;
      quotation.status = 'expired';
      await quotation.save({ session });
      if (quotation.subscriptionId) {
        const subscription = await Subscription.findOne({
          _id: quotation.subscriptionId,
          status: 'quotation'
        }).session(session);
        if (subscription) {
          subscription.status = 'expired';
          subscription.closedAt = now;
          await subscription.save({ session });
          await addHistory(
            subscription._id,
            'quotation-expired',
            'quotation',
            'expired',
            'system',
            { quotationId: quotation._id },
            session
          );
        }
      }
    });
  }
}

async function createQuotation(input, actorId) {
  return transaction(async (session) => {
    let template = null;
    if (input.templateId) {
      template = await QuotationTemplate.findOne({ _id: input.templateId, status: 'active' }).session(session);
      if (!template) fail(404, 'Active quotation template not found');
    }
    const planId = input.planId || template.planId;
    const plan = await Plan.findById(planId).session(session);
    if (!plan) fail(404, 'Plan not found');
    activeAvailability(plan);
    const rawLines = input.items || template.items.map((item) => ({
      productId: item.productId.toString(),
      ...(item.variantId ? { variantId: item.variantId.toString() } : {}),
      quantity: item.quantity,
      ...(item.taxId ? { taxId: item.taxId.toString() } : {}),
      taxRate: item.taxRate
    }));
    activeAvailability(plan, input.startDate || new Date());
    const items = await resolveLines(rawLines, plan, session);
    const now = new Date();
    const validityDays = input.validityDays || (template && template.validityDays) || 30;
    const expiresAt = new Date(now.getTime() + validityDays * 86400000);
    const quotation = new Quotation({
      quotationNumber: `QUO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
      templateId: template ? template._id : null,
      customerId: input.customerId,
      planId: plan._id,
      items,
      totalAmount: lineItemsTotal(items),
      notes: input.notes === undefined ? (template ? template.notes : '') : input.notes,
      issuedAt: now,
      expiresAt,
      createdBy: String(actorId)
    });
    await quotation.save({ session });
    const subscription = await createSubscriptionRecord({
      customerId: input.customerId,
      plan,
      lines: items,
      startDate: input.startDate || now,
      expiryDate: input.expiryDate,
      paymentTerms: input.paymentTerms,
      status: 'quotation',
      quotationId: quotation._id,
      session,
      actorId,
      action: 'quotation-created'
    });
    quotation.subscriptionId = subscription._id;
    await quotation.save({ session });
    return {
      quotation: quotation.toObject(),
      subscription: await getSubscriptionDocument(subscription._id, {}, session)
    };
  });
}

async function listQuotations(query, { customerId } = {}) {
  const filter = {};
  if (customerId) filter.customerId = customerId;
  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.planId) filter.planId = query.planId;
  if (query.frequency) {
    const plans = await Plan.find({ frequency: query.frequency }).select('_id').lean();
    const ids = plans.map((plan) => plan._id);
    filter.planId = query.planId
      ? { $in: ids.filter((id) => id.toString() === query.planId) }
      : { $in: ids };
  }
  await expireOpenQuotations({
    ...(customerId ? { customerId } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {})
  });
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }
  if (query.search) filter.quotationNumber = makeSearch(query.search);
  return paged(Quotation, query, filter);
}

async function getQuotation(id, { customerId } = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Quotation not found');
  await expireOpenQuotations({
    _id: id,
    ...(customerId ? { customerId } : {})
  });
  const quotation = await Quotation.findOne({ _id: id, ...(customerId ? { customerId } : {}) }).lean();
  if (!quotation) fail(404, 'Quotation not found');
  return quotation;
}

async function updateQuotation(id, input, { customerId } = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Quotation not found');
  await expireOpenQuotations({
    _id: id,
    ...(customerId ? { customerId } : {})
  });
  return transaction(async (session) => {
    const quotation = await Quotation.findOne({ _id: id, ...(customerId ? { customerId } : {}) }).session(session);
    if (!quotation) fail(404, 'Quotation not found');
    if (quotation.status !== 'quotation') fail(409, 'Only open quotations can be edited');
    if (quotation.expiresAt <= new Date()) fail(409, 'Expired quotations cannot be edited');

    const planId = input.planId || quotation.planId;
    const plan = await Plan.findById(planId).session(session);
    if (!plan) fail(404, 'Plan not found');
    const linkedSubscription = quotation.subscriptionId
      ? await Subscription.findOne({ _id: quotation.subscriptionId, status: 'quotation' }).session(session)
      : null;
    if (quotation.subscriptionId && !linkedSubscription) {
      fail(409, 'Linked subscription is no longer editable');
    }
    activeAvailability(plan, linkedSubscription ? linkedSubscription.startDate : new Date());
    const items = input.items ? await resolveLines(input.items, plan, session) : undefined;
    if (!items && input.planId && input.planId !== quotation.planId.toString()) {
      await validatePlanProducts(plan, quotation.items);
    }
    const previousPlanId = quotation.planId.toString();
    Object.assign(quotation, input, { ...(items ? { items } : {}), planId });
    if (items) quotation.totalAmount = lineItemsTotal(items);
    if (input.validityDays) {
      quotation.expiresAt = new Date(quotation.issuedAt.getTime() + input.validityDays * 86400000);
    }
    await quotation.save({ session });

    if (linkedSubscription) {
      linkedSubscription.planId = planId;
      if (planId.toString() !== previousPlanId) {
        linkedSubscription.billingFrequency = plan.frequency;
        linkedSubscription.billingAnchorDate = linkedSubscription.startDate;
        linkedSubscription.nextBillingDate = addBillingPeriod(
          linkedSubscription.startDate,
          plan.frequency,
          linkedSubscription.startDate
        );
      }
      if (items) {
        linkedSubscription.totalAmount = lineItemsTotal(items);
        await SubscriptionItem.deleteMany({ subscriptionId: linkedSubscription._id }, { session });
        await SubscriptionItem.insertMany(
          items.map((item) => ({ ...item, subscriptionId: linkedSubscription._id })),
          { session }
        );
      }
      await linkedSubscription.save({ session });
    }
    return quotation;
  });
}

async function confirmQuotation(id, actorId) {
  const result = await transaction(async (session) => {
    const quotation = await Quotation.findById(id).session(session);
    if (!quotation) fail(404, 'Quotation not found');
    if (quotation.status !== 'quotation') fail(409, 'Quotation is not awaiting confirmation');
    const now = new Date();
    if (quotation.expiresAt <= now) {
      quotation.status = 'expired';
      await quotation.save({ session });
      if (quotation.subscriptionId) {
        const expiredSubscription = await Subscription.findById(quotation.subscriptionId).session(session);
        if (expiredSubscription && expiredSubscription.status === 'quotation') {
          expiredSubscription.status = 'expired';
          expiredSubscription.closedAt = now;
          await expiredSubscription.save({ session });
          await addHistory(expiredSubscription._id, 'quotation-expired', 'quotation', 'expired', actorId, {}, session);
        }
      }
      return { expired: true };
    }
    const plan = await Plan.findById(quotation.planId).session(session);
    const linkedSubscription = quotation.subscriptionId
      ? await Subscription.findById(quotation.subscriptionId).session(session)
      : null;
    if (quotation.subscriptionId && (!linkedSubscription || linkedSubscription.status !== 'quotation')) {
      fail(409, 'Linked subscription is not awaiting confirmation');
    }
    activeAvailability(plan, linkedSubscription ? linkedSubscription.startDate : now);
    quotation.status = 'confirmed';
    quotation.confirmedAt = now;
    await quotation.save({ session });
    if (linkedSubscription) {
      linkedSubscription.status = 'confirmed';
      await linkedSubscription.save({ session });
      await addHistory(linkedSubscription._id, 'quotation-confirmed', 'quotation', 'confirmed', actorId, {}, session);
    }
    return quotation;
  });
  if (result.expired) fail(409, 'Quotation has expired');
  return result;
}

async function createQuotationFromSubscription(id, { validityDays, notes }, actorId, { customerId } = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  return transaction(async (session) => {
    const subscription = await Subscription.findOne({
      _id: id,
      ...(customerId ? { customerId } : {})
    }).session(session);
    if (!subscription) fail(404, 'Subscription not found');
    if (subscription.status !== 'draft') fail(409, 'Only draft subscriptions can be sent as quotations');
    const plan = await Plan.findById(subscription.planId).session(session);
    activeAvailability(plan, subscription.startDate);
    const items = await SubscriptionItem.find({ subscriptionId: id }).session(session).sort({ createdAt: 1 }).lean();
    const now = new Date();
    const quotation = new Quotation({
      quotationNumber: `QUO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
      customerId: subscription.customerId,
      planId: subscription.planId,
      items,
      totalAmount: subscription.totalAmount,
      notes: notes || '',
      issuedAt: now,
      expiresAt: new Date(now.getTime() + validityDays * 86400000),
      createdBy: String(actorId),
      subscriptionId: subscription._id
    });
    await quotation.save({ session });
    subscription.status = 'quotation';
    subscription.quotationId = quotation._id;
    await subscription.save({ session });
    await addHistory(id, 'quotation-created', 'draft', 'quotation', actorId, { quotationId: quotation._id }, session);
    return { quotation, subscription: await getSubscriptionDocument(id, {}, session) };
  });
}

async function createSubscription(input, actorId) {
  return transaction(async (session) => {
    const plan = await Plan.findById(input.planId).session(session);
    if (!plan) fail(404, 'Plan not found');
    const startsAt = input.startDate || new Date();
    activeAvailability(plan, startsAt);
    const items = await priceLines(input.items, plan, session);
    const subscription = await createSubscriptionRecord({
      customerId: input.customerId,
      plan,
      lines: items,
      startDate: startsAt,
      expiryDate: input.expiryDate,
      paymentTerms: input.paymentTerms,
      status: 'draft',
      taxId: input.taxId,
      session,
      actorId
    });
    return getSubscriptionDocument(subscription._id, {}, session);
  });
}

async function updateSubscription(id, input, { customerId, actorId }) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  return transaction(async (session) => {
    const subscription = await Subscription.findOne({
      _id: id,
      ...(customerId ? { customerId } : {})
    }).session(session);
    if (!subscription) fail(404, 'Subscription not found');
    if (subscription.status !== 'draft') fail(409, 'Only draft subscriptions can be edited');

    const plan = await Plan.findById(input.planId || subscription.planId).session(session);
    if (!plan) fail(404, 'Plan not found');
    activeAvailability(plan, input.startDate || subscription.startDate);
    const lines = input.items
      ? await priceLines(input.items, plan, session)
      : await SubscriptionItem.find({ subscriptionId: id }).session(session).lean();
    if (!input.items && input.planId) await validatePlanProducts(plan, lines);
    if (input.items) {
      subscription.totalAmount = lineItemsTotal(lines);
      await SubscriptionItem.deleteMany({ subscriptionId: id }, { session });
      await SubscriptionItem.insertMany(
        lines.map((line) => ({ ...line, subscriptionId: id })),
        { session }
      );
    }
    if (input.startDate) {
      subscription.startDate = input.startDate;
      subscription.billingFrequency = plan.frequency;
      subscription.billingAnchorDate = input.startDate;
      subscription.nextBillingDate = addBillingPeriod(input.startDate, plan.frequency, input.startDate);
    } else if (input.planId && input.planId !== subscription.planId.toString()) {
      subscription.billingFrequency = plan.frequency;
      subscription.billingAnchorDate = subscription.startDate;
      subscription.nextBillingDate = addBillingPeriod(subscription.startDate, plan.frequency, subscription.startDate);
    }
    if (input.expiryDate !== undefined) subscription.expiryDate = input.expiryDate;
    if (input.paymentTerms !== undefined) subscription.paymentTerms = input.paymentTerms;
    if (input.taxId !== undefined) subscription.taxId = input.taxId;
    subscription.planId = plan._id;
    if (subscription.expiryDate && subscription.expiryDate <= subscription.startDate) {
      fail(422, 'expiryDate must be after startDate');
    }
    await subscription.save({ session });
    await addHistory(id, 'draft-updated', 'draft', 'draft', actorId, {}, session);
    return getSubscriptionDocument(id, {}, session);
  });
}

async function listSubscriptions(query, { customerId } = {}) {
  await expireSubscriptions(customerId ? { customerId } : {});
  const filter = {};
  if (customerId) filter.customerId = customerId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.status) filter.status = query.status;
  if (query.planId) filter.planId = query.planId;
  if (query.frequency) {
    const plans = await Plan.find({ frequency: query.frequency }).select('_id').lean();
    const ids = plans.map((plan) => plan._id);
    filter.planId = query.planId
      ? { $in: ids.filter((id) => id.toString() === query.planId) }
      : { $in: ids };
  }
  if (query.from || query.to) {
    filter.startDate = {};
    if (query.from) filter.startDate.$gte = query.from;
    if (query.to) filter.startDate.$lte = query.to;
  }
  if (query.search) filter.subscriptionNumber = makeSearch(query.search);
  const result = await paged(Subscription, query, filter);
  const ids = result.results.map((subscription) => subscription._id);
  const [items, plans] = await Promise.all([
    SubscriptionItem.find({ subscriptionId: { $in: ids } }).sort({ createdAt: 1 }).lean(),
    Plan.find({ _id: { $in: result.results.map((sub) => sub.planId) } }).lean()
  ]);
  const itemsBySubscription = new Map();
  for (const item of items) {
    const key = item.subscriptionId.toString();
    itemsBySubscription.set(key, [...(itemsBySubscription.get(key) || []), item]);
  }
  const planMap = new Map(plans.map((plan) => [plan._id.toString(), plan]));
  result.results = result.results.map((subscription) => ({
    ...subscription,
    items: itemsBySubscription.get(subscription._id.toString()) || [],
    plan: planMap.get(subscription.planId.toString()) || null
  }));
  return result;
}

async function listDueForBilling(query) {
  const asOf = query.asOf || new Date();
  if (asOf >= new Date()) await expireSubscriptions();
  let matchingPlanIds = [];
  if (query.frequency) {
    const plans = await Plan.find({ frequency: query.frequency }).select('_id').lean();
    matchingPlanIds = plans.map((plan) => plan._id);
  }
  const filter = dueBillingFilter({
    asOf,
    planId: query.planId,
    frequency: query.frequency,
    matchingPlanIds
  });
  const result = await paged(Subscription, query, filter, { nextBillingDate: 1, _id: 1 });
  const subscriptionIds = result.results.map((subscription) => subscription._id);
  const [items, plans] = await Promise.all([
    SubscriptionItem.find({ subscriptionId: { $in: subscriptionIds } }).sort({ createdAt: 1 }).lean(),
    Plan.find({ _id: { $in: result.results.map((subscription) => subscription.planId) } }).lean()
  ]);
  const itemsBySubscription = new Map();
  for (const item of items) {
    const key = item.subscriptionId.toString();
    itemsBySubscription.set(key, [...(itemsBySubscription.get(key) || []), item]);
  }
  const planMap = new Map(plans.map((plan) => [plan._id.toString(), plan]));
  result.results = result.results.map((subscription) => ({
    subscriptionId: subscription._id,
    subscriptionNumber: subscription.subscriptionNumber,
    customerId: subscription.customerId,
    planId: subscription.planId,
    frequency: subscription.billingFrequency || planMap.get(subscription.planId.toString())?.frequency || null,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    nextBillingDate: subscription.nextBillingDate,
    status: subscription.status,
    totalAmount: subscription.totalAmount,
    billableLineItems: (itemsBySubscription.get(subscription._id.toString()) || []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      historicalUnitPrice: item.unitPrice,
      taxId: item.taxId,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      lineTotal: item.lineTotal
    }))
  }));
  return result;
}

async function transitionSubscription(id, action, actorId, { customerId } = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  await expireSubscriptions({ _id: id, ...(customerId ? { customerId } : {}) });
  return transaction(async (session) => {
    const subscription = await Subscription.findOne({
      _id: id,
      ...(customerId ? { customerId } : {})
    }).session(session);
    if (!subscription) fail(404, 'Subscription not found');
    const plan = await Plan.findById(subscription.planId).session(session);
    if (!plan) fail(409, 'The subscription plan no longer exists');
    const previous = subscription.status;
    const now = new Date();
    subscription.billingFrequency = subscription.billingFrequency || plan.frequency;

    if (action === 'activate') {
      if (previous !== 'confirmed') fail(409, 'Only confirmed subscriptions can be activated');
      if (subscription.startDate > now) fail(409, 'A subscription cannot be activated before its start date');
      activeAvailability(plan, subscription.startDate);
      subscription.status = 'active';
    } else if (action === 'pause') {
      if (previous !== 'active') fail(409, 'Only active subscriptions can be paused');
      if (!plan.pauseAllowed) fail(403, 'Pausing is not allowed by this plan');
      subscription.status = 'paused';
      subscription.pausedAt = now;
    } else if (action === 'resume') {
      if (previous !== 'paused') fail(409, 'Only paused subscriptions can be resumed');
      if (!plan.pauseAllowed) fail(403, 'Resuming is not allowed by this plan');
      if (!subscription.pausedAt) fail(409, 'Subscription pause timestamp is missing');
      const pauseDuration = Math.max(0, now.getTime() - subscription.pausedAt.getTime());
      subscription.nextBillingDate = new Date(subscription.nextBillingDate.getTime() + pauseDuration);
      const anchor = subscription.billingAnchorDate || subscription.startDate;
      subscription.billingAnchorDate = new Date(anchor.getTime() + pauseDuration);
      if (subscription.expiryDate) {
        subscription.expiryDate = new Date(subscription.expiryDate.getTime() + pauseDuration);
      }
      subscription.status = 'active';
      subscription.pausedAt = null;
    } else if (action === 'close') {
      if (!['confirmed', 'active', 'paused'].includes(previous)) {
        fail(409, 'Only confirmed, active, or paused subscriptions can be closed');
      }
      if (isEarlyClose(subscription.expiryDate, now) && !plan.earlyCloseAllowed) {
        fail(403, 'Early close is not allowed by this plan');
      }
      subscription.status = 'closed';
      subscription.closedAt = now;
    } else if (action === 'renew') {
      if (!plan.renewalAllowed) fail(403, 'Renewal is not allowed by this plan');
      if (!['active', 'closed', 'expired'].includes(previous)) {
        fail(409, 'Only active or ended subscriptions can be renewed');
      }
      if (previous !== 'active') {
        const currentBase = subscription.nextBillingDate > now ? subscription.nextBillingDate : now;
        subscription.billingAnchorDate = currentBase;
        const frequency = subscription.billingFrequency || plan.frequency;
        subscription.billingFrequency = frequency;
        subscription.nextBillingDate = addBillingPeriod(currentBase, frequency, currentBase);
      } else if (subscription.nextBillingDate <= now) {
        const frequency = subscription.billingFrequency || plan.frequency;
        subscription.billingFrequency = frequency;
        subscription.nextBillingDate = addBillingPeriod(
          subscription.nextBillingDate,
          frequency,
          subscription.billingAnchorDate || subscription.startDate
        );
      }
      if (subscription.expiryDate) {
        const expiryBase = subscription.expiryDate > now ? subscription.expiryDate : now;
        const frequency = subscription.billingFrequency || plan.frequency;
        subscription.expiryDate = addBillingPeriod(
          expiryBase,
          frequency,
          subscription.billingAnchorDate || subscription.startDate
        );
      }
      subscription.status = 'active';
      subscription.closedAt = null;
      activeAvailability(plan, now);
    } else {
      fail(400, 'Unsupported subscription action');
    }

    await subscription.save({ session });
    await addHistory(id, action, previous, subscription.status, actorId, {}, session);
    return getSubscriptionDocument(id, {}, session);
  });
}

async function recordBilling(id, { idempotencyKey, billedAt, externalInvoiceId }, actorId) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  return transaction(async (session) => {
    const existingEvent = await SubscriptionBillingEvent.findOne({ subscriptionId: id, idempotencyKey })
      .session(session)
      .lean();
    if (existingEvent) {
      return {
        alreadyRecorded: true,
        billingEvent: existingEvent,
        subscription: await getSubscriptionDocument(id, {}, session)
      };
    }
    const subscription = await Subscription.findById(id).session(session);
    if (!subscription) fail(404, 'Subscription not found');
    if (subscription.status !== 'active') fail(409, 'Only active subscriptions can advance billing');
    const plan = await Plan.findById(subscription.planId).session(session);
    if (!plan) fail(409, 'The subscription plan no longer exists');
    const billedTime = billedAt || new Date();
    if (subscription.nextBillingDate > billedTime) fail(409, 'Subscription is not due for billing');
    if (subscription.expiryDate && subscription.expiryDate <= billedTime) fail(409, 'Subscription has expired');

    const periodStart = subscription.nextBillingDate;
    const frequency = subscription.billingFrequency || plan.frequency;
    subscription.billingFrequency = frequency;
    const periodEnd = addBillingPeriod(
      periodStart,
      frequency,
      subscription.billingAnchorDate || subscription.startDate
    );
    const [event] = await SubscriptionBillingEvent.create(
      [{
        subscriptionId: id,
        idempotencyKey,
        externalInvoiceId: externalInvoiceId || null,
        billedAt: billedTime,
        periodStart,
        periodEnd
      }],
      { session }
    );
    subscription.nextBillingDate = periodEnd;
    subscription.billingCycles += 1;
    let action = 'billing-period-advanced';
    if (plan.autoClose && subscription.billingCycles >= plan.autoCloseAfterCycles) {
      subscription.status = 'closed';
      subscription.closedAt = billedTime;
      action = 'auto-closed-after-billing';
    } else if (subscription.expiryDate && periodEnd >= subscription.expiryDate) {
      subscription.status = 'expired';
      subscription.closedAt = subscription.expiryDate;
      action = 'expired-after-billing';
    }
    await subscription.save({ session });
    await addHistory(id, action, 'active', subscription.status, actorId, { periodStart, periodEnd }, session);
    return {
      alreadyRecorded: false,
      billingEvent: event,
      subscription: await getSubscriptionDocument(id, {}, session)
    };
  });
}

async function getSubscriptionHistory(id, filter = {}) {
  if (!mongoose.isValidObjectId(id)) fail(404, 'Subscription not found');
  await expireSubscriptions({ _id: id, ...filter });
  const subscription = await Subscription.findOne({ _id: id, ...filter }).select('_id').lean();
  if (!subscription) fail(404, 'Subscription not found');
  return SubscriptionHistory.find({ subscriptionId: id }).sort({ createdAt: -1 }).lean();
}

module.exports = {
  ServiceError,
  fail,
  money,
  isEarlyClose,
  dueBillingFilter,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createQuotation,
  createQuotationFromSubscription,
  listQuotations,
  getQuotation,
  updateQuotation,
  confirmQuotation,
  createSubscription,
  updateSubscription,
  listSubscriptions,
  getSubscriptionDocument,
  listDueForBilling,
  transitionSubscription,
  recordBilling,
  getSubscriptionHistory
};
