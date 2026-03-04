'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import clsx from 'clsx';

import { useAuth } from '@/features/auth/context/AuthContext';
import { ticketsService } from '@/features/support/services/tickets.service';
import type { SupportTicket } from '@/features/support/types/support.types';

const SEEN_KEY_PREFIX = 'lime_notif_seen_';
const DISMISSED_KEY_PREFIX = 'lime_notif_dismissed_';
const POLL_INTERVAL = 60_000;

interface NotificationItem {
  ticket_code: string;
  title: string;
  message: string;
  reply?: string;
  ticket_date: string;
  isNew: boolean;
}

function getSeenCodes(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${SEEN_KEY_PREFIX}${userId}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeenCodes(userId: string, codes: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, JSON.stringify([...codes]));
}

function getDismissedCodes(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${userId}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissedCodes(userId: string, codes: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${DISMISSED_KEY_PREFIX}${userId}`, JSON.stringify([...codes]));
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function buildNotifications(
  tickets: SupportTicket[],
  isAdmin: boolean,
  userId: string,
): NotificationItem[] {
  const seenCodes = getSeenCodes(userId);
  const dismissedCodes = getDismissedCodes(userId);

  if (isAdmin) {
    return tickets
      .filter((t) => !dismissedCodes.has(t.ticket_code))
      .map((t) => ({
        ticket_code: t.ticket_code,
        title: t.title,
        message: `Ticket de ${t.created_by_name ?? 'usuario'}`,
        ticket_date: t.ticket_date,
        isNew: !seenCodes.has(t.ticket_code),
      }));
  }

  // Staff: only show tickets that have at least one admin comment
  return tickets
    .filter(
      (t) =>
        t.created_by === userId &&
        t.comments?.some((c) => c.is_admin) &&
        !dismissedCodes.has(t.ticket_code),
    )
    .map((t) => {
      const lastAdminComment = [...(t.comments ?? [])]
        .reverse()
        .find((c) => c.is_admin);
      return {
        ticket_code: t.ticket_code,
        title: t.title,
        message: `Respondido por ${lastAdminComment?.author_name ?? 'soporte'}`,
        reply: lastAdminComment?.content,
        ticket_date: lastAdminComment?.created_at ?? t.ticket_date,
        isNew: !seenCodes.has(t.ticket_code),
      };
    });
}

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'administrator';
  const isRestricted = user?.role === 'paciente' || user?.role === 'visitante';

  const fetchNotifications = useCallback(async () => {
    if (!user || isRestricted) return;
    setLoading(true);
    try {
      let tickets: SupportTicket[] = [];

      if (isAdmin) {
        tickets = await ticketsService.searchTickets({ status: 'open' });
      } else {
        tickets = await ticketsService.getTickets(0, 50);
      }

      setNotifications(buildNotifications(tickets, isAdmin, user.id));
    } catch {
      // silently ignore fetch errors for notifications
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isRestricted]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (isRestricted || !user) return null;

  function handleToggle() {
    if (!isOpen) {
      // Mark all current notifications as seen
      const seenCodes = getSeenCodes(user!.id);
      notifications.forEach((n) => seenCodes.add(n.ticket_code));
      saveSeenCodes(user!.id, seenCodes);
      setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
    }
    setIsOpen((prev) => !prev);
  }

  function handleDismiss(e: React.MouseEvent, ticketCode: string) {
    e.preventDefault();
    e.stopPropagation();
    const dismissedCodes = getDismissedCodes(user!.id);
    dismissedCodes.add(ticketCode);
    saveDismissedCodes(user!.id, dismissedCodes);
    setNotifications((prev) => prev.filter((n) => n.ticket_code !== ticketCode));
  }

  const unreadCount = notifications.filter((n) => n.isNew).length;
  const isEmpty = notifications.length === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} nuevas` : ''}`}
        aria-expanded={isOpen}
        onClick={handleToggle}
        className={clsx(
          'relative flex items-center justify-center rounded-lg border border-transparent p-2 transition-colors',
          isOpen
            ? 'bg-lime-blue-100 text-lime-blue-600'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800',
        )}
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <BellIcon className="h-5 w-5" aria-hidden="true" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger-500 px-0.5 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full z-50 mt-2 w-80 animate-zoom-in overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-elevation-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h3 className="text-body-sm font-semibold text-neutral-800">Notificaciones</h3>
            {!isEmpty && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-body-xs text-neutral-500">
                {notifications.length}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading && isEmpty ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-lime-blue-500 border-t-transparent" />
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <BellIcon className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                <p className="text-body-sm text-neutral-400">Sin notificaciones</p>
                <p className="text-body-xs text-neutral-300">
                  {isAdmin ? 'No hay tickets abiertos' : 'Aún no hay respuestas a tus tickets'}
                </p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-neutral-100">
                {notifications.map((n) => (
                  <li key={n.ticket_code}>
                    <Link
                      href="/support"
                      onClick={() => setIsOpen(false)}
                      className={clsx(
                        'flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-neutral-50',
                        n.isNew && 'bg-lime-blue-50',
                      )}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <span
                          className={clsx(
                            'block h-2 w-2 rounded-full',
                            n.isNew ? 'bg-lime-blue-500' : 'bg-neutral-200',
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={clsx(
                              'truncate text-body-sm',
                              n.isNew ? 'font-semibold text-neutral-800' : 'font-medium text-neutral-600',
                            )}
                          >
                            {n.title}
                          </p>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {n.isNew && (
                              <span className="rounded-full bg-lime-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-lime-blue-700">
                                Nuevo
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label="Descartar notificación"
                              onClick={(e) => handleDismiss(e, n.ticket_code)}
                              className="rounded p-0.5 text-neutral-300 transition-colors hover:bg-neutral-200 hover:text-neutral-600"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-0.5 text-body-xs text-neutral-500">{n.message}</p>
                        {n.reply && (
                          <p className="mt-1 line-clamp-2 rounded-md bg-neutral-100 px-2 py-1.5 text-body-xs italic text-neutral-600">
                            "{n.reply}"
                          </p>
                        )}
                        <p className="mt-1 text-body-xs text-neutral-400">{formatDate(n.ticket_date)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 px-4 py-2.5">
            <Link
              href="/support"
              onClick={() => setIsOpen(false)}
              className="block text-center text-body-xs font-medium text-lime-blue-600 hover:text-lime-blue-700"
            >
              Ver todos los tickets de soporte →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
