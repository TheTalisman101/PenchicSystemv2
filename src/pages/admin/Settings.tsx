import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Save, Bell, AlertCircle, CheckCircle, Settings as SettingsIcon,
  Monitor, Type, Layout, Volume2, Shield, Database, Wifi, HardDrive,
  RefreshCw, Download, RotateCcw, X, Mail, Package, ShoppingCart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PerformanceSettings {
  enable_animations: boolean;
  lazy_loading: boolean;
  cache_duration: number;
  batch_operations: boolean;
  compress_images: boolean;
  prefetch_data: boolean;
  virtual_scrolling: boolean;
  debounce_search: number;
}
interface DataSettings {
  items_per_page: number;
  auto_save_interval: number;
  offline_mode: boolean;
  sync_frequency: number;
  backup_retention: number;
}
interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  order_notifications: boolean;
  system_alerts: boolean;
}
interface DisplaySettings {
  font_size: 'small' | 'medium' | 'large';
  layout_spacing: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  show_tooltips: boolean;
}
interface Toast { message: string; type: 'success' | 'error' }

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_PERFORMANCE: PerformanceSettings = {
  enable_animations: true, lazy_loading: true,   cache_duration: 30,
  batch_operations:  true, compress_images: true, prefetch_data: false,
  virtual_scrolling: true, debounce_search: 300,
};
const DEFAULT_DATA: DataSettings = {
  items_per_page: 25, auto_save_interval: 30, offline_mode: false,
  sync_frequency: 5,  backup_retention: 30,
};
const DEFAULT_NOTIFICATION: NotificationSettings = {
  email_notifications: true, push_notifications: true, low_stock_alerts: true,
  order_notifications: true, system_alerts: true,
};
const DEFAULT_DISPLAY: DisplaySettings = {
  font_size: 'medium', layout_spacing: 'comfortable',
  sidebar_collapsed: false, show_tooltips: true,
};

// ── Static config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'performance',   label: 'Performance',   icon: Monitor      },
  { id: 'data',          label: 'Data & Storage', icon: Database     },
  { id: 'notifications', label: 'Notifications',  icon: Bell         },
  { id: 'display',       label: 'Display',        icon: Layout       },
  { id: 'system',        label: 'System',         icon: SettingsIcon },
] as const;
type TabId = typeof TABS[number]['id'];

const NOTIF_META: Record<keyof NotificationSettings, { icon: React.FC<any>; title: string; desc: string }> = {
  email_notifications: { icon: Mail,         title: 'Email Notifications', desc: 'Receive notifications via email'          },
  push_notifications:  { icon: Bell,         title: 'Push Notifications',  desc: 'Receive browser push notifications'       },
  low_stock_alerts:    { icon: Package,      title: 'Low Stock Alerts',    desc: 'Get alerts when products run low'         },
  order_notifications: { icon: ShoppingCart, title: 'Order Notifications', desc: 'Receive notifications for new orders'     },
  system_alerts:       { icon: Shield,       title: 'System Alerts',       desc: 'Get maintenance and error alerts'         },
};

