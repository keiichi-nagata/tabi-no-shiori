'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendLoginCode, verifyLoginCode } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="page">
        <div className="card">
          <h1>ログインは不要です</h1>
          <p>この環境はデモモードで動作しており、しおりはこのブラウザ内に保存されます。</p>
          <Link className="btn btn-primary" href="/">しおりをつくる</Link>
        </div>
      </div>
    );
  }

  async function requestCode() {
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('メールアドレスの形式を確認してください。');
      return;
    }
    setLoading(true);
    try {
      await sendLoginCode(email);
      setStep('code');
    } catch (e) {
      setError((e as Error).message || '送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  async function submitCode() {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('6桁の数字コードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await verifyLoginCode(email, code);
      router.replace('/history');
    } catch (e) {
      setError((e as Error).message || 'コードが正しくないか、期限切れです。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="panel-navy">
        <span className="stamp-title">ログイン</span>
        <h1 style={{ marginTop: 14 }}>メールのコードでログイン</h1>
        <p style={{ opacity: 0.9, margin: 0 }}>
          パスワード不要。メールに届く6桁のコードをこの画面に入力するだけです
          （履歴保存のためだけに使います）。
        </p>
      </div>

      <div className="card mt-lg">
        {step === 'email' ? (
          <>
            <div className="field">
              <label>メールアドレス</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && requestCode()}
              />
            </div>
            {error && <div className="notice warn">{error}</div>}
            <button className="btn btn-primary mt" onClick={requestCode} disabled={loading}>
              {loading ? <><span className="spinner" /> 送信中…</> : 'コードを送る'}
            </button>
          </>
        ) : (
          <>
            <div className="notice">
              <b>{email}</b> に6桁のコードを送りました。届いたコードを入力してください。
            </div>
            <div className="field mt">
              <label>ログインコード（6桁）</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                style={{ fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', maxWidth: 220 }}
                onKeyDown={(e) => e.key === 'Enter' && submitCode()}
              />
            </div>
            {error && <div className="notice warn">{error}</div>}
            <div className="chips mt">
              <button className="btn btn-primary" onClick={submitCode} disabled={loading}>
                {loading ? <><span className="spinner" /> 確認中…</> : 'ログイン'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setStep('email'); setCode(''); setError(null); }}
                disabled={loading}
              >
                メールを入れ直す
              </button>
              <button className="btn btn-ghost" onClick={requestCode} disabled={loading}>
                コードを再送
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
