import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NotificationItem } from '../types';
import { Bell, CheckCheck, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react';

interface NotificationsViewProps {
  onNavigate?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!user) {
      setLoading(false);
      setNotifications([]);
      return;
    }
    try {
      setLoading(true);
      const data = await apiFetch('/api/notifications');
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t.navNotifications}</h2>
            <p className="text-xs text-slate-500">
              {'Important alerts and application status updates'}
            </p>
          </div>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{t.markAllRead}</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">{t.loading}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 flex items-start gap-3 transition cursor-pointer hover:bg-slate-50/80 ${
                !n.isRead ? 'bg-blue-50/30' : 'bg-white'
              }`}
            >
              <div className="mt-0.5">
                {n.type === 'DEFICIENCY' ? (
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : n.type === 'SUCCESS' ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                    {n.titleEn}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {n.messageEn}
                </p>

                {n.type === 'DEFICIENCY' && onNavigate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('deficiencies');
                    }}
                    className="mt-2 text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>Resolve Deficiency Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
