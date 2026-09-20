import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/auth-context';

export interface LoginForm {
  username: string;
  password: string;
  error: string | null;
  submitting: boolean;
  setUsername(value: string): void;
  setPassword(value: string): void;
  submit(event: FormEvent): Promise<void>;
}

const messageOf = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Não foi possível entrar. Tente novamente.';

/** Estado e envio do formulário de login; o erro exibido é a mensagem do backend. */
export function useLoginForm(): LoginForm {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (caught) {
      setError(messageOf(caught));
      setSubmitting(false);
    }
  }

  return {
    username,
    password,
    error,
    submitting,
    setUsername,
    setPassword,
    submit,
  };
}
