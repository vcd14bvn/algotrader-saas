import { useState, useEffect } from 'react';
import { settingsAPI } from '../lib/api';

const BROKERS = [
  { value: 'angel_one', label: 'Angel One (SmartAPI)' },
  { value: 'zerodha', label: 'Zerodha (Kite Connect)' },
  { value: 'upstox', label: 'Upstox' },
  { value: 'fyers', label: 'Fyers' },
  { value: 'dhan', label: 'Dhan' },
  { value: 'fivepaisa', label: '5Paisa' },
];

const BROKER_FIELDS = {
  angel_one: [
    { key: 'angel_api_key', label: 'API Key', type: 'password', placeholder: 'Enter API Key' },
    { key: 'angel_client_id', label: 'Client ID', type: 'text', placeholder: 'e.g. D12345678' },
    { key: 'angel_mpin', label: 'MPIN', type: 'password', placeholder: '4-digit MPIN' },
    { key: 'angel_totp_secret', label: 'TOTP Secret (Optional)', type: 'password', placeholder: 'Optional' },
  ],
  zerodha: [
    { key: 'zerodha_api_key', label: 'API Key', type: 'text', placeholder: 'Kite Connect API Key' },
    { key: 'zerodha_api_secret', label: 'API Secret', type: 'password', placeholder: 'Kite Connect API Secret' },
    { key: 'zerodha_user_id', label: 'User ID', type: 'text', placeholder: 'e.g. AB1234' },
    { key: 'zerodha_password', label: 'Password', type: 'password', placeholder: 'Login password' },
    { key: 'zerodha_totp_secret', label: 'TOTP Secret', type: 'password', placeholder: 'For 2FA automation' },
  ],
  upstox: [
    { key: 'upstox_api_key', label: 'API Key', type: 'text', placeholder: 'Upstox API Key' },
    { key: 'upstox_api_secret', label: 'API Secret', type: 'password', placeholder: 'Upstox API Secret' },
    { key: 'upstox_redirect_url', label: 'Redirect URL', type: 'text', placeholder: 'https://yourapp.com/callback' },
  ],
  fyers: [
    { key: 'fyers_client_id', label: 'Client ID (App ID)', type: 'text', placeholder: 'e.g. ABCDE-100' },
    { key: 'fyers_secret_key', label: 'Secret Key', type: 'password', placeholder: 'Fyers Secret Key' },
    { key: 'fyers_redirect_url', label: 'Redirect URL', type: 'text', placeholder: 'https://yourapp.com/callback' },
  ],
  dhan: [
    { key: 'dhan_client_id', label: 'Client ID', type: 'text', placeholder: 'Dhan Client ID' },
    { key: 'dhan_access_token', label: 'Access Token', type: 'password', placeholder: 'Dhan Access Token' },
  ],
  fivepaisa: [
    { key: 'fivepaisa_client_code', label: 'Client Code', type: 'text', placeholder: '5Paisa Client Code' },
    { key: 'fivepaisa_app_name', label: 'App Name', type: 'text', placeholder: 'Your registered app name' },
    { key: 'fivepaisa_user_key', label: 'User Key', type: 'password', placeholder: '5Paisa User Key' },
    { key: 'fivepaisa_encryption_key', label: 'Encryption Key', type: 'password', placeholder: '5Paisa Encryption Key' },
    { key: 'fivepaisa_password', label: 'Password', type: 'password', placeholder: 'Login password' },
  ],
};

