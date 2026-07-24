'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AdminHome() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [extensions, setExtensions] = useState<any>(null);
  const [error, setError] = useState('');

  async function login() {
    setError('');
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Login failed');
      return;
    }
    setToken(data.token);
    setWorkspaces(data.workspaces || []);
    if (data.workspaces?.[0]) {
      const wid = data.workspaces[0].id;
      const dash = await fetch(`${API}/admin/workspaces/${wid}/dashboard`, {
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((r) => r.json());
      setDashboard(dash);
      const ext = await fetch(`${API}/admin/extensions`, {
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((r) => r.json());
      setExtensions(ext);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>NeoStore Admin</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>Workspace console · Extensions · Commerce</p>

      {!token ? (
        <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={input} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={input}
          />
          <button onClick={login} style={btn}>
            Sign in
          </button>
          {error ? <p style={{ color: '#f87171' }}>{error}</p> : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          <section style={card}>
            <h2>Dashboard</h2>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(dashboard, null, 2)}</pre>
            <p>Workspaces: {workspaces.map((w) => w.slug).join(', ')}</p>
          </section>
          <section style={card}>
            <h2>Extensions</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {JSON.stringify(extensions?.installed?.slice?.(0, 8) || extensions, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </main>
  );
}

const input: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #2a2f3a',
  background: '#12151a',
  color: '#fff',
};
const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 0,
  background: '#3b82f6',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};
const card: React.CSSProperties = {
  border: '1px solid #222833',
  borderRadius: 16,
  padding: 20,
  background: '#12151a',
};
