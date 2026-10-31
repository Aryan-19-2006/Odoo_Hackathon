import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronsLeft,
  Layers3,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import ActionMenu from '../components/ui/ActionMenu.jsx';
import Button from '../components/ui/Button.jsx';
import { classNames } from '../utils/classNames.js';
import { routePaths } from '../routes/routePaths.js';

const defaultNavigation = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Overview',
        to: routePaths.dashboard,
        icon: BarChart3,
        end: true,
      },
    ],
  },
];

function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
      <Layers3 aria-hidden="true" size={19} strokeWidth={2.2} />
    </span>
  );
}

function isNavigationAllowed(item, role, permissions) {
  if (item.roles && !item.roles.includes(role)) return false;
  if (role === 'admin' || permissions?.includes('*')) return true;
  if (
    item.permission &&
    (!Array.isArray(permissions) || !permissions.includes(item.permission))
  ) {
    return false;
  }
  return true;
}

function ProfileMenu({ user, role, onLogout, profileItems = [] }) {
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U';
  const items = profileItems.map((item) => ({
    ...item,
    icon: item.icon,
  }));
  if (onLogout) {
    items.push({
      label: 'Sign out',
      icon: LogOut,
      onSelect: onLogout,
      destructive: true,
    });
  }

  return (
    <ActionMenu
      align="right"
      ariaLabel="Open profile menu"
      className="w-64"
      icon={null}
      iconOnly={false}
      items={items}
      label={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {initials}
          </span>
          <span className="hidden max-w-36 text-left sm:block">
            <span className="block truncate text-sm font-medium text-slate-800">
              {user?.name || user?.email || 'Account'}
            </span>
            {role && <span className="block truncate text-xs capitalize text-slate-500">{role}</span>}
          </span>
          <ChevronDown aria-hidden="true" className="hidden text-slate-400 sm:block" size={15} />
        </span>
      }
    >
      <div className="border-b border-line px-4 py-3">
        <p className="truncate text-sm font-medium text-slate-900">
          {user?.name || user?.email || 'Account'}
        </p>
        {user?.email && user?.name && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        )}
        {role && <p className="mt-1 text-xs capitalize text-slate-500">{role}</p>}
      </div>
      {items.length === 0 && (
        <p className="px-4 py-3 text-xs leading-5 text-slate-500">
          Profile actions are not configured.
        </p>
      )}
    </ActionMenu>
  );
}

function NotificationMenu({ notifications = [], onViewAll }) {
  return (
    <ActionMenu
      align="right"
      ariaLabel={
        notifications.length
          ? `Notifications, ${notifications.length} available`
          : 'Notifications'
      }
      className="w-80"
      closeOnContentClick
      icon={Bell}
      label={
        notifications.length > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
        ) : null
      }
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Notifications</p>
        {notifications.length > 0 && (
          <span className="text-xs text-slate-500">{notifications.length} available</span>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          You’re all caught up.
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto py-1">
          {notifications.map((notification, index) => {
            const Icon = notification.icon;
            const content = (
              <>
                {Icon && <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-brand-600" size={16} />}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">{notification.title}</span>
                  {notification.description && (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {notification.description}
                    </span>
                  )}
                </span>
              </>
            );
            return notification.onSelect ? (
              <button
                className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50"
                key={notification.id || index}
                onClick={notification.onSelect}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div className="flex gap-3 px-4 py-3" key={notification.id || index}>
                {content}
              </div>
            );
          })}
        </div>
      )}
      {onViewAll && notifications.length > 0 && (
        <button
          className="w-full border-t border-line px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-slate-50"
          onClick={onViewAll}
          type="button"
        >
          View all notifications
        </button>
      )}
    </ActionMenu>
  );
}

