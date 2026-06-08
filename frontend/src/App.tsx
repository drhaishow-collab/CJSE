import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Stores } from './pages/Stores';
import { Visits } from './pages/Visits';
import { Reports } from './pages/Reports';
import { UsersManagement, UserManagementItem } from './pages/UsersManagement';
import { Login } from './pages/Login';
import { KpiDocs } from './pages/KpiDocs';
import { ReportFormsLab } from './pages/ReportFormsLab';
import { SellInTestDashboard } from './pages/SellInTestDashboard';
import {
  STATIC_BIZ_REPORT,
  STATIC_DASHBOARD,
  STATIC_DEMO_USER,
  STATIC_PRODUCT_REPORT,
  STATIC_SF_REPORT,
  STATIC_SF_TREND,
  STATIC_STORES,
  STATIC_USERS,
  STATIC_VISIT_DETAILS,
  STATIC_VISITS,
} from './staticData';
import snapshotData from './data/snapshot.json';

// Map snapshot to static data format
const SNAPSHOT_DASHBOARD = snapshotData?.dashboard || STATIC_DASHBOARD;
const SNAPSHOT_STORES = snapshotData?.stores || STATIC_STORES;
const SNAPSHOT_VISITS = snapshotData?.visits || STATIC_VISITS;
const SNAPSHOT_USERS = snapshotData?.users || STATIC_USERS;
const SNAPSHOT_PRODUCT_REPORT = snapshotData?.product_report || STATIC_PRODUCT_REPORT;
const SNAPSHOT_SF_REPORT = snapshotData?.sf_report || STATIC_SF_REPORT;
const SNAPSHOT_SF_TREND = snapshotData?.sf_trend || STATIC_SF_TREND;
const SNAPSHOT_BIZ_REPORT = snapshotData?.biz_report || STATIC_BIZ_REPORT;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STATIC_MODE = (import.meta.env.VITE_STATIC_MODE || 'true') === 'true';
const HAS_SNAPSHOT = snapshotData?.generated_at != null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const normalizeUserRole = (role?: string) => {
  const normalized = (role || '').toLowerCase().trim();
  if (['admin', 'administrator'].includes(normalized)) return 'admin';
  if (['manager', 'asm', 'rm'].includes(normalized)) return 'manager';
  if (['sup', 'supervisor', 'ss'].includes(normalized)) return 'sup';
  if (['rep', 'sales', 'salesman', 'sr'].includes(normalized)) return 'rep';
  return normalized || 'rep';
};

const normalizeUser = (user: any) => ({
  ...user,
  code: user.code || user.username || '',
  name: user.name || user.full_name || user.username || '',
  role: normalizeUserRole(user.role),
  region: user.region || '',
});

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface Store {
  id: number;
  code: string;
  name: string;
  address: string;
  channel: string;
  region: string;
  phone?: string;
}

interface Visit {
  id: number;
  store_name: string;
  store_code: string;
  user_name: string;
  visit_date: string;
  check_in_time: string;
  check_out_time: string | null;
  compliance_rate: number;
  notes: string;
  shelf_image_url: string;
}

