export const STATIC_DEMO_USER = {
  id: 1,
  username: 'demo.admin',
  full_name: 'Demo Admin',
  email: 'demo@marketboard.local',
  role: 'admin',
  code: 'demo.admin',
  name: 'Demo Admin',
  phone: '0900000000',
  region: 'MIỀN NAM',
};

export const STATIC_STATUS = {
  status: 'ONLINE',
  database: 'OFFLINE',
  timestamp: new Date().toISOString(),
};

export const STATIC_DASHBOARD = {
  summary: {
    totalRevenue: 1285000000,
    nppCount: 124,
    productCount: 318,
    filterYear: 2026,
    filterMonth: 5,
  },
  regionBreakdown: {
    'MIỀN NAM': 815000000,
    'MIỀN BẮC': 470000000,
  },
  recentVisits: [
    {
      id: 1,
      store_name: 'Co.op Food Nguyễn Trãi',
      store_code: 'CH001',
      user_name: 'Nguyễn Văn An',
      visit_date: '2026-05-28T00:00:00.000Z',
      check_in_time: '2026-05-28T08:10:00.000Z',
      check_out_time: '2026-05-28T09:05:00.000Z',
      compliance_rate: 96,
      notes: 'POSM đầy đủ, trưng bày nổi bật.',
      shelf_image_url: '',
    },
    {
      id: 2,
      store_name: 'Bách Hóa Xanh Quang Trung',
      store_code: 'CH002',
      user_name: 'Trần Minh Khang',
      visit_date: '2026-05-28T00:00:00.000Z',
      check_in_time: '2026-05-28T09:15:00.000Z',
      check_out_time: '2026-05-28T10:00:00.000Z',
      compliance_rate: 88,
      notes: 'Thiếu wobblers tại quầy lạnh.',
      shelf_image_url: '',
    },
    {
      id: 3,
      store_name: 'WinMart+ Phan Xích Long',
      store_code: 'CH003',
      user_name: 'Lê Hải Nam',
      visit_date: '2026-05-27T00:00:00.000Z',
      check_in_time: '2026-05-27T14:20:00.000Z',
      check_out_time: null,
      compliance_rate: 79,
      notes: 'Đang bổ sung vật phẩm trưng bày.',
      shelf_image_url: '',
    },
  ],
};

export const STATIC_STORES = [
  {
    id: 1,
    code: 'CH001',
    name: 'Co.op Food Nguyễn Trãi',
    address: 'Q.1, TP.HCM',
    channel: 'MT',
    region: 'HCM',
    phone: '0901000001',
    revenue: 185000000,
    npp_count: 12,
    customer_count: 420,
    total_qty: 1380,
    monthly_trend: { 1: 28000000, 2: 30000000, 3: 31000000, 4: 46000000, 5: 50000000 },
  },
  {
    id: 2,
    code: 'CH002',
    name: 'Bách Hóa Xanh Quang Trung',
    address: 'Gò Vấp, TP.HCM',
    channel: 'GT',
    region: 'HCM',
    phone: '0901000002',
    revenue: 142000000,
    npp_count: 9,
    customer_count: 315,
    total_qty: 1120,
    monthly_trend: { 1: 22000000, 2: 24000000, 3: 27000000, 4: 33000000, 5: 36000000 },
  },
  {
    id: 3,
    code: 'CH003',
    name: 'WinMart+ Phan Xích Long',
    address: 'Phú Nhuận, TP.HCM',
    channel: 'MT',
    region: 'HCM',
    phone: '0901000003',
    revenue: 99000000,
    npp_count: 7,
    customer_count: 240,
    total_qty: 860,
    monthly_trend: { 1: 15000000, 2: 17000000, 3: 19000000, 4: 23000000, 5: 25000000 },
  },
];

export const STATIC_VISITS = [
  {
    id: 1,
    store_name: 'Co.op Food Nguyễn Trãi',
    store_code: 'CH001',
    user_name: 'Nguyễn Văn An',
    visit_date: '2026-05-28T00:00:00.000Z',
    check_in_time: '2026-05-28T08:10:00.000Z',
    check_out_time: '2026-05-28T09:05:00.000Z',
    compliance_rate: 96,
    notes: 'POSM đầy đủ, trưng bày nổi bật.',
    shelf_image_url: '',
  },
  {
    id: 2,
    store_name: 'Bách Hóa Xanh Quang Trung',
    store_code: 'CH002',
    user_name: 'Trần Minh Khang',
    visit_date: '2026-05-28T00:00:00.000Z',
    check_in_time: '2026-05-28T09:15:00.000Z',
    check_out_time: '2026-05-28T10:00:00.000Z',
    compliance_rate: 88,
    notes: 'Thiếu wobblers tại quầy lạnh.',
    shelf_image_url: '',
  },
  {
    id: 3,
    store_name: 'WinMart+ Phan Xích Long',
    store_code: 'CH003',
    user_name: 'Lê Hải Nam',
    visit_date: '2026-05-27T00:00:00.000Z',
    check_in_time: '2026-05-27T14:20:00.000Z',
    check_out_time: null,
    compliance_rate: 79,
    notes: 'Đang bổ sung vật phẩm trưng bày.',
    shelf_image_url: '',
  },
];