function Sidebar({
  collapsed,
  mobile = false,
  navigation,
  onNavigate,
  onToggle,
  role,
  permissions,
}) {
  return (
    <aside
      aria-label="Application sidebar"
      className={classNames(
        'flex h-full flex-col border-r border-line bg-white',
        mobile ? 'w-[min(19rem,85vw)] shadow-popover' : '',
      )}
    >
      <div
        className={classNames(
          'flex h-[72px] shrink-0 items-center border-b border-line',
          collapsed && !mobile ? 'justify-center px-3' : 'gap-3 px-5',
        )}
      >
        <BrandMark />
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-navy-950">
              Brightloop
            </p>
            <p className="truncate text-xs text-slate-500">Subscription workspace</p>
          </div>
        )}
        {mobile ? (
          <Button
            aria-label="Close navigation"
            className="text-slate-500"
            onClick={onToggle}
            size="sm"
            variant="ghost"
          >
            <X aria-hidden="true" size={18} />
          </Button>
        ) : (
          !collapsed && (
            <Button
              aria-label="Collapse navigation"
              className="text-slate-400"
              onClick={onToggle}
              size="sm"
              variant="ghost"
            >
              <ChevronsLeft aria-hidden="true" size={17} />
            </Button>
          )
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {navigation.map((group) => {
          const visibleItems = group.items.filter((item) =>
            isNavigationAllowed(item, role, permissions),
          );
          if (visibleItems.length === 0) return null;

          return (
            <section key={group.label}>
              {(!collapsed || mobile) && (
                <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {group.label}
                </h2>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      aria-label={collapsed && !mobile ? item.label : undefined}
                      className={({ isActive }) =>
                        classNames(
                          'flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          collapsed && !mobile ? 'justify-center px-2' : 'gap-3 px-3',
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )
                      }
                      end={item.end}
                      key={item.to}
                      onClick={onNavigate}
                      title={collapsed && !mobile ? item.label : undefined}
                      to={item.to}
                    >
                      {Icon && <Icon aria-hidden="true" className="shrink-0" size={18} />}
                      {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
                      {item.badge && (!collapsed || mobile) && (
                        <span className="ml-auto">{item.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      {!mobile && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          {!collapsed ? (
            <p className="text-xs text-slate-500">Brightloop Software</p>
          ) : (
            <span aria-label="Brightloop Software" className="mx-auto text-xs font-bold text-navy-900">
              B
            </span>
          )}
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({
  children,
  navigation = defaultNavigation,
  notifications = [],
  onLogout,
  onViewAllNotifications,
  profileItems,
  user,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role;
  const permissions = user?.permissions;
  const content = children || <Outlet />;
  const sidebarWidth = collapsed ? 'md:pl-[76px]' : 'md:pl-64';

  return (
    <div className="min-h-screen bg-canvas">
      <div
        className={classNames(
          'fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-150 md:block',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <Sidebar
          collapsed={collapsed}
          navigation={navigation}
          onToggle={() => setCollapsed((value) => !value)}
          permissions={permissions}
          role={role}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 cursor-default bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar
              collapsed={false}
              mobile
              navigation={navigation}
              onNavigate={() => setMobileOpen(false)}
              onToggle={() => setMobileOpen(false)}
              permissions={permissions}
              role={role}
            />
          </div>
        </div>
      )}

      <div className={classNames('min-h-screen transition-[padding] duration-150', sidebarWidth)}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Open navigation"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              size="sm"
              variant="ghost"
            >
              <Menu aria-hidden="true" size={20} />
            </Button>
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <BrandMark />
              <span className="truncate text-sm font-bold text-navy-950">Brightloop</span>
            </div>
            <p className="hidden truncate text-sm font-medium text-slate-500 md:block">
              Subscription workspace
            </p>
            <Button
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden text-slate-500 md:inline-flex"
              onClick={() => setCollapsed((value) => !value)}
              size="sm"
              variant="ghost"
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" size={18} />
              ) : (
                <PanelLeftClose aria-hidden="true" size={18} />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationMenu
              notifications={notifications}
              onViewAll={onViewAllNotifications}
            />
            <ProfileMenu
              onLogout={onLogout}
              profileItems={profileItems}
              role={role}
              user={user}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {content}
        </main>
      </div>
    </div>
  );
}
