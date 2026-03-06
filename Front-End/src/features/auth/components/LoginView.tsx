'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowRightOnRectangleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

import { BaseButton, BaseInput, BaseCheckbox } from '@/shared/components/base';
import { useAuth } from '../context/AuthContext';

export function LoginView() {
  const { login, error, clearError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login({ email, password, remember_me: rememberMe });
    } catch {
      // Error is set by login
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = () => {
    if (error) clearError();
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <Image
          src="/image.png?v=20260306"
          alt="Fondo"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#001730]/85" />
      </div>

      <div className="relative min-h-screen p-4 sm:p-6 z-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl mx-auto mb-3 sm:mb-6 text-center relative z-20 animate-fade-in">
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 lg:gap-12">
            <div className="inline-block transition-all duration-500 hover:scale-110 hover:-translate-y-2">
              <Image
                src="/Logo-LIME-NoFondo.png"
                alt="Logo LIME"
                width={128}
                height={128}
                className="w-24 sm:w-28 lg:w-32 h-auto rounded-xl filter drop-shadow-xl brightness-0 invert"
              />
            </div>
            <div className="inline-block transition-all duration-500 hover:scale-110 hover:-translate-y-2">
              <Image
                src="/Banner_UDEA.png"
                alt="Logo Universidad de Antioquia"
                width={208}
                height={80}
                className="w-32 sm:w-40 lg:w-52 h-auto mx-auto rounded-xl filter drop-shadow-xl brightness-0 invert"
              />
            </div>
            <div className="inline-block transition-all duration-500 hover:scale-110 hover:-translate-y-2">
              <Image
                src="/Banner_HAMA.png"
                alt="Logo Hospital Alma Mater"
                width={256}
                height={80}
                className="w-40 sm:w-48 lg:w-64 h-auto mx-auto filter drop-shadow-xl brightness-0 invert"
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border border-gray-100 animate-fade-in-up transition-all duration-500 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.2)] relative z-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full filter blur-3xl opacity-30 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-100 to-teal-100 rounded-full filter blur-3xl opacity-30 -ml-16 -mb-16" />

          <div className="relative z-10">
            <div className="mb-8 sm:mb-10 text-center">
              <h1 className="mb-3 font-bold text-gray-800 text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                Bienvenido de nuevo
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                Ingrese sus credenciales para acceder al sistema
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
              <BaseInput
                type="text"
                label="Correo electrónico / Número de documento"
                placeholder="correo@ejemplo.com o número de documento"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleFieldChange();
                }}
                autoComplete="username"
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-body-sm font-medium text-neutral-700"
                >
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      handleFieldChange();
                    }}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-10 text-body-md text-neutral-900 placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <BaseCheckbox
                  label="Mantener sesión"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                >
                  <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}
              <div className="pt-2 sm:pt-4">
                <BaseButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  block
                  disabled={isSubmitting || isLoading}
                  startIcon={<ArrowRightOnRectangleIcon className="w-5 h-5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                </BaseButton>
              </div>
            </form>
          </div>
        </div>

        <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-300 relative z-20 animate-fade-in">
          © 2026 PathSys LIME - Sistema de Gestión de Patología
        </p>
      </div>
    </div>
  );
}
