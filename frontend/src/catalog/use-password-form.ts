import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import {
  MIN_PASSWORD_LENGTH,
  parseNewPassword,
  type PasswordRole,
} from './password-values';

export interface PasswordFormState {
  typed: string;
  setTyped(value: string): void;
  repeated: string;
  setRepeated(value: string): void;
  message: string | null;
  /** Mínimo de caracteres do perfil que ganha a senha. */
  minLength: number;
  /** Já trocou: a tela mostra o que fazer depois (ex.: entrar de novo). */
  saved: boolean;
  busy: boolean;
  submit(event: FormEvent): Promise<void>;
}

/**
 * Senha nova digitada duas vezes e gravada por `save`; os campos se limpam ao trocar.
 *
 * `role` é o perfil de quem ganha a senha nova (o mínimo muda: admin 10, caixa 8).
 *
 * @example const form = usePasswordForm((pw) => api.resetPassword(2, pw), 'Senha do caixa trocada.', 'CAIXA');
 */
export function usePasswordForm(
  save: (password: string) => Promise<void>,
  done: string,
  role: PasswordRole,
): PasswordFormState {
  const [typed, setTyped] = useState('');
  const [repeated, setRepeated] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseNewPassword(typed, repeated, role);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      await save(parsed.value);
      setTyped('');
      setRepeated('');
      setSaved(true);
      setMessage(done);
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return {
    typed,
    setTyped,
    repeated,
    setRepeated,
    message,
    minLength: MIN_PASSWORD_LENGTH[role],
    saved,
    busy,
    submit,
  };
}