const cacheManager = {
  get: (key: string): CacheEntry | null => {
    try {
      const raw = localStorage.getItem(`cj_cache_${key}`);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        localStorage.removeItem(`cj_cache_${key}`);
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  },
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(`cj_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  },
  clear: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('cj_cache_'))
      .forEach(k => localStorage.removeItem(k));
  },
};

async function _cachedFetch(url: string, cacheKey: string): Promise<{ data: any; fromCache: boolean }> {
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return { data: cached.data, fromCache: true };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cacheManager.set(cacheKey, data);
  return { data, fromCache: false };
}

function App() {
  const [currentTab, setTab] = useState<string>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('cj_user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });

  const handleTabChange = (tab: string) => {
    setTab(tab);
    setSidebarOpen(false);
  };

  const [dbStatus, setDbStatus] = useState({ status: 'OFFLINE', database: 'CONNECTED' });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [productReport, setProductReport] = useState<any>(null);
  const [sfReport, setSfReport] = useState<any>(null);
  const [bizReport, setBizReport] = useState<any>(null);
  const [sfTrend, setSfTrend] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserManagementItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [precaching, setPrecaching] = useState(false);
  const [precacheProgress, setPrecacheProgress] = useState('');
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  const [reportYear, setReportYear] = useState<number | ''>(2026);
  const [reportMonth, setReportMonth] = useState<number | ''>(5);
  const [reportRegion, setReportRegion] = useState<string>(() => {
    const savedUser = localStorage.getItem('cj_user');
    if (savedUser) {
      const user = normalizeUser(JSON.parse(savedUser));
      if (user.role === 'manager' || user.role === 'sup') {
        return user.region || 'MIỀN NAM';
      }
    }
    return '';
  });
  const [reportArea, setReportArea] = useState<string>('');
  const [reportNpp, setReportNpp] = useState<string>('');

  const getAuthQuery = () => {
    if (!currentUser) return '';
    return `userRole=${currentUser.role}&userCode=${currentUser.code}`;
  };

  // Quick load from cache for instant render, then refresh in background
  const loadFromCacheOrFetch = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (STATIC_MODE) {
      const snapshotDash = HAS_SNAPSHOT
        ? SNAPSHOT_DASHBOARD
        : STATIC_DASHBOARD;
      setDbStatus({
        status: 'ONLINE',
        database: HAS_SNAPSHOT ? 'SNAPSHOT' : 'DEMO',
      });
      setDashboardData(snapshotDash);
      setStores((HAS_SNAPSHOT ? SNAPSHOT_STORES : STATIC_STORES) as any);
      setVisits((HAS_SNAPSHOT ? SNAPSHOT_VISITS : STATIC_VISITS) as any);
      setUsersList((HAS_SNAPSHOT ? SNAPSHOT_USERS : STATIC_USERS) as any);
      setProductReport((HAS_SNAPSHOT ? SNAPSHOT_PRODUCT_REPORT : STATIC_PRODUCT_REPORT) as any);
      setSfReport((HAS_SNAPSHOT ? SNAPSHOT_SF_REPORT : STATIC_SF_REPORT) as any);
      setBizReport((HAS_SNAPSHOT ? SNAPSHOT_BIZ_REPORT : STATIC_BIZ_REPORT) as any);
      setSfTrend((HAS_SNAPSHOT ? SNAPSHOT_SF_TREND : STATIC_SF_TREND) as any);
      setLoading(false);
      return;
    }

    try {
      const authQuery = getAuthQuery();

      // Load from cache immediately for instant UI
      const [cachedDash, cachedStores, cachedVisits, cachedUsers] = [
        cacheManager.get('dashboard'),
        cacheManager.get('stores'),
        cacheManager.get('visits'),
        cacheManager.get('users'),
      ];

      if (cachedDash) {
        setDashboardData(cachedDash.data);
        setDbStatus(cachedDash.data.dbStatus || { status: 'ONLINE', database: 'CONNECTED' });
      }
      if (cachedStores) setStores(cachedStores.data.stores || cachedStores.data || []);
      if (cachedVisits) setVisits(cachedVisits.data || []);
      if (cachedUsers) setUsersList(cachedUsers.data || []);

      // If we have all caches, skip network for initial render
      if (cachedDash && cachedStores && cachedVisits && cachedUsers) {
        setLoading(false);
        return;
      }

      // Otherwise fetch in background
      const [statusRes, dashRes, storesRes, visitsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/status`).catch(() => null),
        fetch(`${API_URL}/api/dashboard?${authQuery}`).catch(() => null),
        fetch(`${API_URL}/api/stores?${authQuery}`).catch(() => null),
        fetch(`${API_URL}/api/visits?${authQuery}`).catch(() => null),
        fetch(`${API_URL}/api/users-management?${authQuery}`).catch(() => null),
      ]);

      if (statusRes?.ok) {
        const s = await statusRes.json();
        setDbStatus(s);
      }
      if (dashRes?.ok) {
        const d = await dashRes.json();
        setDashboardData(d);
        cacheManager.set('dashboard', d);
      }
      if (storesRes?.ok) {
        const s = await storesRes.json();
        const data = s.stores || s || [];
        setStores(data);
        cacheManager.set('stores', data);
      }
      if (visitsRes?.ok) {
        const v = await visitsRes.json();
        setVisits(v);
        cacheManager.set('visits', v);
      }
      if (usersRes?.ok) {
        const u = await usersRes.json();
        setUsersList(u);
        cacheManager.set('users', u);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Background preloading - runs after login, refreshes all caches silently
  const preloadAllData = async () => {
    if (!currentUser || STATIC_MODE) return;
    setPrecaching(true);

    const endpoints = [
      { key: 'dashboard', url: `${API_URL}/api/dashboard?${getAuthQuery()}`, setter: (d: any) => { setDashboardData(d); cacheManager.set('dashboard', d); } },
      { key: 'stores', url: `${API_URL}/api/stores?${getAuthQuery()}`, setter: (d: any) => { const data = d.stores || d || []; setStores(data); cacheManager.set('stores', data); } },
      { key: 'visits', url: `${API_URL}/api/visits?${getAuthQuery()}`, setter: (d: any) => { setVisits(d); cacheManager.set('visits', d); } },
      { key: 'users', url: `${API_URL}/api/users-management?${getAuthQuery()}`, setter: (d: any) => { setUsersList(d); cacheManager.set('users', d); } },
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      setPrecacheProgress(`Đang tải ${ep.key}...`);
      try {
        const res = await fetch(ep.url);
        if (res.ok) {
          const data = await res.json();
          ep.setter(data);
        }
      } catch (e) {
        console.warn(`Preload failed for ${ep.key}:`, e);
      }
    }

    // Preload reports data for current filters
    setPrecacheProgress('Đang tải báo cáo...');
    try {
      const authQuery = getAuthQuery();
      let queryParams = authQuery;
      if (reportYear !== '') queryParams += `&year=${reportYear}`;
      if (reportMonth !== '') queryParams += `&month=${reportMonth}`;
      if (reportRegion !== '') queryParams += `&region=${encodeURIComponent(reportRegion)}`;
      if (reportArea !== '') queryParams += `&area=${encodeURIComponent(reportArea)}`;
      if (reportNpp !== '') queryParams += `&npp=${encodeURIComponent(reportNpp)}`;

      const [prodRepRes, sfRepRes, bizRepRes, sfTrendRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/product?${queryParams}`).catch(() => null),
        fetch(`${API_URL}/api/reports/sf-performance?${queryParams}`).catch(() => null),
        fetch(`${API_URL}/api/reports/biz?${queryParams}`).catch(() => null),
        fetch(`${API_URL}/api/reports/sf-trend?year=${reportYear}&month=${reportMonth}`).catch(() => null),
      ]);

      if (prodRepRes?.ok) {
        const d = await prodRepRes.json();
        setProductReport(d);
        cacheManager.set('report_product', d);
      }
      if (sfRepRes?.ok) {
        const d = await sfRepRes.json();
        setSfReport(d);
        cacheManager.set('report_sf', d);
      }
      if (bizRepRes?.ok) {
        const d = await bizRepRes.json();
        setBizReport(d);
        cacheManager.set('report_biz', d);
      }
      if (sfTrendRes?.ok) {
        const d = await sfTrendRes.json();
        setSfTrend(d);
        cacheManager.set('report_sf_trend', d);
      }
    } catch (e) {
      console.warn('Preload reports failed:', e);
    }

    setPrecaching(false);
    setPrecacheProgress('');
  };

  // Initial load from cache (instant) + background preload
  useEffect(() => {
    if (currentUser) {
      loadFromCacheOrFetch();
      preloadAllData();
      if (currentUser.role === 'manager' || currentUser.role === 'sup') {
        setReportRegion(currentUser.region || 'MIỀN NAM');
      } else {
        setReportRegion('');
      }
      setReportArea('');
      setReportNpp('');
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // Reports refetch with cache-bust for fresh data
  useEffect(() => {
    if (!currentUser || STATIC_MODE) {
      if (STATIC_MODE) setReportsLoading(false);
      return;
    }
    const authQuery = getAuthQuery();
    let queryParams = authQuery;
    if (reportYear !== '') queryParams += `&year=${reportYear}`;
    if (reportMonth !== '') queryParams += `&month=${reportMonth}`;
    if (reportRegion !== '') queryParams += `&region=${encodeURIComponent(reportRegion)}`;
    if (reportArea !== '') queryParams += `&area=${encodeURIComponent(reportArea)}`;
    if (reportNpp !== '') queryParams += `&npp=${encodeURIComponent(reportNpp)}`;

    setReportsLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/reports/product?${queryParams}`).catch(() => null),
      fetch(`${API_URL}/api/reports/sf-performance?${queryParams}`).catch(() => null),
      fetch(`${API_URL}/api/reports/biz?${queryParams}`).catch(() => null),
      fetch(`${API_URL}/api/reports/sf-trend?year=${reportYear}&month=${reportMonth}`).catch(() => null),
    ]).then(([prodRepRes, sfRepRes, bizRepRes, sfTrendRes]) => {
      if (prodRepRes?.ok) prodRepRes.json().then(d => { setProductReport(d); cacheManager.set('report_product', d); });
      if (sfRepRes?.ok) sfRepRes.json().then(d => { setSfReport(d); cacheManager.set('report_sf', d); });
      if (bizRepRes?.ok) bizRepRes.json().then(d => { setBizReport(d); cacheManager.set('report_biz', d); });
      if (sfTrendRes?.ok) sfTrendRes.json().then(d => { setSfTrend(d); cacheManager.set('report_sf_trend', d); });
      setReportsLoading(false);
    });
  }, [reportYear, reportMonth, reportRegion, reportArea, reportNpp, currentUser]);

  const handleAddStore = async (storeData: Omit<Store, 'id'>) => {
    if (STATIC_MODE) {
      const newStore = { id: Date.now(), ...storeData } as Store;
      setStores(prev => [newStore, ...prev]);
      return;
    }

    const response = await fetch(`${API_URL}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Không thể tạo mới điểm bán');
    }
    const newStore = await response.json();
    setStores(prev => [newStore, ...prev]);
    cacheManager.set('stores', [newStore, ...stores]);
    const dashRes = await fetch(`${API_URL}/api/dashboard?${getAuthQuery()}`).catch(() => null);
    if (dashRes?.ok) {
      const dashData = await dashRes.json();
      setDashboardData(dashData);
      cacheManager.set('dashboard', dashData);
    }
  };

  const handleAddUser = async (userData: UserManagementItem) => {
    if (STATIC_MODE) {
      setUsersList(prev => [userData, ...prev]);
      return;
    }

    const response = await fetch(`${API_URL}/api/users-management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Không thể tạo mới nhân sự');
    }
    const newUser = await response.json();
    setUsersList(prev => [newUser, ...prev]);
    cacheManager.set('users', [newUser, ...usersList]);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid var(--border-color)', borderTopColor: 'var(--cj-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang chuẩn bị không gian làm việc...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    // Precache overlay - subtle banner, doesn't block interaction
    const precacheBanner = precaching ? (
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        color: 'white', borderRadius: '12px', padding: '12px 20px',
        boxShadow: '0 8px 32px rgba(30,64,175,0.3)',
        fontSize: '0.82rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '10px',
        maxWidth: '280px',
      }}>
        <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }}></div>
        <div>
          <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Đang tải dữ liệu nền</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{precacheProgress || 'Vui lòng chờ...'}</div>
        </div>
      </div>
    ) : null;

    switch (currentTab) {
      case 'dashboard':
        return (
          <>
            {precacheBanner}
            <Dashboard data={dashboardData} setTab={setTab} setSelectedVisitId={setSelectedVisitId} />
          </>
        );
      case 'stores':
        return (
          <>
            {precacheBanner}
            <Stores stores={stores} onAddStore={handleAddStore} />
          </>
        );
      case 'visits':
        return (
          <>
            {precacheBanner}
            <Visits visits={visits} apiUrl={API_URL} selectedVisitId={selectedVisitId} setSelectedVisitId={setSelectedVisitId} staticVisitDetails={STATIC_VISIT_DETAILS} />
          </>
        );
      case 'users':
        return (
          <>
            {precacheBanner}
            <UsersManagement usersData={usersList} onAddUser={handleAddUser} currentUser={currentUser} />
          </>
        );
      case 'reports-product':
        return (
          <>
            {precacheBanner}
            <Reports
              activeReportTab="product" productData={productReport} sfData={sfReport}
              sfTrend={sfTrend} bizData={bizReport} currentUser={currentUser}
              reportYear={reportYear} reportMonth={reportMonth}
              onYearChange={setReportYear} onMonthChange={setReportMonth}
              reportsLoading={reportsLoading}
              reportRegion={reportRegion} reportArea={reportArea} reportNpp={reportNpp}
              onRegionChange={setReportRegion} onAreaChange={setReportArea} onNppChange={setReportNpp}
            />
          </>
        );
      case 'reports-sf':
        return (
          <>
            {precacheBanner}
            <Reports
              activeReportTab="sf" productData={productReport} sfData={sfReport}
              sfTrend={sfTrend} bizData={bizReport} currentUser={currentUser}
              reportYear={reportYear} reportMonth={reportMonth}
              onYearChange={setReportYear} onMonthChange={setReportMonth}
              reportsLoading={reportsLoading}
              reportRegion={reportRegion} reportArea={reportArea} reportNpp={reportNpp}
              onRegionChange={setReportRegion} onAreaChange={setReportArea} onNppChange={setReportNpp}
            />
          </>
        );
      case 'reports-biz':
        return (
          <>
            {precacheBanner}
            <Reports
              activeReportTab="biz" productData={productReport} sfData={sfReport}
              sfTrend={sfTrend} bizData={bizReport} currentUser={currentUser}
              reportYear={reportYear} reportMonth={reportMonth}
              onYearChange={setReportYear} onMonthChange={setReportMonth}
              reportsLoading={reportsLoading}
              reportRegion={reportRegion} reportArea={reportArea} reportNpp={reportNpp}
              onRegionChange={setReportRegion} onAreaChange={setReportArea} onNppChange={setReportNpp}
            />
          </>
        );
      case 'new':
        return (
          <>
            {precacheBanner}
            <ReportFormsLab currentUser={currentUser} />
          </>
        );
      case 'sellin_test':
        return (
          <>
            {precacheBanner}
            <SellInTestDashboard currentUser={currentUser} />
          </>
        );
      case 'docs':
        return <KpiDocs />;
      default:
        return (
          <>
            {precacheBanner}
            <Dashboard data={dashboardData} setTab={setTab} setSelectedVisitId={setSelectedVisitId} />
          </>
        );
    }
  };

  const handleLoginSuccess = (userData: any) => {
    const normalizedUser = normalizeUser(userData || STATIC_DEMO_USER);
    localStorage.setItem('cj_user', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('cj_user');
    cacheManager.clear();
    setCurrentUser(null);
    setDashboardData(null);
    setStores([]);
    setVisits([]);
    setProductReport(null);
    setSfReport(null);
    setBizReport(null);
    setSfTrend(null);
    setUsersList([]);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} staticMode={STATIC_MODE} demoUser={STATIC_DEMO_USER} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        setTab={handleTabChange}
        dbStatus={dbStatus}
        isSidebarOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>}
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
        <span className="mobile-logo-text">CJ MarketBoard</span>
        <div className={`mobile-status-dot ${dbStatus.database === 'CONNECTED' ? 'status-connected-dot' : 'status-fallback-dot'}`}></div>
      </header>
      <main className={`workspace ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{renderContent()}</div>
        <footer style={{
          textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)',
          fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem'
        }}>
          Copyright Lê Phúc Hải SE Team 2026
        </footer>
      </main>
    </div>
  );
}

export default App;
