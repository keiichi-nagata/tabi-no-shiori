'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendMagicLink } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="page">
        <div className="card">
          <h1>ログインは不要です</h1>
          <p>この環境はデモモードで動作しており、しおりはこのブラウザ内に保存されます。</p>
          <Link className="btn btn-primary" href="/">
            しおりをつくる
          </Link>
        </div>
      </div>
    );
  }

  async function submit() {
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('メールアドレスの形式を確認してください。');
      return;
    }
    setLoading(true);
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (e) {
      setError((e as Error).message || '送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="panel-navy">
        <span className="stamp-title">ログイン</span>
        <h1 style={{ marginTop: 14 }}>メールでかんたんログイン</h1>
        <p style={{ opacity: 0.9, margin: 0 }}>
          パスワードは不要です。届いたメールのリンクを開くとログインが完了します（履歴保存のためだけに使います）。
        </p>
      </div>

      <div className="card mt-lg">
        {sent ? (
          <div className="notice">
            <b>{email}</b> にログイン用リンクを送信しました。メールを開いてリンクをクリックしてください。
          </div>
        ) : (
          <>
            <div className="field">
              <label>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            {error && <div className="notice warn">{error}</div>}
            <button className="btn btn-primary mt" onClick={submit} disabled={loading}>
              {loading ? <><span className="spinner" /> 送信中…</> : 'ログインリンクを送る'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