// ── Reusable primitives ────────────────────────────────────────────────────────
const Toggle: React.FC<{
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button" role="switch" aria-checked={checked} disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.08]
      ${checked ? 'bg-neutral-900' : 'bg-neutral-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
      checked ? 'left-[22px]' : 'left-[3px]'
    }`} />
  </button>
);

const SettingRow: React.FC<{
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  children: React.ReactNode;
  noBorder?: boolean;
}> = ({ icon: Icon, title, description, children, noBorder }) => (
  <div className={`flex items-center justify-between py-4 ${noBorder ? '' : 'border-b border-neutral-100'}`}>
    <div className="flex items-center gap-3 flex-1 mr-6 min-w-0">
      <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const NumberInput: React.FC<{
  label: string; hint?: string; value: number;
  onChange: (v: number) => void; min?: number; max?: number; unit?: string;
}> = ({ label, hint, value, onChange, min = 0, max = Infinity, unit }) => (
  <div>
    <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        type="number" value={value} min={min} max={max}
        onChange={e => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className={`w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl text-neutral-800 bg-white
          focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all
          ${unit ? 'pr-10' : ''}`}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
    {hint && <p className="text-[11px] text-neutral-400 mt-1">{hint}</p>}
  </div>
);

const SettingsSkeleton = () => (
  <div className="animate-pulse space-y-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-200 rounded-lg flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 bg-neutral-200 rounded-full" />
            <div className="w-52 h-2.5 bg-neutral-100 rounded-full" />
          </div>
        </div>
        <div className="w-10 h-[22px] bg-neutral-200 rounded-full" />
      </div>
    ))}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const Settings = () => {
  const navigate = useNavigate();
  const user     = useStore(s => s.user);

  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [activeTab,   setActiveTab]   = useState<TabId>('performance');
  const [dirtyTabs,   setDirtyTabs]   = useState<Set<string>>(new Set());
  const [toast,       setToast]       = useState<Toast | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMsg,  setConfirmMsg]  = useState('');
  const pendingAction = useRef<(() => void) | null>(null);

  const [performance,   setPerformance]   = useState<PerformanceSettings>(DEFAULT_PERFORMANCE);
  const [data,          setData]          = useState<DataSettings>(DEFAULT_DATA);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATION);
  const [display,       setDisplay]       = useState<DisplaySettings>(DEFAULT_DISPLAY);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    loadSettings();
  }, [user, navigate]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  // ── Dirty tracking ─────────────────────────────────────────────────────────
  const markDirty = (tab: string) => setDirtyTabs(p => new Set([...p, tab]));
  const markClean = (tab: string) => setDirtyTabs(p => { const s = new Set(p); s.delete(tab); return s; });

  // ── Confirmation dialog ────────────────────────────────────────────────────
  const openConfirm = (msg: string, action: () => void) => {
    pendingAction.current = action;
    setConfirmMsg(msg);
    setShowConfirm(true);
  };
  const handleConfirm = () => {
    pendingAction.current?.();
    pendingAction.current = null;
    setShowConfirm(false);
  };

  // ── Load — merges saved data with defaults so new keys never go missing ────
  const loadSettings = () => {
    const load = <T extends object>(key: string, defaults: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
      } catch { return defaults; }
    };
    setPerformance(  load('performance_settings',   DEFAULT_PERFORMANCE));
    setData(         load('data_settings',           DEFAULT_DATA));
    setNotifications(load('notification_settings',   DEFAULT_NOTIFICATION));
    setDisplay(      load('display_settings',        DEFAULT_DISPLAY));
    setLoading(false);
  };

  // ── Generic save ───────────────────────────────────────────────────────────
  const save = async (key: string, value: object, tab: string, sideEffect?: () => void) => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 250));
      localStorage.setItem(key, JSON.stringify(value));
      sideEffect?.();
      markClean(tab);
      showToast(`${TABS.find(t => t.id === tab)?.label ?? tab} settings saved`, 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Per-tab saves with DOM side effects ────────────────────────────────────
  const savePerformance = () =>
    save('performance_settings', performance, 'performance', () => {
      if (performance.enable_animations) {
        document.documentElement.style.removeProperty('--animation-duration');
      } else {
        document.documentElement.style.setProperty('--animation-duration', '0s');
      }
    });

  const saveData          = () => save('data_settings',         data,          'data');
  const saveNotifications = () => save('notification_settings', notifications, 'notifications');

  const saveDisplay = () =>
    save('display_settings', display, 'display', () => {
      document.documentElement.style.fontSize =
        display.font_size === 'small' ? '14px' :
        display.font_size === 'large' ? '18px' : '16px';
    });

  // ── System actions ─────────────────────────────────────────────────────────
  const clearCache = () => {
    ['performance_settings', 'data_settings', 'notification_settings', 'display_settings']
      .forEach(k => localStorage.removeItem(k));
    loadSettings();
    showToast('Cache cleared — settings restored to defaults', 'success');
  };

  const refreshSystem = () => window.location.reload();

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({
      performance_settings:  performance,
      data_settings:         data,
      notification_settings: notifications,
      display_settings:      display,
      exported_at:           new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `admin-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Settings exported successfully', 'success');
  };

  const resetDefaults = () => {
    setPerformance(DEFAULT_PERFORMANCE);
    setData(DEFAULT_DATA);
    setNotifications(DEFAULT_NOTIFICATION);
    setDisplay(DEFAULT_DISPLAY);
    ['performance_settings', 'data_settings', 'notification_settings', 'display_settings']
      .forEach(k => localStorage.removeItem(k));
    document.documentElement.style.removeProperty('font-size');
    document.documentElement.style.removeProperty('--animation-duration');
    setDirtyTabs(new Set());
    showToast('All settings reset to factory defaults', 'success');
  };

  const SAVE_FN: Partial<Record<TabId, () => void>> = {
    performance:   savePerformance,
    data:          saveData,
    notifications: saveNotifications,
    display:       saveDisplay,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Settings" subtitle="Configure system settings and preferences">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Tab navigation ────────────────────────────────────────────────── */}
        <div className="lg:w-52 flex-shrink-0">

          {/* Mobile pills */}
          <div className="flex lg:hidden overflow-x-auto gap-1.5 pb-1">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const dirty  = dirtyTabs.has(tab.id);
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap flex-shrink-0 transition-colors ${
                    active ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {dirty && <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${active ? 'bg-white/60' : 'bg-amber-400'}`} />}
                </button>
              );
            })}
          </div>

          {/* Desktop sidebar */}
          <nav className="hidden lg:block bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const dirty  = dirtyTabs.has(tab.id);
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium border-b border-neutral-100 last:border-0 transition-colors ${
                    active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}>
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                  </div>
                  {dirty && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white/60' : 'bg-amber-400'}`} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Content panel ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-neutral-200 shadow-sm">

          {/* Section header */}
          {activeTab !== 'system' && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h3>
                {dirtyTabs.has(activeTab) && (
                  <p className="text-[11px] text-amber-500 font-medium mt-0.5">Unsaved changes</p>
                )}
              </div>
              {SAVE_FN[activeTab] && (
                <button
                  onClick={SAVE_FN[activeTab]}
                  disabled={saving || !dirtyTabs.has(activeTab)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Changes</>
                  }
                </button>
              )}
            </div>
          )}

          <div className="p-6">
            {loading ? <SettingsSkeleton /> : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >

                  {/* ── Performance ───────────────────────────────────────── */}
                  {activeTab === 'performance' && (
                    <div>
                      {([
                        { key: 'enable_animations', icon: Monitor,   title: 'Enable Animations', desc: 'Smooth transitions and micro-interactions'   },
                        { key: 'lazy_loading',       icon: Database,  title: 'Lazy Loading',      desc: 'Load images and data only when visible'      },
                        { key: 'batch_operations',   icon: Shield,    title: 'Batch Operations',  desc: 'Group database operations for efficiency'    },
                        { key: 'compress_images',    icon: HardDrive, title: 'Compress Images',   desc: 'Automatically compress images on upload'     },
                        { key: 'prefetch_data',      icon: Wifi,      title: 'Prefetch Data',     desc: 'Preload data likely to be requested next'    },
                        { key: 'virtual_scrolling',  icon: Type,      title: 'Virtual Scrolling', desc: 'Optimise rendering of long lists and tables' },
                      ] as { key: keyof PerformanceSettings; icon: React.FC<any>; title: string; desc: string }[])
                        .map(({ key, icon, title, desc }, i, arr) => (
                          <SettingRow key={key} icon={icon} title={title} description={desc} noBorder={i === arr.length - 1}>
                            <Toggle
                              checked={performance[key] as boolean}
                              onChange={v => { setPerformance(p => ({ ...p, [key]: v })); markDirty('performance'); }}
                            />
                          </SettingRow>
                        ))
                      }
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 mt-2 border-t border-neutral-100">
                        <NumberInput
                          label="Cache Duration" unit="min"
                          value={performance.cache_duration} min={1} max={1440}
                          hint="How long to cache data locally (1–1440 min)"
                          onChange={v => { setPerformance(p => ({ ...p, cache_duration: v })); markDirty('performance'); }}
                        />
                        <NumberInput
                          label="Search Debounce" unit="ms"
                          value={performance.debounce_search} min={100} max={2000}
                          hint="Delay before search query fires (100–2000 ms)"
                          onChange={v => { setPerformance(p => ({ ...p, debounce_search: v })); markDirty('performance'); }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Data & Storage ────────────────────────────────────── */}
                  {activeTab === 'data' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                            Items Per Page
                          </label>
                          <select
                            value={data.items_per_page}
                            onChange={e => { setData(p => ({ ...p, items_per_page: parseInt(e.target.value) })); markDirty('data'); }}
                            className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all cursor-pointer"
                          >
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} items</option>)}
                          </select>
                          <p className="text-[11px] text-neutral-400 mt-1">Fewer items = faster table loading</p>
                        </div>
                        <NumberInput
                          label="Auto-save Interval" unit="sec"
                          value={data.auto_save_interval} min={10} max={300}
                          hint="How often unsaved drafts are auto-saved"
                          onChange={v => { setData(p => ({ ...p, auto_save_interval: v })); markDirty('data'); }}
                        />
                        <NumberInput
                          label="Sync Frequency" unit="min"
                          value={data.sync_frequency} min={1} max={60}
                          hint="How often to sync data with the server"
                          onChange={v => { setData(p => ({ ...p, sync_frequency: v })); markDirty('data'); }}
                        />
                        <NumberInput
                          label="Backup Retention" unit="days"
                          value={data.backup_retention} min={7} max={365}
                          hint="How long backup snapshots are kept"
                          onChange={v => { setData(p => ({ ...p, backup_retention: v })); markDirty('data'); }}
                        />
                      </div>
                      <div className="border-t border-neutral-100 pt-2">
                        <SettingRow icon={Wifi} title="Offline Mode" description="Enable offline functionality; syncs automatically when back online" noBorder>
                          <Toggle
                            checked={data.offline_mode}
                            onChange={v => { setData(p => ({ ...p, offline_mode: v })); markDirty('data'); }}
                          />
                        </SettingRow>
                      </div>
                    </div>
                  )}

                  {/* ── Notifications ─────────────────────────────────────── */}
                  {activeTab === 'notifications' && (
                    <div>
                      {(Object.keys(DEFAULT_NOTIFICATION) as (keyof NotificationSettings)[])
                        .map((key, i, arr) => {
                          const { icon, title, desc } = NOTIF_META[key];
                          return (
                            <SettingRow key={key} icon={icon} title={title} description={desc} noBorder={i === arr.length - 1}>
                              <Toggle
                                checked={notifications[key]}
                                onChange={v => { setNotifications(p => ({ ...p, [key]: v })); markDirty('notifications'); }}
                              />
                            </SettingRow>
                          );
                        })
                      }
                    </div>
                  )}

                  {/* ── Display ───────────────────────────────────────────── */}
                  {activeTab === 'display' && (
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Font Size</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: 'small',  label: 'Small',  cls: 'text-xs'   },
                            { value: 'medium', label: 'Medium', cls: 'text-sm'   },
                            { value: 'large',  label: 'Large',  cls: 'text-base' },
                          ] as const).map(opt => (
                            <button key={opt.value}
                              onClick={() => { setDisplay(p => ({ ...p, font_size: opt.value })); markDirty('display'); }}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                                display.font_size === opt.value
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                              }`}>
                              <Type className="w-4 h-4" />
                              <span className={opt.cls}>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1.5">Applied to the entire admin interface on save</p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Layout Spacing</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: 'compact',     label: 'Compact',     hint: 'Dense'   },
                            { value: 'comfortable', label: 'Comfortable', hint: 'Default' },
                            { value: 'spacious',    label: 'Spacious',    hint: 'Airy'    },
                          ] as const).map(opt => (
                            <button key={opt.value}
                              onClick={() => { setDisplay(p => ({ ...p, layout_spacing: opt.value })); markDirty('display'); }}
                              className={`flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 transition-all ${
                                display.layout_spacing === opt.value
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                              }`}>
                              <span className="text-xs font-semibold">{opt.label}</span>
                              <span className={`text-[10px] ${display.layout_spacing === opt.value ? 'text-white/60' : 'text-neutral-400'}`}>
                                {opt.hint}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-neutral-100 pt-2">
                        <SettingRow icon={Layout} title="Collapse Sidebar by Default" description="Start the admin panel with the sidebar collapsed">
                          <Toggle
                            checked={display.sidebar_collapsed}
                            onChange={v => { setDisplay(p => ({ ...p, sidebar_collapsed: v })); markDirty('display'); }}
                          />
                        </SettingRow>
                        <SettingRow icon={Volume2} title="Show Tooltips" description="Display helpful tooltips on hover across the interface" noBorder>
                          <Toggle
                            checked={display.show_tooltips}
                            onChange={v => { setDisplay(p => ({ ...p, show_tooltips: v })); markDirty('display'); }}
                          />
                        </SettingRow>
                      </div>
                    </div>
                  )}

                  {/* ── System ────────────────────────────────────────────── */}
                  {activeTab === 'system' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4">System Status</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {([
                            { icon: Database,  label: 'Database',    value: 'Connected',     ok: true  },
                            { icon: Wifi,      label: 'Real-time',   value: 'Active',        ok: true  },
                            { icon: HardDrive, label: 'Storage',     value: '2.4 MB / 1 GB', ok: null  },
                            { icon: Shield,    label: 'Security',    value: 'Secure',        ok: true  },
                          ] as const).map(({ icon: Icon, label, value, ok }) => (
                            <div key={label} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg border border-neutral-200 flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-neutral-500" />
                                </div>
                                <p className="text-sm font-medium text-neutral-900">{label}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                ok === true  ? 'bg-emerald-100 text-emerald-700' :
                                ok === false ? 'bg-red-100 text-red-700'         :
                                               'bg-neutral-100 text-neutral-600'
                              }`}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-neutral-100 pt-5">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4">System Actions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {([
                            {
                              icon: Database, label: 'Clear Cache', hint: 'Reset settings to defaults',
                              danger: false,
                              onClick: () => openConfirm('Remove all cached settings and reload defaults?', clearCache),
                            },
                            {
                              icon: Download, label: 'Export Settings', hint: 'Download as JSON file',
                              danger: false,
                              onClick: exportSettings,
                            },
                            {
                              icon: RefreshCw, label: 'Refresh System', hint: 'Hard reload the application',
                              danger: false,
                              onClick: () => openConfirm('Reload the application? Unsaved changes will be lost.', refreshSystem),
                            },
                            {
                              icon: RotateCcw, label: 'Reset to Defaults', hint: 'Clear all saved preferences',
                              danger: true,
                              onClick: () => openConfirm('Reset ALL settings to factory defaults? This cannot be undone.', resetDefaults),
                            },
                          ]).map(({ icon: Icon, label, hint, danger, onClick }) => (
                            <button key={label} onClick={onClick}
                              className={`flex items-center gap-3 p-4 rounded-xl border text-left group transition-all ${
                                danger
                                  ? 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300'
                                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 hover:border-neutral-300'
                              }`}>
                              <div className={`w-8 h-8 bg-white rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
                                danger ? 'border-red-200 group-hover:border-red-300' : 'border-neutral-200 group-hover:border-neutral-300'
                              }`}>
                                <Icon className={`w-4 h-4 ${danger ? 'text-red-500' : 'text-neutral-500'}`} />
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${danger ? 'text-red-700' : 'text-neutral-900'}`}>{label}</p>
                                <p className={`text-xs mt-0.5 ${danger ? 'text-red-400' : 'text-neutral-400'}`}>{hint}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation dialog ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 text-center">Confirm Action</h3>
              <p className="text-sm text-neutral-500 text-center mt-1.5 mb-6">{confirmMsg}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowConfirm(false); pendingAction.current = null; }}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spring toast ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white shadow-lg shadow-neutral-900/10 border ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500   flex-shrink-0" />
            }
            <span className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default Settings;
