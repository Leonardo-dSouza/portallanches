import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { PasswordApi } from '../api/password-api';
import {
  cleanPinDigits,
  managerPinSituation,
  parseManagerPin,
} from './manager-pin-values';

export interface ManagerPinFormState {
  currentPassword: string;
  setCurrentPassword(value: string): void;
  pin: string;
  setPin(value: string): void;
  repeated: string;
  setRepeated(value: string): void;
  situation: string | null;
  message: string | null;
  busy: boolean;
  submit(event: FormEvent): Promise<void>;
}

function useManagerPinStatus(passwords: PasswordApi) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    passwords.managerPinStatus().then(
      (status) => active && setConfigured(status.configured),
      (failure) => active && setLoadError(errorMessage(failure)),
    );
    return () => {
      active = false;
    };
  }, [passwords]);
  const situation =
    configured !== null ? managerPinSituation(configured) : null;
  return { situation, setConfigured, loadError };
}

function usePinFields() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [pin, setPin] = useState('');
  const [repeated, setRepeated] = useState('');
  const resetFields = () => {
    setCurrentPassword('');
    setPin('');
    setRepeated('');
  };
  return {
    currentPassword,
    setCurrentPassword,
    pin,
    setPin: (val: string) => setPin(cleanPinDigits(val)),
    repeated,
    setRepeated: (val: string) => setRepeated(cleanPinDigits(val)),
    resetFields,
  };
}

interface SubmitParams {
  passwords: PasswordApi;
  currentPassword: string;
  pin: string;
  repeated: string;
  resetFields(): void;
  onSuccess(): void;
  setMessage(msg: string): void;
  setBusy(busy: boolean): void;
}

async function handlePinSubmit(params: SubmitParams): Promise<void> {
  const parsed = parseManagerPin(params.pin, params.repeated);
  if (!parsed.ok) return params.setMessage(parsed.error);
  params.setBusy(true);
  try {
    await params.passwords.setManagerPin(params.currentPassword, parsed.value);
    params.resetFields();
    params.onSuccess();
    params.setMessage('Código do gerente salvo.');
  } catch (failure) {
    params.setMessage(errorMessage(failure));
  } finally {
    params.setBusy(false);
  }
}

/**
 * Lógica do cartão "Código do gerente" na aba Senhas (2026-11-15).
 * Confere 6 números e igualdade no front; limpa os campos ao salvar.
 */
export function useManagerPinForm(passwords: PasswordApi): ManagerPinFormState {
  const status = useManagerPinStatus(passwords);
  const fields = usePinFields();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await handlePinSubmit({
      passwords,
      ...fields,
      onSuccess: () => status.setConfigured(true),
      setMessage,
      setBusy,
    });
  };
  return {
    ...fields,
    situation: status.situation,
    message: message ?? status.loadError,
    busy,
    submit,
  };
}
