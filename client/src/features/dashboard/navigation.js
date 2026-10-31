import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileBadge,
  FileText,
  Layers3,
  Package,
  Percent,
  Receipt,
  Settings,
  Shield,
  Tags,
  UserRound,
  Users,
} from 'lucide-react';
import { routePaths, dashboardPathForRole } from '../../routes/routePaths.js';

const moduleItems = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'staff', label: 'Staff', icon: Shield },
  { id: 'customers', label: 'Customers', icon: UserRound },
  { id: 'products', label: 'Products', icon: Package, permission: 'products:read' },
  { id: 'variants', label: 'Product variants', icon: Layers3, permission: 'products:read' },
  { id: 'plans', label: 'Plans', icon: FileBadge, permission: 'plans:read' },
  {
    id: 'quotation-templates',
    label: 'Quotation templates',
    icon: ClipboardList,
    permission: 'quotations:read',
  },
  { id: 'quotations', label: 'Quotations', icon: FileText, permission: 'quotations:read' },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
    permission: 'subscriptions:read',
  },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'discounts', label: 'Discounts', icon: Percent },
  { id: 'taxes', label: 'Taxes', icon: Tags },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const staffPermissions = {
  products: 'products:read',
  variants: 'products:read',
  plans: 'plans:read',
  'quotation-templates': 'quotations:read',
  quotations: 'quotations:read',
  subscriptions: 'subscriptions:read',
};
const knownModules = new Set(moduleItems.map((item) => item.id));

function canOpenModule(user, moduleId) {
  if (!knownModules.has(moduleId)) return false;
  if (user?.role === 'admin') return true;
  if (user?.role === 'customer') {
    return ['products', 'variants', 'plans', 'quotations', 'subscriptions'].includes(moduleId);
  }
  if (user?.role !== 'staff') return false;

  const permission = staffPermissions[moduleId];
  if (!permission) return false;
  return (
    user.permissions?.includes('*') ||
    user.permissions?.includes(permission)
  );
}

export function createDashboardNavigation(user) {
  const dashboardPath = dashboardPathForRole(user?.role);
  const modules = moduleItems
    .filter((item) => canOpenModule(user, item.id))
    .map((item) => ({
      label: item.label,
      to: routePaths.module(item.id),
      icon: item.icon,
      permission: user?.role === 'customer' ? undefined : item.permission,
    }));

  return [
    {
      label: 'Workspace',
      items: [
        {
          label: 'Overview',
          to: dashboardPath,
          icon: BarChart3,
          end: true,
        },
      ],
    },
    ...(modules.length
      ? [
          {
            label: 'Modules',
            items: modules,
          },
        ]
      : []),
  ];
}

export function canAccessModuleRoute(user, moduleId) {
  return canOpenModule(user, moduleId);
}
