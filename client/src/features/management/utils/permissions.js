export function hasPermission(user, permission) {
  if (!user || typeof permission !== 'string') return false;
  if (user.role === 'admin' || user.permissions?.includes('*')) return true;
  return user.permissions?.includes(permission) || false;
}

export function canReadManagementModule(user, definition, moduleId) {
  if (!user || !definition) return false;
  if (user.role === 'customer') {
    return (
      moduleId === 'quotations' ||
      moduleId === 'products' ||
      moduleId === 'variants' ||
      moduleId === 'plans'
    );
  }
  return hasPermission(user, definition.permission);
}

export function canManageRecords(user, definition) {
  return hasPermission(user, definition.managePermission);
}

export function canConfirmRecord(user, definition) {
  if (!user || !definition?.confirmPermission) return false;
  if (user.role === 'customer') {
    return hasPermission(user, `${definition.confirmPermission}:own`);
  }
  return hasPermission(user, definition.confirmPermission);
}
