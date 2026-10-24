import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { api } from './api';
import type { Session } from './types';
import { Brand } from './components/Brand';
import { CarArt } from './components/CarArt';

export function AuthPage({ onSignIn }: { onSignIn: (session: Session) => void }) {
  const [register, setRegister] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const body = { email, password, ...(register ? { name: form.get('name') } : {}) };
      onSignIn(
        await api<Session>(`/auth/${register ? 'register' : 'login'}`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  function fillDemo(role: 'admin' | 'customer') {
    setEmail(`${role}@demo.local`);
    setPassword(role === 'admin' ? 'AdminDemo123!' : 'CustomerDemo123!');
    setError('');
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="eyebrow">A CLEARER VIEW OF YOUR SHOWROOM</span>
          <h1>
            Good inventory.
            <br />
            Great journeys.
          </h1>
          <p>
            Every vehicle, every update, one place.
            <br />A little less admin. A lot more drive.
          </p>
          <div className="auth-car">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <CarArt category="SUV" color="#c2d69e" />
          </div>
          <div className="auth-benefits">
            {['Know what’s in stock', 'Find the perfect fit', 'Keep every update in view'].map(
              (text) => (
                <span key={text}>
                  <Check size={15} />
                  {text}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="auth-footer">
          BUILT FOR THE EVERYDAY BUSINESS OF CARS <span>↗</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="small-label">LET’S GET YOU MOVING</span>
          <h2>{register ? 'Your next journey starts here.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'Create an account to explore and purchase vehicles.'
              : 'Sign in to your Motorstock account.'}
          </p>
          <form onSubmit={submit} className="auth-form">
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'At least 8 characters' : 'Enter your password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={register ? 8 : 1}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="button primary auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Motorstock?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          {!register && (
            <div className="demo-box">
              <span className="small-label">TAKE IT FOR A SPIN</span>
              <p>Use a demo account to explore the showroom.</p>
              <div className="flex gap-2">
                <button className="button secondary" onClick={() => fillDemo('customer')}>
                  Customer demo
                </button>
                <button className="button secondary" onClick={() => fillDemo('admin')}>
                  Admin demo
                </button>
              </div>
            </div>
          )}
          <p className="auth-caption">Your showroom. All in one place.</p>
        </div>
      </section>
    </main>
  );
}
