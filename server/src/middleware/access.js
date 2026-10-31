const { ServiceError } = require('../modules/shared/service');

function identity(req) {
  const user = req.user || {};
  return String(user.id || user._id || user.uid || '');
}

function role(req) {
  return String((req.user && req.user.role) || '').toLowerCase();
}

function customerId(req) {
  const user = req.user || {};
  return user.customerId ? String(user.customerId) : '';
}

function hasPermission(req, permission) {
  const user = req.user || {};
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return role(req) === 'admin' || permissions.includes('*') || permissions.includes(permission);
}

function authenticated(req, res, next) {
  if (!identity(req)) return next(new ServiceError(401, 'Authentication is required'));
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!identity(req)) return next(new ServiceError(401, 'Authenticated user identity is missing'));
    if (hasPermission(req, permission)) return next();
    return next(new ServiceError(403, 'You do not have permission to perform this action'));
  };
}

function requireStaffPermission(permission) {
  return (req, res, next) => {
    if (!identity(req)) return next(new ServiceError(401, 'Authenticated user identity is missing'));
    if (role(req) === 'admin' || (role(req) === 'staff' && hasPermission(req, permission))) {
      return next();
    }
    return next(new ServiceError(403, 'You do not have permission to perform this action'));
  };
}

function authorizeCatalogRead(permission) {
  return (req, res, next) => {
    if (!identity(req)) return next(new ServiceError(401, 'Authentication is required'));
    if (role(req) === 'customer' || hasPermission(req, permission)) return next();
    return next(new ServiceError(403, 'You do not have permission to view this catalog'));
  };
}

function authorizeRead(permission, ownership = false) {
  return (req, res, next) => {
    if (!identity(req)) return next(new ServiceError(401, 'Authentication is required'));
    if (hasPermission(req, permission)) return next();
    if (ownership && role(req) === 'customer' && customerId(req)) return next();
    return next(new ServiceError(403, 'You do not have permission to perform this action'));
  };
}

function authorizeOwnAction(permission) {
  return (req, res, next) => {
    if (!identity(req)) return next(new ServiceError(401, 'Authentication is required'));
    if (hasPermission(req, permission)) return next();
    if (role(req) === 'customer' && customerId(req) && hasPermission(req, `${permission}:own`)) {
      return next();
    }
    return next(new ServiceError(403, 'You do not have permission to perform this action'));
  };
}

function parse(schema, source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new ServiceError(400, result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function roleIsCustomer(req) {
  return role(req) === 'customer';
}

function assertCustomerCanRequest(req, requestedId) {
  if (!roleIsCustomer(req)) return requestedId;
  const ownerId = customerId(req);
  if (!ownerId) throw new ServiceError(403, 'Authenticated customer account is not linked to a customer');
  if (requestedId && requestedId !== ownerId) {
    throw new ServiceError(403, 'You cannot change subscription or quotation ownership');
  }
  return ownerId;
}

module.exports = {
  identity,
  role,
  customerId,
  hasPermission,
  authenticated,
  requirePermission,
  requireStaffPermission,
  authorizeCatalogRead,
  authorizeRead,
  authorizeOwnAction,
  parse,
  asyncRoute,
  roleIsCustomer,
  assertCustomerCanRequest
};
