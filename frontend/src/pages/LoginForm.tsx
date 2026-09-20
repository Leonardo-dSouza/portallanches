import { LoginFields } from './LoginFields';
import { useLoginForm } from './use-login-form';

export function LoginForm() {
  const form = useLoginForm();
  return (
    <form
      className="card login-card"
      onSubmit={(event) => void form.submit(event)}
    >
      <h1>PortalLanches</h1>
      <LoginFields form={form} />
      {form.error && (
        <p role="alert" className="form-error">
          {form.error}
        </p>
      )}
      <button type="submit" className="button" disabled={form.submitting}>
        {form.submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