export const STATIC_VISIT_DETAILS = {
  1: {
    visit: STATIC_VISITS[0],
    details: [
      { id: 1, name: 'Sữa chua uống CJ', brand: 'CJ', code: 'SP001', is_oos: false, share_of_shelf: 42, actual_price: 12000 },
      { id: 2, name: 'Bánh gạo Bibigo', brand: 'Bibigo', code: 'SP002', is_oos: false, share_of_shelf: 36, actual_price: 28000 },
    ],
    competitorIntel: [
      { id: 1, competitor_brand: 'Vinamilk', intel_type: 'Khuyến mãi', description: 'Combo giảm giá 10% tại đầu kệ.', image_url: null },
    ],
  },
  2: {
    visit: STATIC_VISITS[1],
    details: [
      { id: 1, name: 'Mandu Bibigo', brand: 'Bibigo', code: 'SP010', is_oos: false, share_of_shelf: 31, actual_price: 79000 },
      { id: 2, name: 'Kimchi hộp CJ', brand: 'CJ', code: 'SP011', is_oos: true, share_of_shelf: 0, actual_price: 45000 },
    ],
    competitorIntel: [
      { id: 1, competitor_brand: 'Ottogi', intel_type: 'Trưng bày', description: 'Chiếm đầu tủ mát, biển giá nổi bật.', image_url: null },
    ],
  },
  3: {
    visit: STATIC_VISITS[2],
    details: [
      { id: 1, name: 'Há cảo Bibigo', brand: 'Bibigo', code: 'SP020', is_oos: false, share_of_shelf: 24, actual_price: 69000 },
    ],
    competitorIntel: [],
  },
} as Record<number, any>;

export const STATIC_USERS = [
  {
    manager_code: 'ASM001',
    manager_name: 'Phạm Quốc Việt',
    supervisor_code: 'GS001',
    supervisor_name: 'Nguyễn Thanh Bình',
    rep_code: 'REP001',
    rep_name: 'Nguyễn Văn An',
    region: 'MIỀN NAM',
    area: 'HCM',
    office: 'HCM 1',
    distributor: 'NPP Sài Gòn Center',
    status: 'active',
  },
  {
    manager_code: 'ASM001',
    manager_name: 'Phạm Quốc Việt',
    supervisor_code: 'GS001',
    supervisor_name: 'Nguyễn Thanh Bình',
    rep_code: 'REP002',
    rep_name: 'Trần Minh Khang',
    region: 'MIỀN NAM',
    area: 'HCM',
    office: 'HCM 1',
    distributor: 'NPP Gia Định',
    status: 'active',
  },
  {
    manager_code: 'ASM002',
    manager_name: 'Lê Anh Dũng',
    supervisor_code: 'GS010',
    supervisor_name: 'Đỗ Hoàng Nam',
    rep_code: 'REP010',
    rep_name: 'Lê Hải Nam',
    region: 'MIỀN BẮC',
    area: 'Hà Nội',
    office: 'HN 1',
    distributor: 'NPP Thăng Long',
    status: 'active',
  },
];

export const STATIC_PRODUCT_REPORT = [
  { brand: 'CJ', category: 'Sữa chua', product_name: 'Sữa chua uống CJ', revenue: 220000000, quantity: 18000 },
  { brand: 'Bibigo', category: 'Đông lạnh', product_name: 'Há cảo Bibigo', revenue: 185000000, quantity: 9200 },
  { brand: 'Bibigo', category: 'Snack', product_name: 'Bánh gạo Bibigo', revenue: 132000000, quantity: 7600 },
];

export const STATIC_SF_REPORT = [
  { ten_nv: 'Nguyễn Văn An', ma_nv: 'REP001', ten_vung: 'HCM', ten_mien: 'MIỀN NAM', revenue: 215000000, total_customers: 180, route_visits: 142, extra_visits: 18, work_time: 9600 },
  { ten_nv: 'Trần Minh Khang', ma_nv: 'REP002', ten_vung: 'HCM', ten_mien: 'MIỀN NAM', revenue: 176000000, total_customers: 154, route_visits: 131, extra_visits: 16, work_time: 9100 },
  { ten_nv: 'Lê Hải Nam', ma_nv: 'REP010', ten_vung: 'Hà Nội', ten_mien: 'MIỀN BẮC', revenue: 148000000, total_customers: 139, route_visits: 118, extra_visits: 12, work_time: 8700 },
];

export const STATIC_BIZ_REPORT = [
  { ten_mien: 'MIỀN NAM', ten_vung: 'HCM', ma_npp: 'NPP001', ten_npp: 'NPP Sài Gòn Center', total_revenue: 420000000, total_qty: 15800, customer_count: 630 },
  { ten_mien: 'MIỀN NAM', ten_vung: 'HCM', ma_npp: 'NPP002', ten_npp: 'NPP Gia Định', total_revenue: 310000000, total_qty: 12100, customer_count: 510 },
  { ten_mien: 'MIỀN BẮC', ten_vung: 'Hà Nội', ma_npp: 'NPP010', ten_npp: 'NPP Thăng Long', total_revenue: 255000000, total_qty: 9700, customer_count: 440 },
];

export const STATIC_SF_TREND = [
  { month: 1, ten_nv: 'Nguyễn Văn An', ma_nv: 'REP001', total_customers: 28, route_visits: 22, extra_visits: 3 },
  { month: 2, ten_nv: 'Nguyễn Văn An', ma_nv: 'REP001', total_customers: 31, route_visits: 24, extra_visits: 3 },
  { month: 3, ten_nv: 'Nguyễn Văn An', ma_nv: 'REP001', total_customers: 35, route_visits: 27, extra_visits: 4 },
  { month: 4, ten_nv: 'Trần Minh Khang', ma_nv: 'REP002', total_customers: 29, route_visits: 23, extra_visits: 3 },
  { month: 5, ten_nv: 'Lê Hải Nam', ma_nv: 'REP010', total_customers: 27, route_visits: 21, extra_visits: 2 },
];
