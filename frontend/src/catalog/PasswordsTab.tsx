import { KeyRound, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { PasswordApi, UserSummary } from '../api/password-api';
import { useAuth } from '../auth/auth-context';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { usePasswordForm, type PasswordFormState } from './use-password-form';
import { MANAGER_PIN_LENGTH } from './manager-pin-values';
import { useManagerPinForm } from './use-manager-pin-form';

/** Nova e repetir, as duas como senha (nunca aparecem na tela). */
function NewPasswordFields({ form }: { form: PasswordFormState }) {
  return (
    <>
      <TextField
        label={`Senha nova (${form.minLength} ou mais caracteres)`}
        type="password"
        autoComplete="new-password"
        value={form.typed}
        onChange={form.setTyped}
      />
      <TextField
        label="Repita a senha nova"
        type="password"
        autoComplete="new-password"
        value={form.repeated}
        onChange={form.setRepeated}
      />
    </>
  );
}

function FormMessage({ form }: { form: PasswordFormState }) {
  if (!form.message) return null;
  return (
    <p className="hint" role="status">
      {form.message}
    </p>
  );
}

/** A do admin logado: pede a atual; trocar encerra as sessões e é preciso entrar de novo. */
function AdminPasswordForm({ passwords }: { passwords: PasswordApi }) {
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const form = usePasswordForm(
    (password) => passwords.changeOwnPassword(current, password),
    'Senha do admin trocada: as sessões abertas foram encerradas.',
    'ADMIN',
  );
  return (
    <form className="card password-card" onSubmit={form.submit}>
      <h3>Senha do admin</h3>
      <p className="hint">
        É a senha que autoriza no caixa (cancelar fora da trava, diminuir,
        reabrir).
      </p>
      <TextField
        label="Senha atual do admin"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
      />
      <NewPasswordFields form={form} />
      <FormMessage form={form} />
      {form.saved ? (
        <button type="button" className="button" onClick={() => void logout()}>
          <LogIn aria-hidden />
          Entrar de novo
        </button>
      ) : (
        <button
          type="submit"
          className="button"
          disabled={form.busy}
          aria-busy={form.busy}
        >
          <KeyRound aria-hidden />
          Trocar a senha do admin
        </button>
      )}
    </form>
  );
}

interface PinFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

function PinCodeField({ label, value, onChange }: PinFieldProps) {
  return (
    <TextField
      label={label}
      type="password"
      inputMode="numeric"
      autoComplete="new-password"
      maxLength={MANAGER_PIN_LENGTH}
      value={value}
      onChange={onChange}
    />
  );
}

interface PinFieldsProps {
  pin: string;
  repeated: string;
  onPinChange(value: string): void;
  onRepeatedChange(value: string): void;
}

function ManagerPinFields(props: PinFieldsProps) {
  return (
    <>
      <PinCodeField
        label="Código novo (6 números)"
        value={props.pin}
        onChange={props.onPinChange}
      />
      <PinCodeField
        label="Repita o código"
        value={props.repeated}
        onChange={props.onRepeatedChange}
      />
    </>
  );
}

function SavePinButton({ busy }: { busy: boolean }) {
  return (
    <button type="submit" className="button" disabled={busy} aria-busy={busy}>
      <KeyRound aria-hidden />
      Salvar o código
    </button>
  );
}

function PinFormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="hint" role="status">
      {message}
    </p>
  );
}

/** O código do gerente (6 números) do admin logado (2026-11-15). */
function ManagerPinForm({ passwords }: { passwords: PasswordApi }) {
  const form = useManagerPinForm(passwords);
  return (
    <form className="card password-card" onSubmit={form.submit}>
      <h3>Código do gerente</h3>
      {form.situation && <p className="hint">{form.situation}</p>}
      <TextField
        label="Senha de login do admin"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={form.setCurrentPassword}
      />
      <ManagerPinFields
        pin={form.pin}
        repeated={form.repeated}
        onPinChange={form.setPin}
        onRepeatedChange={form.setRepeated}
      />
      <PinFormMessage message={form.message} />
      <SavePinButton busy={form.busy} />
    </form>
  );
}

/** Logins de caixa ativos (normalmente um só, compartilhado). */
function useCashierUsers(passwords: PasswordApi) {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    passwords.listUsers().then(
      (read) =>
        current && setUsers(read.filter((u) => u.role === 'CAIXA' && u.active)),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [passwords]);
  return { users, error };
}

/** A do caixa: o admin troca sem a atual; o caixa entra de novo com a nova. */
function CashierPasswordForm({ passwords }: { passwords: PasswordApi }) {
  const { users, error } = useCashierUsers(passwords);
  const [chosen, setChosen] = useState('');
  const userId = Number(chosen) || users?.[0]?.id;
  const form = usePasswordForm(
    (password) => passwords.resetPassword(userId as number, password),
    'Senha do caixa trocada: o caixa entra de novo com a senha nova.',
    'CAIXA',
  );
  if (error) return <p className="form-error">{error}</p>;
  if (!users) return null;
  if (users.length === 0)
    return <p className="hint">Nenhum login de caixa ativo.</p>;
  return (
    <form className="card password-card" onSubmit={form.submit}>
      <h3>Senha do caixa</h3>
      {users.length > 1 && (
        <SelectField
          label="Login do caixa"
          value={chosen || String(users[0].id)}
          options={users.map((u) => ({
            value: String(u.id),
            label: `${u.name} (${u.username})`,
          }))}
          onChange={setChosen}
        />
      )}
      <NewPasswordFields form={form} />
      <FormMessage form={form} />
      <button
        type="submit"
        className="button"
        disabled={form.busy}
        aria-busy={form.busy}
      >
        <KeyRound aria-hidden />
        Trocar a senha do caixa
      </button>
    </form>
  );
}

/**
 * Cadastros → Comanda e ajustes → Senhas (pedido do usuário, 2026-10-15: "uma forma fácil de
 * alterar a senha do admin e do caixa").
 */
export function PasswordsTab({ passwords }: { passwords: PasswordApi }) {
  return (
    <div className="password-cards">
      <AdminPasswordForm passwords={passwords} />
      <ManagerPinForm passwords={passwords} />
      <CashierPasswordForm passwords={passwords} />
    </div>
  );
}
