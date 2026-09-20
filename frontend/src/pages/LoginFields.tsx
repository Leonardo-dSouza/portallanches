import { TextField } from '../components/TextField';
import type { LoginForm } from './use-login-form';

export function LoginFields({ form }: { form: LoginForm }) {
  return (
    <>
      <TextField
        label="Usuário"
        value={form.username}
        onChange={form.setUsername}
        autoComplete="username"
        autoFocus
        required
      />
      <TextField
        label="Senha"
        type="password"
        value={form.password}
        onChange={form.setPassword}
        autoComplete="current-password"
        required
      />
    </>
  );
}
