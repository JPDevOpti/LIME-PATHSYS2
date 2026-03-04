'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PencilSquareIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

import { useAuth } from '@/features/auth/context/AuthContext';

const PWD_KEY = 'lime_pwd_acknowledged_';
const SESSION_KEY = 'lime_onboarding_snooze_';

function getFlag(key: string, userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`${key}${userId}`) === '1';
}

function setFlag(key: string, userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${key}${userId}`, '1');
}

function getSnoozed(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(`${SESSION_KEY}${userId}`) === '1';
}

function setSnoozed(userId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${SESSION_KEY}${userId}`, '1');
}

export function OnboardingReminder() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [pwdAcknowledged, setPwdAcknowledged] = useState(false);

  const isPathologist = user?.role === 'pathologist' || user?.role === 'resident';
  const hasSignature = !!user?.signature;

  useEffect(() => {
    if (!user || !isPathologist) return;

    const pwdDone = getFlag(PWD_KEY, user.id);
    const snoozed = getSnoozed(user.id);

    setPwdAcknowledged(pwdDone);

    const needsSignature = !hasSignature;
    const needsPassword = !pwdDone;

    if ((needsSignature || needsPassword) && !snoozed) {
      // Small delay so the layout renders first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, isPathologist, hasSignature]);

  if (!visible || !user) return null;

  const signatureDone = hasSignature;

  function handleAcknowledgePassword() {
    if (!user) return;
    setFlag(PWD_KEY, user.id);
    setPwdAcknowledged(true);
    checkAndClose(signatureDone, true);
  }

  function handleSnooze() {
    if (!user) return;
    setSnoozed(user.id);
    setVisible(false);
  }

  function handleClose() {
    if (!user) return;
    setSnoozed(user.id);
    setVisible(false);
  }

  function checkAndClose(sigDone: boolean, pwdDone: boolean) {
    if (sigDone && pwdDone) {
      setTimeout(() => setVisible(false), 800);
    }
  }

  const allDone = signatureDone && pwdAcknowledged;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={handleSnooze}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-zoom-in rounded-2xl bg-white shadow-elevation-lg">
        {/* Close button */}
        <button
          type="button"
          aria-label="Recordar más tarde"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-8 pb-4 pt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-warning-600" aria-hidden="true" />
            </span>
            <div>
              <h2 id="onboarding-title" className="text-title-sm text-neutral-900">
                Configura tu cuenta
              </h2>
              <p className="mt-0.5 text-body-sm text-neutral-500">
                Completa estos pasos para comenzar a usar el sistema correctamente.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-8 border-t border-neutral-100" />

        {/* Steps */}
        <div className="space-y-3 px-8 py-5">
          {/* Step 1 — Firma */}
          <div
            className={clsx(
              'flex items-start gap-4 rounded-xl border p-4 transition-colors',
              signatureDone
                ? 'border-success-200 bg-success-50'
                : 'border-warning-200 bg-warning-50',
            )}
          >
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                signatureDone ? 'bg-success-100' : 'bg-warning-100',
              )}
            >
              {signatureDone ? (
                <CheckCircleSolid className="h-6 w-6 text-success-600" aria-hidden="true" />
              ) : (
                <PencilSquareIcon className="h-5 w-5 text-warning-600" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={clsx(
                  'text-body-sm font-semibold',
                  signatureDone ? 'text-success-800' : 'text-warning-800',
                )}
              >
                {signatureDone ? 'Firma registrada' : 'Sube tu firma digital'}
              </p>
              <p
                className={clsx(
                  'mt-0.5 text-body-xs',
                  signatureDone ? 'text-success-600' : 'text-warning-600',
                )}
              >
                {signatureDone
                  ? 'Tu firma ya está configurada y lista para usar.'
                  : 'Tu firma es obligatoria para poder firmar y emitir informes médicos.'}
              </p>
            </div>
            {!signatureDone && (
              <Link
                href="/profile"
                onClick={handleSnooze}
                className="flex-shrink-0 rounded-lg bg-warning-500 px-3 py-1.5 text-body-xs font-semibold text-white transition-colors hover:bg-warning-600"
              >
                Ir ahora
              </Link>
            )}
          </div>

          {/* Step 2 — Contraseña */}
          <div
            className={clsx(
              'flex items-start gap-4 rounded-xl border p-4 transition-colors',
              pwdAcknowledged
                ? 'border-success-200 bg-success-50'
                : 'border-lime-blue-200 bg-lime-blue-50',
            )}
          >
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                pwdAcknowledged ? 'bg-success-100' : 'bg-lime-blue-100',
              )}
            >
              {pwdAcknowledged ? (
                <CheckCircleSolid className="h-6 w-6 text-success-600" aria-hidden="true" />
              ) : (
                <LockClosedIcon className="h-5 w-5 text-lime-blue-600" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={clsx(
                  'text-body-sm font-semibold',
                  pwdAcknowledged ? 'text-success-800' : 'text-lime-blue-800',
                )}
              >
                {pwdAcknowledged ? 'Contraseña actualizada' : 'Cambia tu contraseña'}
              </p>
              <p
                className={clsx(
                  'mt-0.5 text-body-xs',
                  pwdAcknowledged ? 'text-success-600' : 'text-lime-blue-600',
                )}
              >
                {pwdAcknowledged
                  ? 'Tu contraseña ha sido actualizada correctamente.'
                  : 'Por seguridad, actualiza tu contraseña antes de continuar usando el sistema.'}
              </p>
            </div>
            {!pwdAcknowledged && (
              <div className="flex flex-shrink-0 flex-col gap-1.5">
                <Link
                  href="/profile"
                  onClick={handleSnooze}
                  className="rounded-lg bg-lime-blue-500 px-3 py-1.5 text-center text-body-xs font-semibold text-white transition-colors hover:bg-lime-blue-600"
                >
                  Cambiar
                </Link>
                <button
                  type="button"
                  onClick={handleAcknowledgePassword}
                  className="rounded-lg border border-lime-blue-200 px-3 py-1.5 text-body-xs font-medium text-lime-blue-600 transition-colors hover:bg-lime-blue-100"
                >
                  Ya la cambié
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-neutral-100 bg-neutral-50 px-8 py-4">
          {allDone ? (
            <div className="flex w-full items-center justify-center gap-2 text-success-600">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
              <span className="text-body-sm font-semibold">
                ¡Todo listo! Tu cuenta está configurada.
              </span>
            </div>
          ) : (
            <>
              <p className="text-body-xs text-neutral-400">
                Puedes completarlo más tarde desde tu perfil.
              </p>
              <button
                type="button"
                onClick={handleSnooze}
                className="text-body-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
              >
                Recordar más tarde
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
