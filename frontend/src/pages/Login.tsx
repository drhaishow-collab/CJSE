import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  apiUrl: string;
  staticMode?: boolean;
  demoUser?: any;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, apiUrl, staticMode = false, demoUser }) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) {
      setError('Vui lòng nhập mã nhân sự.');
      return;
    }

    if (staticMode) {
      onLoginSuccess({
        ...(demoUser || {}),
        username: employeeCode.trim(),
        code: employeeCode.trim(),
        name: demoUser?.name || employeeCode.trim(),
        full_name: demoUser?.full_name || employeeCode.trim(),
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: employeeCode.trim() }),
      });

      const contentType = response.headers.get('content-type') || '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.error;
        throw new Error(message || 'Đăng nhập không thành công.');
      }

      onLoginSuccess(responseBody);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Mã nhân sự không đúng hoặc hệ thống đang bảo trì.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (code: string) => {
    setEmployeeCode(code);
    setError(null);
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1b75bc 100%);
          font-family: 'Outfit', sans-serif;
          padding: 20px;
          color: #f8fafc;
          position: relative;
          overflow: hidden;
        }

        /* Ambient background glow elements */
        .login-page::before, .login-page::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          z-index: 0;
        }

        .login-page::before {
          width: 400px;
          height: 400px;
          background: #f7941d;
          top: -100px;
          left: -100px;
        }

        .login-page::after {
          width: 500px;
          height: 500px;
          background: #e31837;
          bottom: -150px;
          right: -100px;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px 30px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .login-logo {
          margin-bottom: 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .login-logo-sub {
          font-size: 0.85rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }

        .login-title {
          font-size: 1.6rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .login-subtitle {
          font-size: 0.9rem;
          color: #94a3b8;
          text-align: center;
          margin-bottom: 30px;
        }

        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.25s ease;
          font-family: inherit;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--cj-blue, #1b75bc);
          box-shadow: 0 0 0 3px rgba(27, 117, 188, 0.25);
          background: rgba(15, 23, 42, 0.8);
        }

        .input-icon {
          position: absolute;
          left: 16px;
          font-size: 1.1rem;
          color: #64748b;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background: var(--cj-blue, #1b75bc);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(27, 117, 188, 0.3);
        }

        .login-btn:hover {
          background: #15629f;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(27, 117, 188, 0.4);
        }

        .login-btn:active {
          transform: translateY(0);
        }

        .login-btn:disabled {
          background: #334155;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .error-message {
          width: 100%;
          background: rgba(227, 24, 55, 0.1);
          border: 1px solid rgba(227, 24, 55, 0.3);
          color: #f43f5e;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          text-align: center;
          margin-bottom: 5px;
        }

        .demo-box {
          width: 100%;
          margin-top: 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 20px;
        }

        .demo-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 12px;
          text-align: center;
        }

        .demo-roles {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .demo-role-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .role-label {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
          min-width: 85px;
        }

        .demo-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .demo-badge:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #cbd5e1;
          color: #ffffff;
        }

        .demo-badge.blue:hover {
          background: rgba(27, 117, 188, 0.2);
          border-color: var(--cj-blue);
          color: #60a5fa;
        }

        .demo-badge.orange:hover {
          background: rgba(247, 148, 29, 0.2);
          border-color: var(--cj-orange);
          color: #fdba74;
        }

        .demo-badge.red:hover {
          background: rgba(227, 24, 55, 0.2);
          border-color: var(--cj-red);
          color: #fca5a5;
        }
      `}</style>

      <div className="login-card">
        {/* Logo Container */}
        <div className="login-logo">
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="5" y="65" fill="#FFFFFF" fontFamily="Outfit, Arial, sans-serif" fontWeight="bold" fontSize="32">CJ</text>
            <path d="M48 45 C48 30, 60 12, 70 20 C80 28, 70 48, 55 52 C50 53, 48 50, 48 45 Z" fill="#1b75bc" />
            <path d="M57 55 C70 53, 90 62, 86 75 C82 85, 62 82, 53 70 C50 66, 52 59, 57 55 Z" fill="#f7941d" />
            <path d="M48 58 C49 72, 40 92, 28 88 C18 84, 25 64, 38 55 C43 51, 47 53, 48 58 Z" fill="#e31837" />
          </svg>
          <span className="login-logo-sub">CJ MarketBoard</span>
        </div>

        <h1 className="login-title">Hệ Thống Sales Force</h1>
        <p className="login-subtitle">Nhập mã nhân viên để bắt đầu không gian làm việc</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="code" className="form-label">Mã Nhân Sự / Số Điện Thoại</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="code"
                type="text"
                className="login-input"
                placeholder="Ví dụ: CJ1409311 hoặc 07009"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <span>➔</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Account Switcher */}
        <div className="demo-box">
          <div className="demo-title">Tài khoản dùng thử (Database Live)</div>
          <div className="demo-roles">
            <div className="demo-role-group">
              <span className="role-label">💼 QL Vùng:</span>
              <button className="demo-badge red" onClick={() => handleQuickSelect('CJ1407352')}>
                Mai Xuân Ưu (CJ1407352)
              </button>
            </div>
            <div className="demo-role-group">
              <span className="role-label">👥 Giám sát:</span>
              <button className="demo-badge orange" onClick={() => handleQuickSelect('CJ1409311')}>
                Nguyễn T. Đạt
              </button>
              <button className="demo-badge orange" onClick={() => handleQuickSelect('CJ1408801')}>
                P. V. Việt
              </button>
            </div>
            <div className="demo-role-group">
              <span className="role-label">🛒 NVBH:</span>
              <button className="demo-badge blue" onClick={() => handleQuickSelect('CJ1410048')}>
                Lê T. Bích Nguyệt
              </button>
              <button className="demo-badge blue" onClick={() => handleQuickSelect('07009')}>
                Nguyễn T. Tự (07009)
              </button>
            </div>
            <div className="demo-role-group">
              <span className="role-label">⚙️ Admin:</span>
              <button className="demo-badge" onClick={() => handleQuickSelect('phuchai_sup')}>
                Lê Phúc Hải
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
