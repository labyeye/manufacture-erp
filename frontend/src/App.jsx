import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { COLORS, SIDEBAR_TABS } from './constants';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      onLogin();
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLORS.bg
      }}
    >
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: '40px',
          width: '100%',
          maxWidth: '400px'
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            color: COLORS.text
          }}
        >
          ManufactureIQ ERP
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 24 }}>
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: COLORS.muted,
                marginBottom: 5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: COLORS.muted,
                marginBottom: 5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: COLORS.red + '22',
                color: COLORS.red,
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 16,
                border: `1px solid ${COLORS.red}44`
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? COLORS.border : COLORS.accent,
              color: loading ? COLORS.muted : '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '12px',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: COLORS.muted,
            textAlign: 'center'
          }}
        >
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, onTabChange, onLogout }) {
  const { user, isAdmin, allowedTabs } = useAuth();

  const visibleTabs = isAdmin
    ? SIDEBAR_TABS
    : SIDEBAR_TABS.filter((tab) => allowedTabs.includes(tab.id));

  return (
    <div
      style={{
        width: 220,
        height: '100vh',
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0
      }}
    >
      <div style={{ padding: '20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: COLORS.accent }}>
          ManufactureIQ
        </h1>
        <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>
          Manufacturing ERP
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              background: activeTab === tab.id ? COLORS.accent + '22' : 'transparent',
              color: activeTab === tab.id ? COLORS.accent : COLORS.text,
              border: activeTab === tab.id ? `1px solid ${COLORS.accent}44` : '1px solid transparent',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              marginBottom: 4,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {tab.icon} {tab.label.replace(/.*\s/, '')}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.bg
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>
          <strong>{user?.name}</strong>
        </div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>
          {user?.role}
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '8px',
            background: COLORS.red + '22',
            color: COLORS.red,
            border: `1px solid ${COLORS.red}44`,
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function MainContent({ activeTab }) {
  return (
    <div
      style={{
        marginLeft: 220,
        padding: 30,
        minHeight: '100vh'
      }}
    >
      <div className="fade">
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          {SIDEBAR_TABS.find((t) => t.id === activeTab)?.label || 'Dashboard'}
        </h2>
        <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 24 }}>
          Welcome to ManufactureIQ ERP System
        </p>

        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 40,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏭</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Module: {activeTab}
          </h3>
          <p style={{ color: COLORS.muted, fontSize: 14 }}>
            The full implementation of this module is under development.
            <br />
            <br />
            This is a working MERN stack application with:
            <br />
            ✓ Authentication & Authorization
            <br />
            ✓ Database Models (MongoDB/Mongoose)
            <br />
            ✓ REST API Backend (Express.js)
            <br />
            ✓ React Frontend with Routing
            <br />
            ✓ Dark Theme UI Components
          </p>

          <div style={{ marginTop: 24, padding: 16, background: COLORS.surface, borderRadius: 8, textAlign: 'left' }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>
              <strong>Next Steps to Complete the Application:</strong>
            </p>
            <ol style={{ fontSize: 12, color: COLORS.text, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Implement remaining API routes and controllers for all modules</li>
              <li>Create page components for each module (Dashboard, Sales, Jobs, etc.)</li>
              <li>Add business logic for stock deduction, schedule building, status updates</li>
              <li>Implement Excel export and PDF generation endpoints</li>
              <li>Build reports and analytics views</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loggedIn, setLoggedIn] = useState(!!user);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  if (!loggedIn || !user) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      <MainContent activeTab={activeTab} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
