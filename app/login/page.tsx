'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInPassword, signUpPassword } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  async function submit() {
    setError(null);
    setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('メールアドレスの形式を確認してください。');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください。');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await signUpPassword(email, password);
        if (needsConfirm) {
          setInfo('確認メールを送りました。メール内のリンクを開いた後、ログインしてください。');
          setMode('signin');
        } else {
          router.replace('/history');
        }
      } else {
        await signInPassword(email, password);
        router.replace('/history');
      }
    } catch (e) {
      setError((e as Error).message || 'うまくいきませんでした。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="panel-navy">
        <span className="stamp-title">ログイン</span>
        <h1 style={{ marginTop: 14 }}>{mode === 'signin' ? 'ログイン' : '新規登録'}</h1>
        <p style={{ opacity: 0.9, margin: 0 }}>
          メールアドレスとパスワードだけ。履歴保存のためだけに使います。
        </p>
      </div>

      <div className="card mt-lg">
        <div className="field">
          <label>メールアドレス</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>パスワード（8文字以上）</label>
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••••••"
          />
        </div>

        {info && <div className="notice">{info}</div>}
        {error && <div className="notice warn">{error}</div>}

        <button className="btn btn-primary mt" onClick={submit} disabled={loading}>
          {loading ? (
            <><span className="spinner" /> 処理中…</>
          ) : mode === 'signin' ? (
            'ログイン'
          ) : (
            'この内容で登録'
          )}
        </button>

        <p className="muted mt">
          {mode === 'signin' ? (
            <>
              はじめての方は{' '}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              登録済みの方は{' '}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