const defaultSettings = {
  broker_type: 'angel_one',
  angel_api_key: '', angel_client_id: '', angel_mpin: '', angel_totp_secret: '',
  zerodha_api_key: '', zerodha_api_secret: '', zerodha_user_id: '', zerodha_password: '', zerodha_totp_secret: '',
  upstox_api_key: '', upstox_api_secret: '', upstox_redirect_url: '',
  fyers_client_id: '', fyers_secret_key: '', fyers_redirect_url: '',
  dhan_client_id: '', dhan_access_token: '',
  fivepaisa_client_code: '', fivepaisa_app_name: '', fivepaisa_user_key: '', fivepaisa_encryption_key: '', fivepaisa_password: '',
  paper_trade: true, banknifty_half_lot: true, orb_enabled: true, vwap_enabled: true, cpr_enabled: true,
  nifty_enabled: true, banknifty_enabled: true, sensex_enabled: true,
  capital: 200000, risk_per_trade: 1.0, max_daily_loss: 2.0, max_trades_per_day: 3,
  squareoff_time: '15:15',
  telegram_bot_token: '', telegram_chat_id: '',
  signal_alert: true, t1_alert: true, t2_alert: true, sl_alert: true, daily_summary: true,
};

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [testOk, setTestOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await settingsAPI.get();
        setSettings(prev => ({ ...prev, ...data }));
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.save(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleTestBroker = async () => {
    setTestResult('');
    try {
      const { data } = await settingsAPI.testBroker();
      setTestResult(data.message);
      setTestOk(true);
    } catch (e) {
      setTestResult(e.response?.data?.detail || 'Connection failed');
      setTestOk(false);
    }
    setTimeout(() => setTestResult(''), 4000);
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const Toggle = ({ label, field }) => (
    <div className="toggle-container">
      <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{label}</span>
      <button className={`toggle ${settings[field] ? 'active' : ''}`} onClick={() => update(field, !settings[field])} />
    </div>
  );

  const selectedBroker = settings.broker_type || 'angel_one';
  const brokerFields = BROKER_FIELDS[selectedBroker] || [];
  const brokerLabel = BROKERS.find(b => b.value === selectedBroker)?.label || selectedBroker;

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {/* Broker Selection */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#818CF8' }}>🔗 Broker Connection</h3>

        {/* Broker Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Select Broker</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BROKERS.map(broker => (
              <button
                key={broker.value}
                type="button"
                onClick={() => update('broker_type', broker.value)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: selectedBroker === broker.value ? 700 : 500,
                  color: selectedBroker === broker.value ? '#fff' : 'var(--color-muted)',
                  background: selectedBroker === broker.value
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(129,140,248,0.3))'
                    : 'rgba(255,255,255,0.04)',
                  border: selectedBroker === broker.value
                    ? '1px solid rgba(129,140,248,0.4)'
                    : '1px solid var(--color-border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {broker.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Broker Fields */}
        <div style={{ display: 'grid', gap: 12 }}>
          {brokerFields.length > 1
            ? (() => {
                // Group password fields in pairs side-by-side when possible
                const rows = [];
                let i = 0;
                while (i < brokerFields.length) {
                  const f = brokerFields[i];
                  const next = brokerFields[i + 1];
                  // Put two password/secret fields side by side
                  if (f.type === 'password' && next && next.type === 'password') {
                    rows.push(
                      <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                          <input className="input-field" type={f.type} value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{next.label}</label>
                          <input className="input-field" type={next.type} value={settings[next.key] || ''} onChange={e => update(next.key, e.target.value)} placeholder={next.placeholder} />
                        </div>
                      </div>
                    );
                    i += 2;
                  } else {
                    rows.push(
                      <div key={f.key}>
                        <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                        <input className="input-field" type={f.type} value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} />
                      </div>
                    );
                    i++;
                  }
                }
                return rows;
              })()
            : brokerFields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input className="input-field" type={f.type} value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} />
              </div>
            ))
          }

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleTestBroker}>
              Test {brokerLabel} Connection
            </button>
            {testResult && (
              <div style={{ fontSize: 13, color: testOk ? '#34D399' : '#FCA5A5' }}>{testResult}</div>
            )}
          </div>
        </div>
      </div>

      {/* Trading Mode */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#FCD34D' }}>⚡ Trading Mode</h3>
        <Toggle label="Paper Trade Mode" field="paper_trade" />
        {!settings.paper_trade && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, marginTop: 8, fontSize: 12, color: '#FCA5A5' }}>
            ⚠️ LIVE MODE: Real money will be used. Actual orders will be placed on {brokerLabel}.
          </div>
        )}
      </div>

      {/* Strategies */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#34D399' }}>📊 Strategies</h3>
        <Toggle label="AlphaX OB Strategy (Order Block)" field="ob_enabled" />
        <Toggle label="BankNifty Half Lot (reduces DD 69%)" field="banknifty_half_lot" />
        <Toggle label="ORB Breakout" field="orb_enabled" />
        <Toggle label="VWAP Bounce" field="vwap_enabled" />
        <Toggle label="CPR Filter" field="cpr_enabled" />
      </div>

      {/* Instruments */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 Instruments</h3>
        <Toggle label="NIFTY 50" field="nifty_enabled" />
        <Toggle label="BANK NIFTY" field="banknifty_enabled" />
        <Toggle label="SENSEX" field="sensex_enabled" />
      </div>

      {/* Risk */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#EF4444' }}>🛡️ Risk Management</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>Capital (₹)</label>
            <input className="input-field" type="number" value={settings.capital} onChange={e => update('capital', Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Risk per Trade</span><span style={{ fontFamily: 'var(--font-mono)' }}>{settings.risk_per_trade}%</span>
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value={settings.risk_per_trade} onChange={e => update('risk_per_trade', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Max Daily Loss</span><span style={{ fontFamily: 'var(--font-mono)' }}>{settings.max_daily_loss}%</span>
            </label>
            <input type="range" min="1" max="5" step="0.5" value={settings.max_daily_loss} onChange={e => update('max_daily_loss', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Max Trades / Day</span><span style={{ fontFamily: 'var(--font-mono)' }}>{settings.max_trades_per_day}</span>
            </label>
            <input type="range" min="1" max="5" step="1" value={settings.max_trades_per_day} onChange={e => update('max_trades_per_day', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Telegram */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#38BDF8' }}>📱 Telegram Alerts</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>Bot Token</label>
            <input className="input-field" type="password" value={settings.telegram_bot_token} onChange={e => update('telegram_bot_token', e.target.value)} placeholder="From @BotFather" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>Chat ID</label>
            <input className="input-field" value={settings.telegram_chat_id} onChange={e => update('telegram_chat_id', e.target.value)} placeholder="e.g. -1001234567890" />
          </div>
          <Toggle label="Signal Alerts" field="signal_alert" />
          <Toggle label="T1 Hit" field="t1_alert" />
          <Toggle label="T2 Hit" field="t2_alert" />
          <Toggle label="Stop Loss Hit" field="sl_alert" />
          <Toggle label="Daily Summary" field="daily_summary" />
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
