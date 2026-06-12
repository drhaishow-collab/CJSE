import React, { useState } from 'react';
import { exportToExcel } from '../utils/export';

interface ProductSummary {
  totalSales: number;
  totalQty: number;
}

interface HierarchicalProductItem {
  category: string;
  group: string;
  subgroup: string;
  code: string;
  name: string;
  sales: number;
  qty: number;
}


interface BizRawItem {
  type: string;
  year: number;
  month: number;
  region: string;
  area: string;
  office: string;
  ma_npp: string;
  ten_npp: string;
  sales: number;
}

interface BizHistoryItem {
  year: number;
  month: number;
  aso: number;
  vpo: number;
}

interface BizKpis {
  sellin_achievement: number;
  sellout_achievement: number;
  aso: number;
  vpo: number;
  sku_order: number;
  history?: BizHistoryItem[];
  staffHeadcount?: { totalGsbh: number; totalNvbh: number };
}

interface BizTreeNode {
  id: string;
  name: string;
  level: 'region' | 'area' | 'npp';
  region: string;
  area: string;
  ma_npp?: string;
  ten_npp?: string;
  ytdSellin25: number;
  ytdSellin26: number;
  ytdSellout25: number;
  ytdSellout26: number;
  mtdSellin25: number;
  mtdSellin26: number;
  mtdSellout25: number;
  mtdSellout26: number;
  children: BizTreeNode[];
}

interface SfKpiTreeNode {
  id: string;
  name: string;
  level: 'region' | 'asm' | 'sup' | 'rep';
  region: string;
  asm_name: string;
  sup_name: string;
  staff_id?: string;
  sellin_target: number;
  sellin_actual: number;
  sellout_target: number;
  sellout_actual: number;
  sales: number;
  mcp_count: number;
  buying_outlets: number;
  total_visits: number;
  transactions: number;
  sku_sum: number;
  children: SfKpiTreeNode[];
}

interface ReportsProps {
  activeReportTab: 'product' | 'sf' | 'biz';
  productData: { summary: ProductSummary; hierarchicalData: HierarchicalProductItem[]; detailData?: any } | null;
  sfData: { productSales: any[]; kpiSales: any[]; repsData: any[] } | null;
  sfTrend: any | null;
  bizData: { rawData: BizRawItem[]; kpis?: BizKpis } | null;
  currentUser?: any;
  reportYear: number | '';
  reportMonth: number | '';
  onYearChange: (year: number | '') => void;
  onMonthChange: (month: number | '') => void;
  reportsLoading: boolean;
  reportRegion: string;
  reportArea: string;
  reportNpp: string;
  onRegionChange: (region: string) => void;
  onAreaChange: (area: string) => void;
  onNppChange: (npp: string) => void;
}

const getCategoryIcon = (category: string) => {
  const c = (category || '').toLowerCase();
  if (c.includes('wrap') || c.includes('mandu') || c.includes('dumpling') || c.includes('bánh')) return '🥟';
  if (c.includes('pickled') || c.includes('kimchi') || c.includes('cải')) return '🥬';
  if (c.includes('seaweed') || c.includes('rong')) return '🍃';
  if (c.includes('sauce') || c.includes('seasoning') || c.includes('nước sốt') || c.includes('paste')) return '🌶️';
  if (c.includes('drink') || c.includes('beverage') || c.includes('nước ngọt')) return '🥤';
  if (c.includes('snack') || c.includes('bánh snack')) return '🍿';
  return '📦';
};

export const formatAreaName = (areaCode: string) => {
  const map: Record<string, string> = {
    'HCM': 'Hồ Chí Minh',
    'HNI': 'Hà Nội',
    'HPG': 'Hải Phòng',
    'MDO': 'Miền Đông',
    'MTAY': 'Miền Tây',
    'MTRUNG': 'Miền Trung'
  };
  return map[areaCode] || areaCode;
};

export const Reports: React.FC<ReportsProps> = ({ 
  activeReportTab, 
  productData, 
  sfData,
  sfTrend,
  bizData, 
  currentUser,
  reportYear,
  reportMonth,
  onYearChange,
  onMonthChange,
  reportsLoading,
  reportRegion,
  reportArea,
  reportNpp,
  onRegionChange,
  onAreaChange,
  onNppChange
}) => {
  const isManager = currentUser?.role === 'manager';
  const isSup = currentUser?.role === 'sup';
  const isReadOnlyRegion = isManager || isSup;

  // Biz Report local transaction type filter (matching Excel slicers!)
  const [selectedType, setSelectedType] = useState<string>(''); // empty means All

  // Product Drill-Down State (Power BI style hierarchical interactions)
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [drillGroup, setDrillGroup] = useState<string | null>(null);
  const [drillSubgroup, setDrillSubgroup] = useState<string | null>(null);

  // Product sub-menu states (overview vs detail)
  const [productSubTab, setProductSubTab] = useState<'overview' | 'detail'>('overview');

  // SF Performance states
  const [sfRepSearch, setSfRepSearch] = useState<string>('');
  const [expandedSups, setExpandedSups] = useState<Record<string, boolean>>({});

  // SF Performance sub-menu states
  const [sfSubTab, setSfSubTab] = useState<'overview' | 'kpis'>('overview');
  const [expandedSfKpis, setExpandedSfKpis] = useState<Record<string, boolean>>({});
  const [sfTrendMetric, setSfTrendMetric] = useState<'sellin' | 'sellout' | 'aso' | 'mcp'>('sellin');
  const [sfTrendRegion, setSfTrendRegion] = useState<string>(''); // '' = all

  // Biz Review tree states
  const [bizPeriodToggle, setBizPeriodToggle] = useState<'ytd' | 'mtd'>('ytd');
  const [bizSearchQuery, setBizSearchQuery] = useState<string>('');
  const [expandedBizNodes, setExpandedBizNodes] = useState<Record<string, boolean>>({});

  // Format currency helper: Millions as M, Billions as B, with 2 decimal places
  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1e9) {
      return `${(val / 1e9).toFixed(2)}B đ`;
    }
    if (Math.abs(val) >= 1e6) {
      return `${(val / 1e6).toFixed(2)}M đ`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // ---------------- BIZ CALCULATIONS ----------------
  // ---------------- BIZ CALCULATIONS ----------------
  const processBizPivot = () => {
    const raw = bizData?.rawData || [];
    
    // Apply filters (Region, Area, NPP, and transaction Type)
    const filtered = raw.filter(item => {
      const matchReg = !reportRegion || item.region.toUpperCase() === reportRegion.toUpperCase();
      const matchArea = !reportArea || item.area.toUpperCase() === reportArea.toUpperCase();
      const matchNpp = !reportNpp || item.ma_npp === reportNpp;
      const matchType = !selectedType || item.type.toLowerCase() === selectedType.toLowerCase();
      return matchReg && matchArea && matchNpp && matchType;
    });

    // We calculate YTD (Year-To-Date: month <= reportMonth) and MTD (Month-To-Date: month === reportMonth)
    const ytd: {
      sellin2025: number;
      sellin2026: number;
      sellout2025: number;
      sellout2026: number;
    } = { sellin2025: 0, sellin2026: 0, sellout2025: 0, sellout2026: 0 };

    const mtd: {
      sellin2025: number;
      sellin2026: number;
      sellout2025: number;
      sellout2026: number;
    } = { sellin2025: 0, sellin2026: 0, sellout2025: 0, sellout2026: 0 };

    filtered.forEach(item => {
      const itemYear = Number(item.year);
      const itemMonth = Number(item.month);
      const is2025 = itemYear === 2025;
      const is2026 = itemYear === 2026;
      const currentMonth = Number(reportMonth) || 5; // Default fallback to month 5 if empty

      // YTD Calculation (months 1 up to current selected month)
      if (itemMonth <= currentMonth) {
        if (item.type.toLowerCase() === 'sellin') {
          if (is2025) ytd.sellin2025 += item.sales;
          if (is2026) ytd.sellin2026 += item.sales;
        } else if (item.type.toLowerCase() === 'sellout') {
          if (is2025) ytd.sellout2025 += item.sales;
          if (is2026) ytd.sellout2026 += item.sales;
        }
      }

      // MTD Calculation (only the selected month)
      if (itemMonth === currentMonth) {
        if (item.type.toLowerCase() === 'sellin') {
          if (is2025) mtd.sellin2025 += item.sales;
          if (is2026) mtd.sellin2026 += item.sales;
        } else if (item.type.toLowerCase() === 'sellout') {
          if (is2025) mtd.sellout2025 += item.sales;
          if (is2026) mtd.sellout2026 += item.sales;
        }
      }
    });

    // YoY Growth rates
    const ytdSellinYoY = ytd.sellin2025 > 0 ? ((ytd.sellin2026 - ytd.sellin2025) / ytd.sellin2025) * 100 : 0;
    const ytdSelloutYoY = ytd.sellout2025 > 0 ? ((ytd.sellout2026 - ytd.sellout2025) / ytd.sellout2025) * 100 : 0;
    
    const mtdSellinYoY = mtd.sellin2025 > 0 ? ((mtd.sellin2026 - mtd.sellin2025) / mtd.sellin2025) * 100 : 0;
    const mtdSelloutYoY = mtd.sellout2025 > 0 ? ((mtd.sellout2026 - mtd.sellout2025) / mtd.sellout2025) * 100 : 0;

    // Region details breakdown (using YTD for the table details)
    const regionsList = ['MIỀN BẮC', 'MIỀN NAM'];
    const regionBreakdown = regionsList.map(reg => {
      const regFiltered = filtered.filter(item => item.region.toUpperCase() === reg && item.month <= (reportMonth || 5));
      const sellin25 = regFiltered.filter(item => item.type.toLowerCase() === 'sellin' && item.year === 2025).reduce((sum, item) => sum + item.sales, 0);
      const sellin26 = regFiltered.filter(item => item.type.toLowerCase() === 'sellin' && item.year === 2026).reduce((sum, item) => sum + item.sales, 0);
      const sellout25 = regFiltered.filter(item => item.type.toLowerCase() === 'sellout' && item.year === 2025).reduce((sum, item) => sum + item.sales, 0);
      const sellout26 = regFiltered.filter(item => item.type.toLowerCase() === 'sellout' && item.year === 2026).reduce((sum, item) => sum + item.sales, 0);

      return {
        region: reg,
        sellin2025: sellin25,
        sellin2026: sellin26,
        sellinYag: sellin25 > 0 ? ((sellin26 - sellin25) / sellin25) * 100 : 0,
        sellout2025: sellout25,
        sellout2026: sellout26,
        selloutYag: sellout25 > 0 ? ((sellout26 - sellout25) / sellout25) * 100 : 0
      };
    });

    return { ytd, mtd, ytdSellinYoY, ytdSelloutYoY, mtdSellinYoY, mtdSelloutYoY, regionBreakdown };
  };

  const bizPivot = processBizPivot();



  // ---------------- PRODUCT DRILL-DOWN CALCULATIONS ----------------
  const rawProductList = productData?.hierarchicalData || [];

  // Filter products based on drill path
  const filteredProducts = rawProductList.filter(item => {
    const matchCat = !drillCategory || item.category === drillCategory;
    const matchGroup = !drillGroup || item.group === drillGroup;
    const matchSub = !drillSubgroup || item.subgroup === drillSubgroup;
    return matchCat && matchGroup && matchSub;
  });

  // Dynamic KPI Card Totals based on drill path
  const dynamicSalesTotal = filteredProducts.reduce((sum, item) => sum + item.sales, 0);
  const dynamicQtyTotal = filteredProducts.reduce((sum, item) => sum + item.qty, 0);
  const dynamicSkuCount = filteredProducts.length;

  // 1. Group by Category (Ngành hàng) across all raw data (Level 1)
  const categorySalesMap: { [key: string]: { sales: number; qty: number } } = {};
  rawProductList.forEach(item => {
    if (!categorySalesMap[item.category]) {
      categorySalesMap[item.category] = { sales: 0, qty: 0 };
    }
    categorySalesMap[item.category].sales += item.sales;
    categorySalesMap[item.category].qty += item.qty;
  });
  const categoriesList = Object.keys(categorySalesMap).map(cat => ({
    category: cat,
    sales: categorySalesMap[cat].sales,
    qty: categorySalesMap[cat].qty
  })).sort((a, b) => b.sales - a.sales);

  const categoryTotalSales = categoriesList.reduce((acc, curr) => acc + curr.sales, 0) || 1;
  const treemapColors = ['var(--cj-blue)', 'var(--cj-orange)', 'var(--cj-red)', '#0d9488', '#64748b'];

  // 2. Group by Product Group (Nhóm SP) filtered by Selected Category (Level 2)
  const groupSalesMap: { [key: string]: { sales: number; qty: number } } = {};
  rawProductList.forEach(item => {
    if (drillCategory && item.category !== drillCategory) return;
    if (!groupSalesMap[item.group]) {
      groupSalesMap[item.group] = { sales: 0, qty: 0 };
    }
    groupSalesMap[item.group].sales += item.sales;
    groupSalesMap[item.group].qty += item.qty;
  });
  const groupsList = Object.keys(groupSalesMap).map(g => ({
    group: g,
    sales: groupSalesMap[g].sales,
    qty: groupSalesMap[g].qty
  })).sort((a, b) => b.sales - a.sales);

  const maxGroupSales = groupsList[0]?.sales || 1;

  // 3. Group by Product Subgroup (Phân nhóm SP) filtered by selected Category + Group (Level 3)
  const subgroupSalesMap: { [key: string]: { sales: number; qty: number } } = {};
  rawProductList.forEach(item => {
    if (drillCategory && item.category !== drillCategory) return;
    if (drillGroup && item.group !== drillGroup) return;
    if (!subgroupSalesMap[item.subgroup]) {
      subgroupSalesMap[item.subgroup] = { sales: 0, qty: 0 };
    }
    subgroupSalesMap[item.subgroup].sales += item.sales;
    subgroupSalesMap[item.subgroup].qty += item.qty;
  });
  const subgroupsList = Object.keys(subgroupSalesMap).map(sub => ({
    subgroup: sub,
    sales: subgroupSalesMap[sub].sales,
    qty: subgroupSalesMap[sub].qty
  })).sort((a, b) => b.sales - a.sales);

  const maxSubgroupSales = subgroupsList[0]?.sales || 1;

  // 4. SKU Details List (Level 4)
  const skusList = [...filteredProducts].sort((a, b) => b.sales - a.sales);
  const maxProductSales = skusList[0]?.sales || 1;

  const handleExportCurrentReport = () => {
    if (activeReportTab === 'product') {
      if (productSubTab === 'detail') {
        const detail = productData?.detailData;
        const catByType = detail?.categoryByType || [];
        exportToExcel(
          catByType.map((cat: any, idx: number) => ({
            STT: idx + 1,
            'Ngành Hàng': cat.category,
            'Sell-in': cat.sellin,
            'Sell-out': cat.sellout,
            SKU: cat.skuCount,
          })),
          'report-product-detail-category'
        );
        return;
      }

      exportToExcel(
        skusList.map((item, idx) => ({
          Hạng: idx + 1,
          'Mã SP': item.code,
          'Tên SKU': item.name,
          'Ngành hàng': item.category,
          Nhóm: item.group,
          'Phân nhóm': item.subgroup,
          'Doanh số': item.sales,
          'Sản lượng': item.qty,
        })),
        'report-product-overview-skus'
      );
      return;
    }

    if (activeReportTab === 'sf') {
      exportToExcel(
        (sfData?.repsData || []).map((row: any, idx: number) => ({
          STT: idx + 1,
          Miền: row.region || row.ten_mien || '',
          ASM: row.asm_name || row.asm || '',
          GSBH: row.sup_name || row.supervisor || '',
          NVBH: row.rep_name || row.salesman || '',
          'Sell-in': row.sellin || 0,
          'Sell-out': row.sellout || 0,
          ASO: row.aso || 0,
          MCP: row.mcp || 0,
        })),
        `report-sf-${sfSubTab}`
      );
      return;
    }

    const raw = bizData?.rawData || [];
    exportToExcel(
      raw.map((item: any) => ({
        Miền: item.region,
        Area: item.area,
        NPP: item.distributor,
        Loại: item.type,
        Năm: item.year,
        Tháng: item.month,
        Sales: item.sales,
      })),
      `report-biz-${bizPeriodToggle}`
    );
  };

  return (
    <div className="pbi-canvas">
      {/* Power BI Header */}
      <div className="pbi-header">
        <div className="pbi-header-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ alignSelf: 'center' }}>
            <rect width="6" height="24" rx="1" fill="var(--cj-blue)" />
            <rect x="9" y="8" width="6" height="16" rx="1" fill="var(--cj-orange)" />
            <rect x="18" y="16" width="6" height="8" rx="1" fill="var(--cj-red)" />
          </svg>
          <div>
            <div style={{ fontWeight: 800, color: '#252423', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
              CJ MARKETBOARD <span style={{ color: '#a19f9d', fontWeight: 400, fontSize: '0.9rem' }}>| Business Intelligence Reports</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#166534', borderRadius: '50%' }}></span>
              DirectQuery Live: <span style={{ color: '#166534' }}>sales_db (PostgreSQL Local)</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExportCurrentReport}>Export Excel</button>
          <div className="pbi-header-meta">
            <div>Trạng thái: <strong>Dữ liệu Đồng bộ</strong></div>
            <div style={{ marginTop: '2px', color: '#a19f9d', fontSize: '0.72rem' }}>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</div>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="pbi-global-filters" style={{
        display: 'flex',
        gap: '1.5rem',
        padding: '0.75rem 1.25rem',
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginBottom: '1.25rem',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#252423', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span> Bộ lọc thời gian:
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#605e5c' }}>Năm:</label>
          <select 
            value={reportYear} 
            onChange={(e) => onYearChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: '#faf9f8'
            }}
          >
            <option value="">Tất cả</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#605e5c' }}>Tháng:</label>
          <select 
            value={reportMonth} 
            onChange={(e) => onMonthChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: '#faf9f8'
            }}
          >
            <option value="">Tất cả</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        {reportsLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--cj-blue)', fontWeight: 700, marginLeft: '10px' }}>
            <div style={{ 
              width: '14px', 
              height: '14px', 
              border: '2px solid #e1dfdd', 
              borderTopColor: 'var(--cj-blue)', 
              borderRadius: '50%', 
              animation: 'pbi-spin 0.6s linear infinite' 
            }}></div>
            <span>Đang tải dữ liệu PostgreSQL...</span>
            <style>{`
              @keyframes pbi-spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}
        
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#a19f9d', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <span>⚡</span>
          <span>Dữ liệu thực tế từ PostgreSQL (1,73M dòng)</span>
        </div>
      </div>

      {/* 1. PRODUCT BY CAT (Hierarchical Drill-Down Dashboard) */}
      {activeReportTab === 'product' && (() => {
        const raw = bizData?.rawData || [];
        
        // Cascading Area List: filter raw by reportRegion
        const areasList = Array.from(new Set(
          raw
            .filter(item => !reportRegion || item.region.toUpperCase() === reportRegion.toUpperCase())
            .map(item => item.area)
        )).filter(Boolean).sort();

        const handleRegionChangeLocal = (reg: string) => {
          onRegionChange(reg);
          onAreaChange('');
          onNppChange('');
        };

        const handleAreaChangeLocal = (ar: string) => {
          onAreaChange(ar);
          onNppChange('');
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Slicers for Product Insights */}
            <div className="pbi-slicer-panel" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '0.25rem' }}>
              {/* Region Slicer */}
              {!isReadOnlyRegion ? (
                <div className="pbi-slicer">
                  <div className="pbi-slicer-title">Tên Miền (Region)</div>
                  <div className="pbi-slicer-items">
                    <div 
                      className={`pbi-slicer-item ${reportRegion === '' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('')}
                    >
                      Tất cả
                    </div>
                    <div 
                      className={`pbi-slicer-item ${reportRegion === 'MIỀN BẮC' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('MIỀN BẮC')}
                    >
                      Miền Bắc
                    </div>
                    <div 
                      className={`pbi-slicer-item ${reportRegion === 'MIỀN NAM' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('MIỀN NAM')}
                    >
                      Miền Nam
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pbi-slicer" style={{ opacity: 0.85 }}>
                  <div className="pbi-slicer-title">Tên Miền (Bị Khóa)</div>
                  <div className="pbi-slicer-items">
                    <div className="pbi-slicer-item active" style={{ cursor: 'not-allowed' }}>
                      {reportRegion === 'MIỀN NAM' ? 'Miền Nam (HCM)' : 'Miền Bắc'}
                    </div>
                  </div>
                </div>
              )}

              {/* Area Slicer */}
              <div className="pbi-slicer">
                <div className="pbi-slicer-title pbi-slicer-title-orange">Khu vực / Tỉnh (Area)</div>
                <select
                  value={reportArea}
                  onChange={(e) => handleAreaChangeLocal(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '150px'
                  }}
                >
                  <option value="">Tất cả khu vực</option>
                  {areasList.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              <div style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => {
                    handleRegionChangeLocal(isReadOnlyRegion ? (currentUser?.region || 'MIỀN NAM') : '');
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>

          {/* Product Sub-Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '0',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '0.25rem'
          }}>
            <button
              onClick={() => setProductSubTab('overview')}
              style={{
                padding: '0.7rem 1.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: productSubTab === 'overview' ? 800 : 500,
                color: productSubTab === 'overview' ? 'var(--cj-blue)' : '#605e5c',
                borderBottom: productSubTab === 'overview' ? '3px solid var(--cj-blue)' : '3px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📊 Overview by Category
            </button>
            <button
              onClick={() => setProductSubTab('detail')}
              style={{
                padding: '0.7rem 1.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: productSubTab === 'detail' ? 800 : 500,
                color: productSubTab === 'detail' ? 'var(--cj-orange)' : '#605e5c',
                borderBottom: productSubTab === 'detail' ? '3px solid var(--cj-orange)' : '3px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📋 Review by Detail
            </button>
          </div>

          {/* SUB-TAB: OVERVIEW (existing drill-down) */}
          {productSubTab === 'overview' && (
          <>
          {/* Breadcrumbs & Selection Info Panel */}
          <div className="pbi-slicer-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#252423', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>📍 Bộ lọc đang chọn (Drill path):</span>
                <span 
                  className="badge" 
                  style={{ 
                    cursor: drillCategory ? 'pointer' : 'default',
                    backgroundColor: drillCategory ? 'var(--cj-blue-light)' : '#e1dfdd', 
                    color: drillCategory ? 'var(--cj-blue)' : '#605e5c',
                    fontWeight: 700 
                  }}
                  onClick={() => {
                    if (drillCategory) {
                      setDrillCategory(null);
                      setDrillGroup(null);
                      setDrillSubgroup(null);
                    }
                  }}
                >
                  Ngành hàng: {drillCategory || 'TẤT CẢ'} {drillCategory && '✗'}
                </span>
                {drillCategory && <span style={{ color: '#a19f9d' }}>➔</span>}
                {drillCategory && (
                  <span 
                    className="badge" 
                    style={{ 
                      cursor: drillGroup ? 'pointer' : 'default',
                      backgroundColor: drillGroup ? 'var(--cj-orange-light)' : '#e1dfdd', 
                      color: drillGroup ? 'var(--cj-orange)' : '#605e5c',
                      fontWeight: 700 
                    }}
                    onClick={() => {
                      if (drillGroup) {
                        setDrillGroup(null);
                        setDrillSubgroup(null);
                      }
                    }}
                  >
                    Nhóm SP: {drillGroup || 'TẤT CẢ'} {drillGroup && '✗'}
                  </span>
                )}
                {drillGroup && <span style={{ color: '#a19f9d' }}>➔</span>}
                {drillGroup && (
                  <span 
                    className="badge" 
                    style={{ 
                      cursor: drillSubgroup ? 'pointer' : 'default',
                      backgroundColor: drillSubgroup ? 'var(--cj-red-light)' : '#e1dfdd', 
                      color: drillSubgroup ? 'var(--cj-red)' : '#605e5c',
                      fontWeight: 700 
                    }}
                    onClick={() => {
                      if (drillSubgroup) setDrillSubgroup(null);
                    }}
                  >
                    Phân nhóm SP: {drillSubgroup || 'TẤT CẢ'} {drillSubgroup && '✗'}
                  </span>
                )}
              </div>
            </div>
            
            {(drillCategory || drillGroup || drillSubgroup) && (
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', height: 'fit-content' }}
                onClick={() => {
                  setDrillCategory(null);
                  setDrillGroup(null);
                  setDrillSubgroup(null);
                }}
              >
                🧹 Reset Bộ Lọc
              </button>
            )}
          </div>

          {/* DYNAMIC KPI Cards Row */}
          <div className="stats-grid">
            <div className="pbi-card pbi-card-accent-blue">
              <div className="pbi-card-title">Doanh Số Sản Phẩm (Lọc động)</div>
              <div className="pbi-card-value">{formatCurrency(dynamicSalesTotal)}</div>
              <div className="pbi-card-sub">Lũy kế theo các điều kiện lọc phía trên</div>
            </div>
            <div className="pbi-card pbi-card-accent-orange">
              <div className="pbi-card-title">Sản Lượng Giao (Lọc động)</div>
              <div className="pbi-card-value">
                {dynamicQtyTotal.toLocaleString('vi-VN')}
                <span style={{ fontSize: '0.9rem', color: '#605e5c', fontWeight: 'normal', marginLeft: '6px' }}>Thùng/Gói</span>
              </div>
              <div className="pbi-card-sub">Tổng sản lượng tương ứng nhóm đã chọn</div>
            </div>
            <div className="pbi-card pbi-card-accent-red">
              <div className="pbi-card-title">Số SKU Hoạt Động (Lọc động)</div>
              <div className="pbi-card-value">{dynamicSkuCount}</div>
              <div className="pbi-card-sub">Số mã SKU đang có số trong nhóm bộ lọc</div>
            </div>
          </div>

          {/* TOP 3 SKUS SHOWCASE */}
          <div className="pbi-card" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)', borderLeft: '4px solid var(--cj-blue)' }}>
            <div className="pbi-slicer-title" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⭐ TOP SẢN PHẨM BÁN CHẠY NHẤT (THEO LỌC ĐỘNG)</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: '1rem' }}>
              Top các mặt hàng đóng góp doanh thu cao nhất tương ứng với cấp độ lọc hiện tại.
            </p>
            {skusList.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#a19f9d', fontSize: '0.85rem' }}>
                Không tìm thấy sản phẩm phù hợp điều kiện lọc.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {skusList.slice(0, 3).map((sku, idx) => {
                  const contribution = ((sku.sales / (dynamicSalesTotal || 1)) * 100).toFixed(1);
                  const medals = ['🥇', '🥈', '🥉'];
                  const colors = ['#e31837', '#f7941d', '#1b75bc'];
                  return (
                    <div 
                      key={sku.code} 
                      style={{ 
                        flex: '1 1 280px',
                        background: '#ffffff', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease',
                        cursor: 'default'
                      }}
                      className="pbi-top-sku-card"
                    >
                      <div style={{ fontSize: '2.2rem' }}>{medals[idx] || '⭐'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 700 }}>Mã: {sku.code}</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sku.name}>
                          {sku.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontWeight: 800, color: colors[idx] || 'var(--cj-blue)', fontSize: '0.95rem' }}>{formatCurrency(sku.sales)}</span>
                          <span className="badge" style={{ backgroundColor: 'rgba(15, 23, 42, 0.05)', color: '#0f172a', fontWeight: 700, fontSize: '0.7rem' }}>
                            Đóng góp {contribution}%
                          </span>
                        </div>
                      </div>
                      <div 
                        style={{ 
                          position: 'absolute', 
                          right: '-8px', 
                          bottom: '-10px', 
                          fontSize: '4.5rem', 
                          opacity: 0.05, 
                          fontWeight: 900,
                          color: colors[idx] || '#cbd5e1',
                          userSelect: 'none'
                        }}
                      >
                        {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CATEGORY DEEP DIVE INTEL */}
          {drillCategory && (
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              <div className="pbi-card" style={{ flex: '1 1 260px', background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', borderLeft: '4px solid #22c55e', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>💡</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#166534', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                  Phân Tích Ngành: {drillCategory}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#3f6212', lineHeight: 1.45 }}>
                  Ngành hàng <strong>{drillCategory}</strong> chiếm <strong>{((dynamicSalesTotal / (categoryTotalSales || 1)) * 100).toFixed(1)}%</strong> doanh thu sản phẩm. 
                  {drillGroup ? ` Trong đó, nhóm sản phẩm ${drillGroup} đang dẫn dắt với tỷ trọng lớn.` : ' Nhấp chọn nhóm sản phẩm cấp 2 bên dưới để xem chi tiết.'}
                </p>
              </div>
              
              <div className="pbi-card" style={{ flex: '2 1 500px', background: '#ffffff', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', padding: '1.25rem' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Bình quân giá bán thực tế</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.5px' }}>
                    {formatCurrency(filteredProducts.length > 0 ? (filteredProducts.reduce((sum, item) => sum + item.sales, 0) / (filteredProducts.reduce((sum, item) => sum + item.qty, 0) || 1)) : 0)}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#605e5c', marginLeft: '4px' }}>/ đơn vị</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: '2px' }}>Doanh số trên sản lượng giao</div>
                </div>
                
                <div style={{ width: '1px', height: '60px', backgroundColor: 'var(--border-color)' }} className="laptop-divider-hide"></div>
                
                <div style={{ flex: '1 1 150px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Hiệu suất doanh thu / active SKU</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--cj-blue)', marginTop: '4px', letterSpacing: '-0.5px' }}>
                    {formatCurrency(filteredProducts.length > 0 ? dynamicSalesTotal / filteredProducts.length : 0)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: '2px' }}>Trung bình doanh số trên mỗi SKU active</div>
                </div>
                
                <div style={{ width: '1px', height: '60px', backgroundColor: 'var(--border-color)' }} className="laptop-divider-hide"></div>
                
                <div style={{ flex: '1 1 150px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Đóng góp sản lượng (Volume Share)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--cj-orange)', marginTop: '4px', letterSpacing: '-0.5px' }}>
                    {((dynamicQtyTotal / (productData?.summary.totalQty || 1)) * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: '2px' }}>Tỷ trọng sản lượng trên toàn ngành</div>
                </div>
              </div>
            </div>
          )}

          {/* TIER 1 & TIER 2 ROW */}
          <div className="pbi-layout-grid-2">
            {/* TIER 1: Category Treemap (Ngành hàng) */}
            <div className="pbi-card">
              <div className="pbi-slicer-title" style={{ marginBottom: '0.5rem' }}>
                Cấp 1: Tổng Ngành Hàng (Category Treemap)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: '1rem' }}>
                Nhấp vào ô ngành hàng để <strong>Drill-down</strong> lọc nhóm sản phẩm bên cạnh.
              </p>
              
              <div className="pbi-treemap">
                {categoriesList.map((cat, idx) => {
                  const sharePct = ((cat.sales / categoryTotalSales) * 100).toFixed(1);
                  const color = treemapColors[idx % treemapColors.length];
                  const isSelected = drillCategory === cat.category;
                  const isAnySelected = drillCategory !== null;
                  
                  return (
                    <div 
                      key={cat.category} 
                      className="pbi-treemap-tile"
                      style={{ 
                        backgroundColor: color,
                        opacity: isAnySelected && !isSelected ? 0.45 : 1,
                        border: isSelected ? '3px solid #000000' : '1px solid rgba(255,255,255,0.15)',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                        boxShadow: isSelected ? `0 8px 25px ${color}` : 'var(--shadow-sm)',
                        flex: `1 1 calc(${Math.max(22, Math.round(parseFloat(sharePct)))}% - 8px)`,
                        minHeight: '130px',
                        padding: '1.25rem',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={() => {
                        if (drillCategory === cat.category) {
                          setDrillCategory(null);
                          setDrillGroup(null);
                          setDrillSubgroup(null);
                        } else {
                          setDrillCategory(cat.category);
                          setDrillGroup(null);
                          setDrillSubgroup(null);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1.65rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
                            {getCategoryIcon(cat.category)}
                          </span>
                          <div>
                            <div className="pbi-treemap-tile-title" style={{ textDecoration: isSelected ? 'underline' : 'none', fontWeight: 800 }}>
                              {cat.category || 'Khác'} {isSelected && '✓'}
                            </div>
                            <div className="pbi-treemap-tile-percent" style={{ opacity: 0.95, fontSize: '0.78rem', marginTop: '2px', fontWeight: 600 }}>
                              Tỷ trọng: {sharePct}%
                            </div>
                          </div>
                        </div>
                        <div className="pbi-treemap-tile-value" style={{ alignSelf: 'flex-end', fontSize: '1.35rem', fontWeight: 800 }}>
                          {formatCurrency(cat.sales)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIER 2: Product Group (Nhóm sản phẩm) */}
            <div className="pbi-card">
              <div className="pbi-slicer-title pbi-slicer-title-orange" style={{ marginBottom: '0.5rem' }}>
                Cấp 2: Nhóm Sản Phẩm (Product Group List)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: '1rem' }}>
                {drillCategory ? (
                  <span>Danh sách Nhóm thuộc ngành <strong>{drillCategory}</strong>. Nhấp chọn để lọc Phân nhóm phía dưới.</span>
                ) : (
                  <span>Danh sách Nhóm trên toàn ngành. Chọn ngành hàng ở Cấp 1 để lọc chi tiết hơn.</span>
                )}
              </p>
              
              <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th>Nhóm SP</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>Doanh số & Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupsList.map((g, idx) => {
                      const pct = maxGroupSales > 0 ? (g.sales / maxGroupSales) * 100 : 0;
                      const isSelected = drillGroup === g.group;
                      const isAnySelected = drillGroup !== null;
                      
                      return (
                        <tr 
                          key={idx}
                          style={{ 
                            cursor: 'pointer',
                            opacity: isAnySelected && !isSelected ? 0.5 : 1,
                            backgroundColor: isSelected ? 'rgba(247, 148, 29, 0.08)' : 'inherit',
                            fontWeight: isSelected ? 'bold' : 'normal'
                          }}
                          onClick={() => {
                            if (drillGroup === g.group) {
                              setDrillGroup(null);
                              setDrillSubgroup(null);
                            } else {
                              setDrillGroup(g.group);
                              setDrillSubgroup(null);
                            }
                          }}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--cj-orange)' }}>{isSelected ? '▼' : '▶'}</span>
                            {g.group || 'Khác'} {isSelected && '(Đang chọn)'}
                          </td>
                          <td>
                            <div className="pbi-data-bar-container">
                              <span style={{ minWidth: '90px', textAlign: 'right', fontSize: '0.8rem' }}>
                                {formatCurrency(g.sales)}
                              </span>
                              <div className="pbi-data-bar-bg">
                                <div 
                                  className="pbi-data-bar-fill pbi-data-bar-fill-orange" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TIER 3 & TIER 4 ROW */}
          <div className="pbi-layout-grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
            {/* TIER 3: Product Subgroup (Phân nhóm SP) */}
            <div className="pbi-card">
              <div className="pbi-slicer-title pbi-slicer-title-red" style={{ marginBottom: '0.5rem' }}>
                Cấp 3: Phân Nhóm Sản Phẩm (Subgroup List)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: '1rem' }}>
                {drillGroup ? (
                  <span>Phân nhóm thuộc <strong>{drillGroup}</strong>. Nhấp chọn để lọc bảng chi tiết bên cạnh.</span>
                ) : (
                  <span>Danh sách Phân nhóm. Chọn Nhóm SP ở Cấp 2 để lọc sâu hơn.</span>
                )}
              </p>
              
              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th>Phân nhóm SP</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Doanh số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subgroupsList.map((sub, idx) => {
                      const pct = maxSubgroupSales > 0 ? (sub.sales / maxSubgroupSales) * 100 : 0;
                      const isSelected = drillSubgroup === sub.subgroup;
                      const isAnySelected = drillSubgroup !== null;
                      
                      return (
                        <tr 
                          key={idx}
                          style={{ 
                            cursor: 'pointer',
                            opacity: isAnySelected && !isSelected ? 0.5 : 1,
                            backgroundColor: isSelected ? 'rgba(227, 24, 55, 0.08)' : 'inherit',
                            fontWeight: isSelected ? 'bold' : 'normal'
                          }}
                          onClick={() => {
                            if (drillSubgroup === sub.subgroup) {
                              setDrillSubgroup(null);
                            } else {
                              setDrillSubgroup(sub.subgroup);
                            }
                          }}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{isSelected ? '●' : '○'}</span>
                            {sub.subgroup || 'Khác'}
                          </td>
                          <td>
                            <div className="pbi-data-bar-container">
                              <span style={{ minWidth: '75px', textAlign: 'right', fontSize: '0.78rem' }}>
                                {formatCurrency(sub.sales)}
                              </span>
                              <div className="pbi-data-bar-bg" style={{ height: '8px' }}>
                                <div 
                                  className="pbi-data-bar-fill pbi-data-bar-fill-red" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TIER 4: SKU Details Table (Chi tiết sản phẩm) */}
            <div className="pbi-card">
              <div className="pbi-slicer-title" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Cấp 4: Chi tiết danh sách sản phẩm (SKU Details Table)</span>
                <span style={{ fontSize: '0.72rem', color: '#605e5c', fontWeight: 'normal' }}>
                  Tìm thấy {skusList.length} SKUs phù hợp
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: '1rem' }}>
                Số liệu chi tiết tương ứng với các điều kiện lọc drill-down đang kích hoạt.
              </p>
              
              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>Hạng</th>
                      <th>Mã SP</th>
                      <th>Tên SKU Sản phẩm</th>
                      <th>Ngành hàng</th>
                      <th>Nhóm</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>Doanh số & Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skusList.map((p, idx) => {
                      const pct = maxProductSales > 0 ? (p.sales / maxProductSales) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#605e5c' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#605e5c' }}>{p.code || 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ fontSize: '0.78rem' }}>{p.category}</td>
                          <td style={{ fontSize: '0.78rem' }}>{p.group}</td>
                          <td>
                            <div className="pbi-data-bar-container">
                              <span style={{ minWidth: '90px', fontWeight: 700, fontSize: '0.8rem', textAlign: 'right' }}>
                                {formatCurrency(p.sales)}
                              </span>
                              <div className="pbi-data-bar-bg">
                                <div 
                                  className="pbi-data-bar-fill pbi-data-bar-fill-blue" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </>
          )}

          {/* SUB-TAB: REVIEW BY DETAIL (Masan Mini Report style) */}
          {productSubTab === 'detail' && (() => {
            const detail = productData?.detailData;
            const ds = detail?.detailSummary || { totalSellin: 0, totalSellout: 0, skuCount: 0, nppCount: 0 };
            const regionBk = detail?.regionBreakdown || [];
            const catByType = detail?.categoryByType || [];
            const topSellers = detail?.topSellers || [];
            const slowMovers = detail?.slowMovers || [];
            const totalCatSales = catByType.reduce((acc: number, c: any) => acc + c.sellin + c.sellout, 0) || 1;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Report Title Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem 2rem',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.3)'
                }}>
                  <div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                      📋 Product Review by Detail
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                      Báo cáo chi tiết sản phẩm • Sell-in / Sell-out • Kỳ: {reportYear || 'Tất cả'} - Tháng {reportMonth || 'Tất cả'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>Cập nhật: {new Date().toLocaleDateString('vi-VN')}</div>
                    <div style={{ marginTop: '2px' }}>PostgreSQL Live</div>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="pbi-card pbi-card-accent-blue">
                    <div className="pbi-card-title">Tổng Sell-in</div>
                    <div className="pbi-card-value">{formatCurrency(ds.totalSellin)}</div>
                    <div className="pbi-card-sub">Doanh số nhập hàng từ NPP</div>
                  </div>
                  <div className="pbi-card pbi-card-accent-orange">
                    <div className="pbi-card-title">Tổng Sell-out</div>
                    <div className="pbi-card-value">{formatCurrency(ds.totalSellout)}</div>
                    <div className="pbi-card-sub">Doanh số bán ra điểm bán</div>
                  </div>
                  <div className="pbi-card pbi-card-accent-red">
                    <div className="pbi-card-title">Số SKU Hoạt Động</div>
                    <div className="pbi-card-value">{ds.skuCount.toLocaleString('vi-VN')}</div>
                    <div className="pbi-card-sub">Mã sản phẩm có giao dịch</div>
                  </div>
                  <div className="pbi-card" style={{ borderLeft: '4px solid #0d9488' }}>
                    <div className="pbi-card-title">Số NPP Hoạt Động</div>
                    <div className="pbi-card-value">{ds.nppCount.toLocaleString('vi-VN')}</div>
                    <div className="pbi-card-sub">Nhà phân phối có giao dịch</div>
                  </div>
                </div>

                {/* Sell-in/Sell-out Ratio Bar */}
                {(ds.totalSellin > 0 || ds.totalSellout > 0) && (
                  <div className="pbi-card" style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#252423', marginBottom: '10px' }}>📊 Tỷ lệ Sell-in / Sell-out</div>
                    <div style={{ display: 'flex', height: '32px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                      <div style={{
                        width: `${(ds.totalSellin / (ds.totalSellin + ds.totalSellout)) * 100}%`,
                        background: 'linear-gradient(90deg, var(--cj-blue), #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.75rem', fontWeight: 700, minWidth: '80px'
                      }}>
                        Sell-in: {((ds.totalSellin / (ds.totalSellin + ds.totalSellout)) * 100).toFixed(1)}%
                      </div>
                      <div style={{
                        flex: 1,
                        background: 'linear-gradient(90deg, var(--cj-orange), #f59e0b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.75rem', fontWeight: 700, minWidth: '80px'
                      }}>
                        Sell-out: {((ds.totalSellout / (ds.totalSellin + ds.totalSellout)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Breakdown Table */}
                <div className="pbi-card" style={{ padding: '0' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#252423' }}>📦 Phân tích theo Ngành Hàng (Category)</div>
                    <span style={{ fontSize: '0.75rem', color: '#a19f9d', fontWeight: 600 }}>{catByType.length} ngành hàng</span>
                  </div>
                  <div className="table-responsive">
                    <table className="pbi-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '30px' }}>#</th>
                          <th>Ngành Hàng</th>
                          <th style={{ textAlign: 'right' }}>Sell-in</th>
                          <th style={{ textAlign: 'right' }}>Sell-out</th>
                          <th style={{ textAlign: 'center', width: '100px' }}>Tỷ trọng</th>
                          <th style={{ textAlign: 'right', width: '70px' }}>SKU</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catByType.map((cat: any, idx: number) => {
                          const catTotal = cat.sellin + cat.sellout;
                          const pctOfTotal = (catTotal / totalCatSales) * 100;
                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#605e5c' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{getCategoryIcon(cat.category)}</span>
                                <span>{cat.category}</span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--cj-blue)' }}>{formatCurrency(cat.sellin)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--cj-orange)' }}>{formatCurrency(cat.sellout)}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pctOfTotal}%`, height: '100%', background: idx === 0 ? 'var(--cj-blue)' : idx === 1 ? 'var(--cj-orange)' : idx === 2 ? 'var(--cj-red)' : '#0d9488', borderRadius: '4px' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#605e5c', minWidth: '38px', textAlign: 'right' }}>{pctOfTotal.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{cat.skuCount}</td>
                            </tr>
                          );
                        })}
                        {/* Total Row */}
                        <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                          <td></td>
                          <td>TỔNG CỘNG</td>
                          <td style={{ textAlign: 'right', color: 'var(--cj-blue)' }}>{formatCurrency(catByType.reduce((s: number, c: any) => s + c.sellin, 0))}</td>
                          <td style={{ textAlign: 'right', color: 'var(--cj-orange)' }}>{formatCurrency(catByType.reduce((s: number, c: any) => s + c.sellout, 0))}</td>
                          <td style={{ textAlign: 'center' }}>100%</td>
                          <td style={{ textAlign: 'right' }}>{ds.skuCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top 10 & Slow 10 Side by Side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* Top 10 Best Sellers */}
                  <div className="pbi-card" style={{ padding: '0' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🏆</span>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#252423' }}>Top 10 SKU Bán Chạy (Sell-out)</span>
                    </div>
                    <div className="table-responsive">
                      <table className="pbi-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30px' }}>#</th>
                            <th>Sản Phẩm</th>
                            <th style={{ textAlign: 'right' }}>Doanh Số</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSellers.map((sku: any, idx: number) => {
                            const topMax = topSellers[0]?.sales || 1;
                            const barPct = (sku.sales / topMax) * 100;
                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: '22px', height: '22px', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 800,
                                    background: idx < 3 ? (idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : '#cd7c2f') : '#f1f5f9',
                                    color: idx < 3 ? '#fff' : '#605e5c'
                                  }}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{sku.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#a19f9d' }}>{sku.code} • {sku.category}</div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#252423' }}>{formatCurrency(sku.sales)}</span>
                                    <div style={{ width: '100px', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${barPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '3px' }}></div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {topSellers.length === 0 && (
                            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#a19f9d', padding: '1.5rem' }}>Chưa có dữ liệu</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top 10 Slow Movers */}
                  <div className="pbi-card" style={{ padding: '0' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#252423' }}>Top 10 SKU Bán Chậm (Sell-out)</span>
                    </div>
                    <div className="table-responsive">
                      <table className="pbi-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30px' }}>#</th>
                            <th>Sản Phẩm</th>
                            <th style={{ textAlign: 'right' }}>Doanh Số</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slowMovers.map((sku: any, idx: number) => {
                            const slowMax = slowMovers[slowMovers.length - 1]?.sales || 1;
                            const barPct = slowMax > 0 ? (sku.sales / slowMax) * 100 : 0;
                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#ef4444', fontSize: '0.8rem' }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{sku.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#a19f9d' }}>{sku.code} • {sku.category}</div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ef4444' }}>{formatCurrency(sku.sales)}</span>
                                    <div style={{ width: '100px', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(barPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #f97316)', borderRadius: '3px' }}></div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {slowMovers.length === 0 && (
                            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#a19f9d', padding: '1.5rem' }}>Chưa có dữ liệu</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Regional Breakdown */}
                <div className="pbi-card" style={{ padding: '0' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🗺️</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#252423' }}>Phân Bổ Theo Vùng / Miền</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(regionBk.length, 1)}, 1fr)`, gap: '0' }}>
                    {regionBk.map((reg: any, idx: number) => {
                      const regTotal = reg.sellin + reg.sellout;
                      const allRegTotal = regionBk.reduce((s: number, r: any) => s + r.sellin + r.sellout, 0) || 1;
                      const regPct = (regTotal / allRegTotal) * 100;
                      const colors = ['var(--cj-blue)', 'var(--cj-orange)', 'var(--cj-red)', '#0d9488'];
                      const accentColor = colors[idx % colors.length];
                      return (
                        <div key={idx} style={{
                          padding: '1.5rem',
                          borderRight: idx < regionBk.length - 1 ? '1px solid var(--border-color)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#252423' }}>{reg.region}</span>
                            <span className="badge" style={{ backgroundColor: `${accentColor}15`, color: accentColor, fontWeight: 700, fontSize: '0.78rem' }}>
                              {regPct.toFixed(1)}% tổng
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Sell-in</div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--cj-blue)' }}>{formatCurrency(reg.sellin)}</div>
                            </div>
                            <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Sell-out</div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--cj-orange)' }}>{formatCurrency(reg.sellout)}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#605e5c' }}>
                            <span>📦 <strong>{reg.skuCount}</strong> SKU</span>
                            <span>🏪 <strong>{reg.nppCount}</strong> NPP</span>
                          </div>
                        </div>
                      );
                    })}
                    {regionBk.length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#a19f9d', gridColumn: '1 / -1' }}>
                        Chưa có dữ liệu vùng miền
                      </div>
                    )}
                  </div>
                </div>

                {/* 6 Months Trend Mockup */}
                <div className="pbi-card" style={{ padding: '0' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📈</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#252423' }}>Xu Hướng Doanh Số Ngành Hàng (6 Tháng Gần Nhất) - Dữ liệu mô phỏng</span>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '15px', height: '220px' }}>
                    {[
                      { month: 'Tháng 1', sales: 450, sellout: 420 },
                      { month: 'Tháng 2', sales: 480, sellout: 450 },
                      { month: 'Tháng 3', sales: 410, sellout: 430 },
                      { month: 'Tháng 4', sales: 520, sellout: 490 },
                      { month: 'Tháng 5', sales: 560, sellout: 530 },
                      { month: 'Tháng 6', sales: 610, sellout: 580 }
                    ].map((item, idx) => {
                      const maxVal = 650;
                      const inHeight = (item.sales / maxVal) * 100;
                      const outHeight = (item.sellout / maxVal) * 100;
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '6px', width: '100%', justifyContent: 'center' }}>
                            {/* Sell in bar */}
                            <div style={{ width: '35%', height: `${inHeight}%`, background: 'var(--cj-blue)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                               <div style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--cj-blue)' }}>{item.sales}M</div>
                            </div>
                            {/* Sell out bar */}
                            <div style={{ width: '35%', height: `${outHeight}%`, background: 'var(--cj-orange)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                               <div style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--cj-orange)' }}>{item.sellout}M</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#605e5c' }}>{item.month}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', display: 'flex', gap: '1rem', justifyContent: 'center', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: 'var(--cj-blue)', borderRadius: '2px' }}></div> Sell-in (Triệu VNĐ)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: 'var(--cj-orange)', borderRadius: '2px' }}></div> Sell-out (Triệu VNĐ)</div>
                  </div>
                </div>

                {/* Product Group Heatmap Mockup */}
                <div className="pbi-card" style={{ padding: '0' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔥</span>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#252423' }}>Phân Tích Tỷ Lệ Bao Phủ Nhóm Sản Phẩm (Heatmap) - Dữ liệu mô phỏng</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 600 }}>Tỷ lệ cửa hàng có bán sản phẩm</div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {[
                      { name: 'Xúc xích Lắc', cover: 85, color: '#22c55e', bg: '#f0fdf4' },
                      { name: 'Xúc xích Dinh dưỡng', cover: 78, color: '#16a34a', bg: '#dcfce7' },
                      { name: 'Chả lụa / Chả giò', cover: 88, color: '#15803d', bg: '#bbf7d0' },
                      { name: 'Đồ viên', cover: 72, color: '#84cc16', bg: '#ecfccb' },
                      { name: 'Thịt nguội', cover: 62, color: '#eab308', bg: '#fef9c3' },
                      { name: 'Kim chi', cover: 55, color: '#eab308', bg: '#fef9c3' },
                      { name: 'Thịt tươi', cover: 45, color: '#f97316', bg: '#ffedd5' },
                      { name: 'Gia vị', cover: 30, color: '#ef4444', bg: '#fee2e2' },
                    ].map((g, i) => (
                       <div key={i} style={{ background: g.bg, borderRadius: '8px', padding: '1.25rem', border: `1px solid ${g.color}40`, display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s ease', cursor: 'pointer' }} className="pbi-top-sku-card">
                         <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#252423' }}>{g.name}</div>
                         <div style={{ fontSize: '1.8rem', fontWeight: 800, color: g.color }}>{g.cover}%</div>
                         <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tỷ lệ bao phủ (Coverage)</div>
                       </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}
          </div>
        );
      })()}
      {/* 2. SF PERFORMANCE */}
      {activeReportTab === 'sf' && (() => {
        if (!sfData || !sfData.repsData) {
          return (
            <div className="pbi-canvas" style={{ padding: '2rem', textAlign: 'center', color: '#605e5c', fontWeight: 700 }}>
              ⚠️ Không có dữ liệu Sales Force. Vui lòng chọn năm/tháng khác.
            </div>
          );
        }

        // 1. Grand totals & rates
        const totalSales = sfData.repsData.reduce((sum, r) => sum + (r.sales || 0), 0);
        const totalMcp = sfData.repsData.reduce((sum, r) => sum + (r.mcp_count || 0), 0);
        const totalVisits = sfData.repsData.reduce((sum, r) => sum + (r.total_visits || 0), 0);
        const totalOutlets = sfData.repsData.reduce((sum, r) => sum + (r.buying_outlets || 0), 0);
        const totalTransactions = sfData.repsData.reduce((sum, r) => sum + (r.transactions || 0), 0);
        const totalSkuSum = sfData.repsData.reduce((sum, r) => sum + (r.sku_sum || 0), 0);


        const avgSkuOrder = totalTransactions > 0 ? totalSkuSum / totalTransactions : 0;
        const avgDropsize = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // 2. Region calculations
        const regionsSet = Array.from(new Set(sfData.repsData.map(r => r.region).filter(Boolean)));
        const regionsData = regionsSet.map(regName => {
          const reps = sfData.repsData.filter(r => r.region === regName);
          const mcp = reps.reduce((sum, r) => sum + (r.mcp_count || 0), 0);
          const visits = reps.reduce((sum, r) => sum + (r.total_visits || 0), 0);
          const sales = reps.reduce((sum, r) => sum + (r.sales || 0), 0);
          const outlets = reps.reduce((sum, r) => sum + (r.buying_outlets || 0), 0);
          const txns = reps.reduce((sum, r) => sum + (r.transactions || 0), 0);
          const skuSum = reps.reduce((sum, r) => sum + (r.sku_sum || 0), 0);
          const sellinTarget = reps.reduce((sum, r) => sum + (r.sellin_target || 0), 0);
          const sellinActual = reps.reduce((sum, r) => sum + (r.sellin_actual || 0), 0);
          const selloutTarget = reps.reduce((sum, r) => sum + (r.sellout_target || 0), 0);
          const selloutActual = reps.reduce((sum, r) => sum + (r.sellout_actual || 0), 0);

          return {
            region: regName,
            mcp_count: mcp,
            total_visits: visits,
            sales: sales,
            buying_outlets: outlets,
            transactions: txns,
            sku_sum: skuSum,
            sellin_target: sellinTarget,
            sellin_actual: sellinActual,
            sellout_target: selloutTarget,
            sellout_actual: selloutActual,
            sellin_pct: sellinTarget > 0 ? (sellinActual / sellinTarget) * 100 : 0,
            sellout_pct: selloutTarget > 0 ? (selloutActual / selloutTarget) * 100 : 0,
            aso: outlets,
            vpo: outlets > 0 ? sales / outlets : 0,
            dropsize: txns > 0 ? sales / txns : 0,
            sku_order: txns > 0 ? skuSum / txns : 0,
            visited_pct: mcp > 0 ? (visits / mcp) * 100 : 0,
            strike_rate: mcp > 0 ? (outlets / mcp) * 100 : 0
          };
        });

        // 3. Category calculations
        // productSales has: category, brand, revenue, product_code, product_name
        const catSalesMap = (sfData.productSales || []).reduce((acc, curr) => {
          const cat = curr.category || 'Khác';
          if (!acc[cat]) acc[cat] = { category: cat, revenue: 0 };
          acc[cat].revenue += parseFloat(curr.revenue) || 0;
          return acc;
        }, {} as Record<string, { category: string, revenue: number }>);

        // kpiSales has: region, revenue (SIA), orders, sellin_target, sellout_target
        // Total across all regions for category-level view
        const catKpisMap = (sfData.kpiSales || []).reduce((acc, curr) => {
          // No category field in kpiSales, so aggregate globally
          const cat = curr.region || 'Khác';
          if (!acc[cat]) acc[cat] = { category: cat, sellin_actual: 0, sellin_target: 0, sellout_target: 0 };
          acc[cat].sellin_actual += parseFloat(curr.revenue) || 0;
          acc[cat].sellin_target += parseFloat(curr.sellin_target) || 0;
          acc[cat].sellout_target += parseFloat(curr.sellout_target) || 0;
          return acc;
        }, {} as Record<string, { category: string, sellin_actual: number, sellin_target: number, sellout_target: number }>);
        void catKpisMap; // reserved for future category-level KPI breakdown

        // Build categoriesList: merge revenue-based categories with kpi-based data
        const allCategories = Object.keys(catSalesMap);
        void allCategories; // preserve for future category report expansion

        // 4. Area calculations
        const areasSet = Array.from(new Set(sfData.repsData.map(r => r.area).filter(Boolean)));
        const areasData = areasSet.map(areaName => {
          const reps = sfData.repsData.filter(r => r.area === areaName);
          const mcp = reps.reduce((sum, r) => sum + (r.mcp_count || 0), 0);
          const visits = reps.reduce((sum, r) => sum + (r.total_visits || 0), 0);
          const sales = reps.reduce((sum, r) => sum + (r.sales || 0), 0);
          const outlets = reps.reduce((sum, r) => sum + (r.buying_outlets || 0), 0);
          const txns = reps.reduce((sum, r) => sum + (r.transactions || 0), 0);
          const skuSum = reps.reduce((sum, r) => sum + (r.sku_sum || 0), 0);
          const sellinTarget = reps.reduce((sum, r) => sum + (r.sellin_target || 0), 0);
          const sellinActual = reps.reduce((sum, r) => sum + (r.sellin_actual || 0), 0);
          const selloutTarget = reps.reduce((sum, r) => sum + (r.sellout_target || 0), 0);
          const selloutActual = reps.reduce((sum, r) => sum + (r.sellout_actual || 0), 0);

          return {
            area: formatAreaName(areaName),
            region: reps[0]?.region || 'Khác',
            mcp_count: mcp,
            total_visits: visits,
            sales: sales,
            buying_outlets: outlets,
            transactions: txns,
            sku_sum: skuSum,
            sellin_target: sellinTarget,
            sellin_actual: sellinActual,
            sellout_target: selloutTarget,
            sellout_actual: selloutActual,
            sellin_pct: sellinTarget > 0 ? (sellinActual / sellinTarget) * 100 : 0,
            sellout_pct: selloutTarget > 0 ? (selloutActual / selloutTarget) * 100 : 0,
            aso: outlets,
            vpo: outlets > 0 ? sales / outlets : 0,
            dropsize: txns > 0 ? sales / txns : 0,
            sku_order: txns > 0 ? skuSum / txns : 0,
            visited_pct: mcp > 0 ? (visits / mcp) * 100 : 0,
            strike_rate: mcp > 0 ? (outlets / mcp) * 100 : 0
          };
        }).sort((a, b) => b.sales - a.sales);

        // 5. Filter reps by search query
        const filteredReps = sfData.repsData.filter(r => {
          const query = sfRepSearch.toLowerCase().trim();
          if (!query) return true;
          return (
            (r.staff_name || '').toLowerCase().includes(query) ||
            (r.staff_id || '').toLowerCase().includes(query) ||
            (r.sup_name || '').toLowerCase().includes(query) ||
            (r.area || '').toLowerCase().includes(query) ||
            (r.distributor || '').toLowerCase().includes(query)
          );
        });

        // 6. Group filtered reps by supervisor
        const supStats = filteredReps.reduce((acc, curr) => {
          const sup = curr.sup_name || 'Không có GSBH';
          if (!acc[sup]) {
            acc[sup] = {
              name: sup,
              asm: curr.asm_name || '',
              region: curr.region || '',
              area: curr.area || '',
              reps: [],
              sales: 0,
              buying_outlets: 0,
              mcp_count: 0,
              total_visits: 0,
              transactions: 0,
              sku_sum: 0,
              sellin_target: 0,
              sellin_actual: 0,
              sellout_target: 0,
              sellout_actual: 0
            };
          }
          acc[sup].reps.push(curr);
          acc[sup].sales += curr.sales || 0;
          acc[sup].buying_outlets += curr.buying_outlets || 0;
          acc[sup].mcp_count += curr.mcp_count || 0;
          acc[sup].total_visits += curr.total_visits || 0;
          acc[sup].transactions += curr.transactions || 0;
          acc[sup].sku_sum += curr.sku_sum || 0;
          acc[sup].sellin_target += curr.sellin_target || 0;
          acc[sup].sellin_actual += curr.sellin_actual || 0;
          acc[sup].sellout_target += curr.sellout_target || 0;
          acc[sup].sellout_actual += curr.sellout_actual || 0;
          return acc;
        }, {} as Record<string, any>);

        const supsList = Object.values(supStats).map((s: any) => {
          return {
            ...s,
            sellin_pct: s.sellin_target > 0 ? (s.sellin_actual / s.sellin_target) * 100 : 0,
            sellout_pct: s.sellout_target > 0 ? (s.sellout_actual / s.sellout_target) * 100 : 0,
            aso: s.buying_outlets,
            vpo: s.buying_outlets > 0 ? s.sales / s.buying_outlets : 0,
            dropsize: s.transactions > 0 ? s.sales / s.transactions : 0,
            sku_order: s.transactions > 0 ? s.sku_sum / s.transactions : 0,
            visited_pct: s.mcp_count > 0 ? (s.total_visits / s.mcp_count) * 100 : 0,
            strike_rate: s.mcp_count > 0 ? (s.buying_outlets / s.mcp_count) * 100 : 0
          };
        }).sort((a, b) => b.sales - a.sales);

        const toggleSup = (supName: string) => {
          setExpandedSups(prev => ({
            ...prev,
            [supName]: !prev[supName]
          }));
        };

        const isSupExpanded = (supName: string) => {
          if (sfRepSearch.trim() !== '') return true;
          return !!expandedSups[supName];
        };

        const buildSfKpiTree = (): SfKpiTreeNode[] => {
          const reps = sfData?.repsData || [];
          
          const regionsMapCorrected: Record<string, {
            name: string;
            sellin_target: number;
            sellin_actual: number;
            sellout_target: number;
            sellout_actual: number;
            sales: number;
            mcp_count: number;
            buying_outlets: number;
            total_visits: number;
            transactions: number;
            sku_sum: number;
            asms: Record<string, {
              name: string;
              sellin_target: number;
              sellin_actual: number;
              sellout_target: number;
              sellout_actual: number;
              sales: number;
              mcp_count: number;
              buying_outlets: number;
              total_visits: number;
              transactions: number;
              sku_sum: number;
              sups: Record<string, {
                name: string;
                sellin_target: number;
                sellin_actual: number;
                sellout_target: number;
                sellout_actual: number;
                sales: number;
                mcp_count: number;
                buying_outlets: number;
                total_visits: number;
                transactions: number;
                sku_sum: number;
                repsList: any[];
              }>;
            }>;
          }> = {};

          reps.forEach(rep => {
            const regKey = rep.region || 'N/A';
            const asmKey = rep.asm_name || 'N/A';
            const supKey = rep.sup_name || 'N/A';

            if (!regionsMapCorrected[regKey]) {
              regionsMapCorrected[regKey] = {
                name: regKey,
                sellin_target: 0, sellin_actual: 0, sellout_target: 0, sellout_actual: 0,
                sales: 0, mcp_count: 0, buying_outlets: 0, total_visits: 0, transactions: 0, sku_sum: 0,
                asms: {}
              };
            }
            const regNode = regionsMapCorrected[regKey];

            if (!regNode.asms[asmKey]) {
              regNode.asms[asmKey] = {
                name: asmKey,
                sellin_target: 0, sellin_actual: 0, sellout_target: 0, sellout_actual: 0,
                sales: 0, mcp_count: 0, buying_outlets: 0, total_visits: 0, transactions: 0, sku_sum: 0,
                sups: {}
              };
            }
            const asmNode = regNode.asms[asmKey];

            if (!asmNode.sups[supKey]) {
              asmNode.sups[supKey] = {
                name: supKey,
                sellin_target: 0, sellin_actual: 0, sellout_target: 0, sellout_actual: 0,
                sales: 0, mcp_count: 0, buying_outlets: 0, total_visits: 0, transactions: 0, sku_sum: 0,
                repsList: []
              };
            }
            const supNode = asmNode.sups[supKey];

            const sInTarget = rep.sellin_target || 0;
            const sInActual = rep.sellin_actual || 0;
            const sOutTarget = rep.sellout_target || 0;
            const sOutActual = rep.sellout_actual || 0;
            const sls = rep.sales || 0;
            const mcp = rep.mcp_count || 0;
            const active = rep.buying_outlets || 0;
            const vsts = rep.total_visits || 0;
            const txns = rep.transactions || 0;
            const skus = rep.sku_sum || 0;

            regNode.sellin_target += sInTarget;
            regNode.sellin_actual += sInActual;
            regNode.sellout_target += sOutTarget;
            regNode.sellout_actual += sOutActual;
            regNode.sales += sls;
            regNode.mcp_count += mcp;
            regNode.buying_outlets += active;
            regNode.total_visits += vsts;
            regNode.transactions += txns;
            regNode.sku_sum += skus;

            asmNode.sellin_target += sInTarget;
            asmNode.sellin_actual += sInActual;
            asmNode.sellout_target += sOutTarget;
            asmNode.sellout_actual += sOutActual;
            asmNode.sales += sls;
            asmNode.mcp_count += mcp;
            asmNode.buying_outlets += active;
            asmNode.total_visits += vsts;
            asmNode.transactions += txns;
            asmNode.sku_sum += skus;

            supNode.sellin_target += sInTarget;
            supNode.sellin_actual += sInActual;
            supNode.sellout_target += sOutTarget;
            supNode.sellout_actual += sOutActual;
            supNode.sales += sls;
            supNode.mcp_count += mcp;
            supNode.buying_outlets += active;
            supNode.total_visits += vsts;
            supNode.transactions += txns;
            supNode.sku_sum += skus;

            supNode.repsList.push(rep);
          });

          return Object.keys(regionsMapCorrected).map(regKey => {
            const regVal = regionsMapCorrected[regKey];
            const asmsList: SfKpiTreeNode[] = Object.keys(regVal.asms).map(asmKey => {
              const asmVal = regVal.asms[asmKey];
              const supsList: SfKpiTreeNode[] = Object.keys(asmVal.sups).map(supKey => {
                const supVal = asmVal.sups[supKey];
                const repsList: SfKpiTreeNode[] = supVal.repsList.map(rep => {
                  return {
                    id: `rep:${regKey}:${asmKey}:${supKey}:${rep.staff_id}`,
                    name: `${rep.staff_name} (${rep.staff_id})`,
                    level: 'rep' as const,
                    region: regKey,
                    asm_name: asmKey,
                    sup_name: supKey,
                    staff_id: rep.staff_id,
                    sellin_target: rep.sellin_target || 0,
                    sellin_actual: rep.sellin_actual || 0,
                    sellout_target: rep.sellout_target || 0,
                    sellout_actual: rep.sellout_actual || 0,
                    sales: rep.sales || 0,
                    mcp_count: rep.mcp_count || 0,
                    buying_outlets: rep.buying_outlets || 0,
                    total_visits: rep.total_visits || 0,
                    transactions: rep.transactions || 0,
                    sku_sum: rep.sku_sum || 0,
                    children: []
                  };
                }).sort((a, b) => b.sales - a.sales);

                return {
                  id: `sup:${regKey}:${asmKey}:${supKey}`,
                  name: supKey,
                  level: 'sup' as const,
                  region: regKey,
                  asm_name: asmKey,
                  sup_name: supKey,
                  sellin_target: supVal.sellin_target,
                  sellin_actual: supVal.sellin_actual,
                  sellout_target: supVal.sellout_target,
                  sellout_actual: supVal.sellout_actual,
                  sales: supVal.sales,
                  mcp_count: supVal.mcp_count,
                  buying_outlets: supVal.buying_outlets,
                  total_visits: supVal.total_visits,
                  transactions: supVal.transactions,
                  sku_sum: supVal.sku_sum,
                  children: repsList
                };
              }).sort((a, b) => b.sales - a.sales);

              return {
                id: `asm:${regKey}:${asmKey}`,
                name: asmKey,
                level: 'asm' as const,
                region: regKey,
                asm_name: asmKey,
                sup_name: '',
                sellin_target: asmVal.sellin_target,
                sellin_actual: asmVal.sellin_actual,
                sellout_target: asmVal.sellout_target,
                sellout_actual: asmVal.sellout_actual,
                sales: asmVal.sales,
                mcp_count: asmVal.mcp_count,
                buying_outlets: asmVal.buying_outlets,
                total_visits: asmVal.total_visits,
                transactions: asmVal.transactions,
                sku_sum: asmVal.sku_sum,
                children: supsList
              };
            }).sort((a, b) => b.sales - a.sales);

            return {
              id: `region:${regKey}`,
              name: regKey,
              level: 'region' as const,
              region: regKey,
              asm_name: '',
              sup_name: '',
              sellin_target: regVal.sellin_target,
              sellin_actual: regVal.sellin_actual,
              sellout_target: regVal.sellout_target,
              sellout_actual: regVal.sellout_actual,
              sales: regVal.sales,
              mcp_count: regVal.mcp_count,
              buying_outlets: regVal.buying_outlets,
              total_visits: regVal.total_visits,
              transactions: regVal.transactions,
              sku_sum: regVal.sku_sum,
              children: asmsList
            };
          }).sort((a, b) => b.sales - a.sales);
        };

        const filterSfKpiTree = (nodes: SfKpiTreeNode[], query: string): SfKpiTreeNode[] => {
          if (!query) return nodes;
          const lowerQuery = query.toLowerCase();
          
          return nodes
            .map(node => {
              const matchesSelf = 
                node.name.toLowerCase().includes(lowerQuery) || 
                (node.staff_id && node.staff_id.toLowerCase().includes(lowerQuery)) ||
                node.region.toLowerCase().includes(lowerQuery) ||
                (node.asm_name && node.asm_name.toLowerCase().includes(lowerQuery)) ||
                (node.sup_name && node.sup_name.toLowerCase().includes(lowerQuery));
              
              if (node.children && node.children.length > 0) {
                const filteredChildren = filterSfKpiTree(node.children, query);
                if (filteredChildren.length > 0 || matchesSelf) {
                  return {
                    ...node,
                    children: filteredChildren
                  };
                }
              }
              
              return matchesSelf ? node : null;
            })
            .filter((n): n is SfKpiTreeNode => n !== null);
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* SF Performance Sub-menu Navigation Bar */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              borderBottom: '1px solid var(--border-color)', 
              paddingBottom: '0.5rem',
              alignItems: 'center'
            }}>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: sfSubTab === 'overview' ? 'var(--cj-blue)' : 'transparent',
                  color: sfSubTab === 'overview' ? '#ffffff' : '#605e5c',
                  transition: 'all 0.15s ease',
                  boxShadow: sfSubTab === 'overview' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
                onClick={() => setSfSubTab('overview')}
              >
                📊 Tổng quan hiệu suất (Overview)
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: sfSubTab === 'kpis' ? 'var(--cj-blue)' : 'transparent',
                  color: sfSubTab === 'kpis' ? '#ffffff' : '#605e5c',
                  transition: 'all 0.15s ease',
                  boxShadow: sfSubTab === 'kpis' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
                onClick={() => setSfSubTab('kpis')}
              >
                🎯 Theo dõi KPI chi tiết (RSM ➔ ASM ➔ SS ➔ SR)
              </button>
            </div>

            {sfSubTab === 'kpis' ? (() => {
              const fullTree = buildSfKpiTree();
              const filteredTree = filterSfKpiTree(fullTree, sfRepSearch);

              // Helper to check if a node is expanded
              const isKpiNodeExpanded = (node: SfKpiTreeNode) => {
                if (sfRepSearch.trim() !== '') return true;
                if (node.level === 'region') {
                  return expandedSfKpis[node.id] !== false; // default true
                }
                return !!expandedSfKpis[node.id]; // default false for asm and sup
              };

              // Flatten tree to visible rows
              const visibleRows: SfKpiTreeNode[] = [];
              const traverse = (node: SfKpiTreeNode) => {
                visibleRows.push(node);
                if (isKpiNodeExpanded(node) && node.children && node.children.length > 0) {
                  node.children.forEach(traverse);
                }
              };
              filteredTree.forEach(traverse);

              // Calculate overall totals
              let totalSellinTgt = 0;
              let totalSellinAct = 0;
              let totalSelloutTgt = 0;
              let totalSelloutAct = 0;
              let totalSalesVol = 0;
              let totalMcpCount = 0;
              let totalOutletsCount = 0;
              let totalVisitsCount = 0;
              let totalTxnsCount = 0;
              let totalSkuCount = 0;

              filteredTree.forEach(node => {
                if (node.level === 'region') {
                  totalSellinTgt += node.sellin_target;
                  totalSellinAct += node.sellin_actual;
                  totalSelloutTgt += node.sellout_target;
                  totalSelloutAct += node.sellout_actual;
                  totalSalesVol += node.sales;
                  totalMcpCount += node.mcp_count;
                  totalOutletsCount += node.buying_outlets;
                  totalVisitsCount += node.total_visits;
                  totalTxnsCount += node.transactions;
                  totalSkuCount += node.sku_sum;
                }
              });

              const overallSellinPct = totalSellinTgt > 0 ? (totalSellinAct / totalSellinTgt) * 100 : 0;
              const overallSelloutPct = totalSelloutTgt > 0 ? (totalSelloutAct / totalSelloutTgt) * 100 : 0;
              const overallAso = totalOutletsCount;
              const overallVpo = totalOutletsCount > 0 ? totalSalesVol / totalOutletsCount : 0;
              const overallSkuOrder = totalTxnsCount > 0 ? totalSkuCount / totalTxnsCount : 0;
              const overallDropsize = totalTxnsCount > 0 ? totalSalesVol / totalTxnsCount : 0;
              const overallVisitedPct = totalMcpCount > 0 ? (totalVisitsCount / totalMcpCount) * 100 : 0;
              const overallStrikeRate = totalMcpCount > 0 ? (totalOutletsCount / totalMcpCount) * 100 : 0;

              return (
                <div className="pbi-card" style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="pbi-slicer-title" style={{ margin: 0 }}>
                      Cây Phân Cấp KPI Chỉ Số Bán Hàng (RSM ➔ ASM ➔ SS ➔ SR)
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#605e5c' }}>🔍 Tìm kiếm nhanh:</span>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          value={sfRepSearch} 
                          onChange={e => setSfRepSearch(e.target.value)} 
                          placeholder="Tìm theo NVBH, Quản lý, NPP..."
                          style={{
                            padding: '6px 28px 6px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            width: '220px',
                            outline: 'none',
                            fontWeight: 'normal'
                          }}
                        />
                        {sfRepSearch && (
                          <button
                            type="button"
                            onClick={() => setSfRepSearch('')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: '#a19f9d',
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                    <table className="pbi-table" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, boxShadow: '0 1px 0 var(--border-color)' }}>
                          <th style={{ minWidth: '220px' }}>Nhân sự / Phân cấp quản lý</th>
                          <th style={{ textAlign: 'right', width: '120px' }}>Doanh số Sell-out</th>
                          <th style={{ textAlign: 'center', width: '130px' }}>% Đạt Sell-in</th>
                          <th style={{ textAlign: 'center', width: '130px' }}>% Đạt Sell-out</th>
                          <th style={{ textAlign: 'center', width: '90px' }}>Khách MCP</th>
                          <th style={{ textAlign: 'center', width: '110px' }}>ASO (Khách mua)</th>
                          <th style={{ textAlign: 'center', width: '110px' }}>% Ghé thăm</th>
                          <th style={{ textAlign: 'center', width: '100px' }}>Strike Rate</th>
                          <th style={{ textAlign: 'right', width: '120px' }}>VPO</th>
                          <th style={{ textAlign: 'center', width: '90px' }}>SKU/Đơn</th>
                          <th style={{ textAlign: 'right', width: '110px' }}>Dropsize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#a19f9d' }}>
                              Không tìm thấy nhân sự phù hợp
                            </td>
                          </tr>
                        ) : (
                          <>
                            {visibleRows.map(node => {
                              const hasChildren = node.children && node.children.length > 0;
                              const expanded = isKpiNodeExpanded(node);

                              const sellinPct = node.sellin_target > 0 ? (node.sellin_actual / node.sellin_target) * 100 : 0;
                              const selloutPct = node.sellout_target > 0 ? (node.sellout_actual / node.sellout_target) * 100 : 0;
                              const nodeAso = node.buying_outlets;
                              const nodeVpo = node.buying_outlets > 0 ? node.sales / node.buying_outlets : 0;
                              const nodeSkuOrder = node.transactions > 0 ? node.sku_sum / node.transactions : 0;
                              const nodeDropsize = node.transactions > 0 ? node.sales / node.transactions : 0;
                              const nodeVisitedPct = node.mcp_count > 0 ? (node.total_visits / node.mcp_count) * 100 : 0;
                              const nodeStrikeRate = node.mcp_count > 0 ? (node.buying_outlets / node.mcp_count) * 100 : 0;

                              const getIndentPadding = (level: 'region' | 'asm' | 'sup' | 'rep') => {
                                if (level === 'region') return '8px';
                                if (level === 'asm') return '28px';
                                if (level === 'sup') return '48px';
                                return '68px';
                              };

                              const handleToggle = () => {
                                if (!hasChildren) return;
                                setExpandedSfKpis(prev => ({
                                  ...prev,
                                  [node.id]: node.level === 'region' ? prev[node.id] === false : !prev[node.id]
                                }));
                              };

                              // Style row based on level
                              let rowBg = '#ffffff';
                              let rowFontWeight = 'normal';
                              let rowFontSize = '0.78rem';
                              let textColor = 'inherit';

                              if (node.level === 'region') {
                                rowBg = '#f8fafc';
                                rowFontWeight = '800';
                                rowFontSize = '0.84rem';
                                textColor = 'var(--cj-blue)';
                              } else if (node.level === 'asm') {
                                rowBg = '#fafbfc';
                                rowFontWeight = '700';
                                rowFontSize = '0.8rem';
                                textColor = 'var(--cj-orange)';
                              } else if (node.level === 'sup') {
                                rowBg = '#ffffff';
                                rowFontWeight = '700';
                                rowFontSize = '0.78rem';
                                textColor = '#0d9488';
                              }

                              return (
                                <tr 
                                  key={node.id}
                                  style={{ 
                                    backgroundColor: rowBg,
                                    borderBottom: node.level === 'region' ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                                    fontSize: rowFontSize,
                                    color: textColor,
                                    fontWeight: rowFontWeight
                                  }}
                                  className="table-row-hover"
                                >
                                  {/* Name */}
                                  <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: getIndentPadding(node.level) }}>
                                      {hasChildren ? (
                                        <button
                                          type="button"
                                          onClick={handleToggle}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            marginRight: '6px',
                                            cursor: 'pointer',
                                            color: 'inherit',
                                            fontSize: '0.72rem',
                                            width: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          {expanded ? '▼' : '▶'}
                                        </button>
                                      ) : (
                                        <span style={{ width: '18px' }}></span>
                                      )}
                                      <span>
                                        {node.level === 'rep' ? (
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{node.name}</span>
                                            {sfData?.repsData?.find((r: any) => r.staff_id === node.staff_id)?.distributor && (
                                              <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 'normal', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                NPP: {sfData?.repsData?.find((r: any) => r.staff_id === node.staff_id)?.distributor}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span>
                                            {node.name}
                                            {node.level === 'asm' && ' (ASM)'}
                                            {node.level === 'sup' && ' (GSBH)'}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Sales */}
                                  <td style={{ textAlign: 'right', fontWeight: node.level !== 'rep' ? 700 : 'normal' }}>
                                    {formatCurrency(node.sales)}
                                  </td>

                                  {/* % Đạt Sell-in */}
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 700 }}>
                                        {node.sellin_target > 0 ? `${sellinPct.toFixed(1)}%` : '-'}
                                      </span>
                                      {node.sellin_target > 0 && (
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>
                                          {formatCurrency(node.sellin_actual)} / {formatCurrency(node.sellin_target)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* % Đạt Sell-out */}
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 700, color: selloutPct >= 100 ? '#166534' : 'inherit' }}>
                                        {node.sellout_target > 0 ? `${selloutPct.toFixed(1)}%` : '-'}
                                      </span>
                                      {node.sellout_target > 0 && (
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>
                                          {formatCurrency(node.sellout_actual)} / {formatCurrency(node.sellout_target)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Khách MCP */}
                                  <td style={{ textAlign: 'center' }}>
                                    {node.mcp_count}
                                  </td>

                                  {/* ASO (Khách mua) */}
                                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                    {nodeAso.toLocaleString('vi-VN')}
                                  </td>

                                  {/* % Ghé thăm */}
                                  <td style={{ textAlign: 'center' }}>
                                    {nodeVisitedPct.toFixed(1)}%
                                  </td>

                                  {/* Strike Rate */}
                                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                    {nodeStrikeRate.toFixed(1)}%
                                  </td>

                                  {/* VPO */}
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {formatCurrency(nodeVpo)}
                                  </td>

                                  {/* SKU/Đơn */}
                                  <td style={{ textAlign: 'center' }}>
                                    {nodeSkuOrder.toFixed(1)}
                                  </td>

                                  {/* Dropsize */}
                                  <td style={{ textAlign: 'right' }}>
                                    {formatCurrency(nodeDropsize)}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Total Row */}
                            <tr style={{ height: '8px', backgroundColor: '#f3f2f1' }}>
                              <td colSpan={11} style={{ padding: 0, border: 'none' }}></td>
                            </tr>
                            <tr className="pbi-table-total" style={{ borderTop: '2px solid #1e293b' }}>
                              <td style={{ fontSize: '0.85rem', fontWeight: 800, padding: '10px 12px' }}>
                                ⭐ TỔNG CỘNG HỆ THỐNG
                              </td>
                              <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                {formatCurrency(totalSalesVol)}
                              </td>
                              
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                                    {totalSellinTgt > 0 ? `${overallSellinPct.toFixed(1)}%` : '-'}
                                  </span>
                                  {totalSellinTgt > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>
                                      {formatCurrency(totalSellinAct)} / {formatCurrency(totalSellinTgt)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                                    {totalSelloutTgt > 0 ? `${overallSelloutPct.toFixed(1)}%` : '-'}
                                  </span>
                                  {totalSelloutTgt > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>
                                      {formatCurrency(totalSelloutAct)} / {formatCurrency(totalSelloutTgt)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {totalMcpCount}
                              </td>

                              <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {overallAso.toLocaleString('vi-VN')}
                              </td>

                              <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {overallVisitedPct.toFixed(1)}%
                              </td>

                              <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {overallStrikeRate.toFixed(1)}%
                              </td>

                              <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                {formatCurrency(overallVpo)}
                              </td>

                              <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {overallSkuOrder.toFixed(1)}
                              </td>

                              <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                {formatCurrency(overallDropsize)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : (
              <>
                {/* 1. HOT NUMBERS ROW */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="pbi-card pbi-card-accent-blue">
                    <div className="pbi-card-title">Doanh số Sell-out</div>
                    <div className="pbi-card-value">{formatCurrency(totalSales)}</div>
                    <div className="pbi-card-sub">Tổng thực hiện: {totalOutlets.toLocaleString('vi-VN')} / {totalMcp.toLocaleString('vi-VN')} MCP ({totalMcp > 0 ? ((totalOutlets / totalMcp) * 100).toFixed(1) : 0}% active)</div>
                  </div>

                  <div className="pbi-card pbi-card-accent-orange">
                    <div className="pbi-card-title">ASO (Khách mua hàng)</div>
                    <div className="pbi-card-value">{totalOutlets.toLocaleString('vi-VN')}</div>
                    <div className="pbi-card-sub">Số lượng khách hàng có mua hàng thực tế</div>
                  </div>

                  <div className="pbi-card pbi-card-accent-red">
                    <div className="pbi-card-title">VPO (Doanh số/KH)</div>
                    <div className="pbi-card-value">{formatCurrency(totalOutlets > 0 ? totalSales / totalOutlets : 0)}</div>
                    <div className="pbi-card-sub">Doanh số Sell-out trung bình của 1 khách hàng</div>
                  </div>

                  <div className="pbi-card" style={{ borderTop: '4px solid #0d9488' }}>
                    <div className="pbi-card-title">Dropsize & SKU/Order</div>
                    <div className="pbi-card-value" style={{ fontSize: '1.4rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{formatCurrency(avgDropsize)}</span>
                      <span style={{ fontSize: '0.85rem', color: '#0d9488', fontWeight: 800, padding: '2px 8px', background: 'rgba(13, 148, 136, 0.08)', borderRadius: '4px' }}>
                        {avgSkuOrder.toFixed(1)} SKU/đơn
                      </span>
                    </div>
                    <div className="pbi-card-sub">Tỷ lệ ghé thăm: {totalMcp > 0 ? ((totalVisits / totalMcp) * 100).toFixed(1) : 0}% | Strike Rate: {totalMcp > 0 ? ((totalOutlets / totalMcp) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>

                {/* 2. LEVEL 1: VISUAL COMPARISONS (Region & Categories) */}
                <div className="pbi-layout-grid-2" style={{ gap: '1.25rem' }}>

                  {/* Region Contribution: Donut + Bar side by side */}
                  <div className="pbi-card">
                    <div className="pbi-slicer-title" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📊 ĐÓNG GÓP THEO MIỀN (Contribution by Region)</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Tổng: {formatCurrency(totalSales)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Donut */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg width="160" height="160" viewBox="0 0 160 160">
                          {(() => {
                            if (regionsData.length === 0) return <text x="80" y="85" textAnchor="middle" fill="#aaa" fontSize="11">No data</text>;
                            const colors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6'];
                            const total = regionsData.reduce((s, r) => s + r.sales, 0) || 1;
                            let cum = 0;
                            return regionsData.map((reg, i) => {
                              const pct = (reg.sales / total) * 100;
                              if (pct <= 0) return null;
                              const [sA, eA] = [cum * 3.6 - 90, (cum + pct) * 3.6 - 90];
                              cum += pct;
                              const x1 = 80 + 60 * Math.cos((sA * Math.PI) / 180);
                              const y1 = 80 + 60 * Math.sin((sA * Math.PI) / 180);
                              const x2 = 80 + 60 * Math.cos((eA * Math.PI) / 180);
                              const y2 = 80 + 60 * Math.sin((eA * Math.PI) / 180);
                              const large = pct > 50 ? 1 : 0;
                              const sx3 = 80 + 30 * Math.cos((sA * Math.PI) / 180);
                              const sy3 = 80 + 30 * Math.sin((sA * Math.PI) / 180);
                              const sx4 = 80 + 30 * Math.cos((eA * Math.PI) / 180);
                              const sy4 = 80 + 30 * Math.sin((eA * Math.PI) / 180);
                              return (
                                <path key={reg.region}
                                  d={`M ${x1} ${y1} A 60 60 0 ${large} 1 ${x2} ${y2} L ${sx4} ${sy4} A 30 30 0 ${large} 0 ${sx3} ${sy3} Z`}
                                  fill={colors[i % colors.length]}
                                  stroke="#fff" strokeWidth="2"
                                >
                                  <title>{reg.region}: {formatCurrency(reg.sales)} ({pct.toFixed(1)}%)</title>
                                </path>
                              );
                            });
                          })()}
                          <text x="80" y="75" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="600">Tổng DS</text>
                          <text x="80" y="92" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="800">
                            {formatCurrency(totalSales)}
                          </text>
                        </svg>
                      </div>
                      {/* Legend + bars */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '180px' }}>
                        {regionsData.map((reg, i) => {
                          const colors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6'];
                          const color = colors[i % colors.length];
                          const total = regionsData.reduce((s, r) => s + r.sales, 0) || 1;
                          const pct = (reg.sales / total) * 100;
                          return (
                            <div key={reg.region} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }}></div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reg.region}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(reg.sales)}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', minWidth: '36px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                              </div>
                              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginLeft: '16px' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top GSBH Performance */}
                  <div className="pbi-card">
                    <div className="pbi-slicer-title" style={{ marginBottom: '0.75rem' }}>
                      🏆 TOP GSBH THEO DOANH SỐ (Top Supervisors)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(() => {
                        const supData = sfData.repsData.reduce((acc: Record<string, any>, r) => {
                          const key = r.sup_name || 'Unknown';
                          if (!acc[key]) acc[key] = { name: key, sales: 0, mcp_count: 0, outlets: 0, reps: 0 };
                          acc[key].sales += r.sales || 0;
                          acc[key].mcp_count += r.mcp_count || 0;
                          acc[key].outlets += r.buying_outlets || 0;
                          acc[key].reps += 1;
                          return acc;
                        }, {});
                        const topSups = Object.values(supData)
                          .sort((a: any, b: any) => b.sales - a.sales)
                          .slice(0, 6);
                        const maxSales = topSups[0]?.sales || 1;
                        const colors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
                        return topSups.map((sup: any, i: number) => {
                          const pct = (sup.sales / maxSales) * 100;
                          const color = colors[i % colors.length];
                          return (
                            <div key={sup.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', minWidth: '18px', textAlign: 'center' }}>
                                {i + 1}
                              </span>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{sup.name}</span>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{formatCurrency(sup.sales)}</span>
                                </div>
                                <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }}></div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.6rem', color: '#94a3b8' }}>
                                  <span>👥 {sup.reps} NVBH</span>
                                  <span>🏪 {sup.outlets.toLocaleString('vi-VN')} ASO</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. MONTHLY TREND SECTION */}
                <div className="pbi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="pbi-slicer-title">
                      📈 BIỂU ĐỒ XU HƯỚNG THEO THÁNG (Monthly Trend by Region)
                    </div>
                    {/* Metric toggle */}
                    <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                      {([
                        { key: 'sellin', label: 'Sell-in', color: 'var(--cj-blue)' },
                        { key: 'sellout', label: 'Sell-out', color: 'var(--cj-orange)' },
                        { key: 'aso', label: 'ASO', color: 'var(--cj-red)' },
                        { key: 'mcp', label: 'MCP', color: '#10b981' },
                      ] as const).map(m => (
                        <button
                          key={m.key}
                          onClick={() => setSfTrendMetric(m.key)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            background: sfTrendMetric === m.key ? m.color : 'transparent',
                            color: sfTrendMetric === m.key ? '#fff' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {/* Region filter */}
                    <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                      <button
                        onClick={() => setSfTrendRegion('')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: 'none',
                          background: sfTrendRegion === '' ? 'var(--cj-blue)' : 'transparent',
                          color: sfTrendRegion === '' ? '#fff' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        Tất cả
                      </button>
                      {regionsSet.map(r => (
                        <button
                          key={r}
                          onClick={() => setSfTrendRegion(r)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            background: sfTrendRegion === r ? '#3b82f6' : 'transparent',
                            color: sfTrendRegion === r ? '#fff' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const months = sfTrend?.months || [1, 2, 3, 4, 5];
                    const monthLabels = months.map((m: number) => `T${m}`);
                    const apiRegions = Array.isArray(sfTrend?.regions) && sfTrend.regions.length > 0
                      ? sfTrend.regions : regionsSet;
                    const regionsForTrend = sfTrendRegion ? [sfTrendRegion] : apiRegions;

                    const sellinByMonth = sfTrend?.sellin || {};
                    const selloutByMonth = sfTrend?.sellout || {};
                    const mcpByMonth = sfTrend?.mcp || {};
                    const asoByMonth = sfTrend?.aso || {};
                    const targets = sfTrend?.targets || {};

                    const targetsByMetric = {
                      sellin: targets.sellin || {},
                      sellout: targets.sellout || {},
                      mcp: targets.mcp || {},
                      aso: targets.aso || {},
                    };

                    const metric = sfTrendMetric;
                    const regionColors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6'];

                    const isRevenue = metric === 'sellin' || metric === 'sellout';

                    const formatVal = (val: number) => {
                      if (isRevenue) {
                        if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
                        if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                        return `${val.toLocaleString('vi-VN')}`;
                      }
                      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                      return Math.round(val).toString();
                    };

                    const getBarVal = (metricKey: string, region: string, month: number) => {
                      if (metricKey === 'sellin') return sellinByMonth[region]?.[month] || 0;
                      if (metricKey === 'sellout') return selloutByMonth[region]?.[month] || 0;
                      if (metricKey === 'mcp') return mcpByMonth[region]?.[month] || 0;
                      if (metricKey === 'aso') return asoByMonth[region]?.[month] || 0;
                      return 0;
                    };

                    const getTarget = (metricKey: keyof typeof targetsByMetric, region: string, month: number) => {
                      return targetsByMetric[metricKey]?.[region]?.[month] || 0;
                    };

                    const getPct = (actual: number, target: number) => {
                      if (!target || target === 0) return null;
                      return Math.min(200, (actual / target) * 100);
                    };

                    let maxVal = 0;
                    regionsForTrend.forEach((r: string) => {
                      months.forEach((m: number) => {
                        const val = getBarVal(metric, r, m);
                        const tgt = getTarget(metric, r, m);
                        if (val > maxVal) maxVal = val;
                        if (tgt > maxVal) maxVal = tgt;
                      });
                    });
                    if (maxVal === 0) maxVal = 1;

                    const CHART_H = 220;
                    const CHART_W = 900;
                    const PAD_L = 60, PAD_R = 20, PAD_T = 20, PAD_B = 50;
                    const innerW = CHART_W - PAD_L - PAD_R;
                    const innerH = CHART_H - PAD_T - PAD_B;
                    const groupW = innerW / months.length;

                    const gridLines = Array.from({ length: 5 }, (_, i) => i);
                    const yLabels = gridLines.map(i => {
                      const val = (maxVal * (5 - i)) / 5;
                      return { y: PAD_T + (innerH * i) / 5, label: formatVal(val) };
                    });

                    return (
                      <div style={{ overflowX: 'auto' }}>
                        {/* KPI summary row */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          {regionsForTrend.map((r: string, ri: number) => {
                            const totalActual = months.reduce((s: number, m: number) => s + getBarVal(metric, r, m), 0);
                            const totalTarget = months.reduce((s: number, m: number) => s + getTarget(metric, r, m), 0);
                            const pct = getPct(totalActual, totalTarget);
                            const color = regionColors[ri % regionColors.length];
                            return (
                              <div key={r} style={{
                                background: `${color}18`, border: `1.5px solid ${color}40`,
                                borderRadius: '8px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
                              }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{r}:</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{formatVal(totalActual)}</span>
                                {pct !== null && (
                                  <span style={{
                                    fontSize: '0.72rem', fontWeight: 700,
                                    color: pct >= 100 ? '#166534' : pct >= 80 ? '#92400e' : '#dc2626',
                                    background: pct >= 100 ? '#dcfce7' : pct >= 80 ? '#fef3c7' : '#fee2e2',
                                    padding: '1px 6px', borderRadius: '4px'
                                  }}>
                                    {pct.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <svg width={CHART_W} height={CHART_H} style={{ display: 'block', fontFamily: 'inherit' }}>
                          {/* Gridlines */}
                          {gridLines.map(i => (
                            <line key={i}
                              x1={PAD_L} y1={PAD_T + (innerH * i) / 5}
                              x2={CHART_W - PAD_R} y2={PAD_T + (innerH * i) / 5}
                              stroke="#e2e8f0" strokeWidth="1"
                            />
                          ))}

                          {/* Bars + target line + pct label per month per region */}
                          {months.map((m: number, mi: number) => {
                            const filteredRegs = regionsForTrend;
                            const barW = Math.min(22, (groupW - 20) / filteredRegs.length);
                            const totalBarW = barW * filteredRegs.length;
                            const startX = PAD_L + mi * groupW + (groupW - totalBarW) / 2;
                            const groupCenterX = PAD_L + mi * groupW + groupW / 2;

                            return (
                              <g key={m}>
                                {filteredRegs.map((r: string, ri: number) => {
                                  const barVal = getBarVal(metric, r, m);
                                  const target = getTarget(metric, r, m);
                                  const pct = getPct(barVal, target);
                                  const barH = (barVal / maxVal) * innerH;
                                  const targetLineY = target > 0 ? PAD_T + innerH - (target / maxVal) * innerH : 0;
                                  const bx = startX + ri * barW;
                                  const by = PAD_T + innerH - barH;
                                  const color = regionColors[ri % regionColors.length];

                                  return (
                                    <g key={r}>
                                      {/* Target dashed line */}
                                      {target > 0 && (
                                        <line
                                          x1={bx} y1={targetLineY}
                                          x2={bx + barW - 2} y2={targetLineY}
                                          stroke={color} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"
                                        />
                                      )}
                                      {/* Bar */}
                                      <rect x={bx} y={by} width={barW - 2} height={barH} fill={color} rx="2" opacity="0.9">
                                        <title>{r} T{m}: {formatVal(barVal)}{target > 0 ? ` / ${formatVal(target)}` : ''}{pct !== null ? ` (${pct.toFixed(0)}%)` : ''}</title>
                                      </rect>
                                      {/* Value label */}
                                      {barH > 14 && (
                                        <text x={bx + (barW - 2) / 2} y={by + 10} textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700">
                                          {formatVal(barVal)}
                                        </text>
                                      )}
                                      {/* % completion badge */}
                                      {pct !== null && barH > 8 && (
                                        <text x={bx + (barW - 2) / 2} y={by - 2} textAnchor="middle" fill={pct >= 100 ? '#166534' : '#dc2626'} fontSize="6.5" fontWeight="800">
                                          {pct.toFixed(0)}%
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}
                                {/* Month label */}
                                <text x={groupCenterX} y={CHART_H - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">
                                  {monthLabels[mi]}
                                </text>
                              </g>
                            );
                          })}

                          {/* ===== ACHIEVEMENT % LINE OVERLAY ===== */}
                          {(() => {
                            // Calculate max % for scaling the right Y-axis
                            const pctMax = 200; // Fixed scale: 0-200%
                            const pctLineColors = ['#1d4ed8', '#ea580c', '#059669', '#7c3aed']; // darker versions

                            return regionsForTrend.map((r: string, ri: number) => {
                              const points: { x: number; y: number; pct: number; month: number }[] = [];
                              
                              months.forEach((m: number, mi: number) => {
                                const actual = getBarVal(metric, r, m);
                                const target = getTarget(metric, r, m);
                                if (target > 0) {
                                  const pctVal = Math.min(pctMax, (actual / target) * 100);
                                  const cx = PAD_L + mi * groupW + groupW / 2;
                                  const cy = PAD_T + innerH - (pctVal / pctMax) * innerH;
                                  points.push({ x: cx, y: cy, pct: pctVal, month: m });
                                }
                              });

                              if (points.length < 1) return null;

                              const lineColor = pctLineColors[ri % pctLineColors.length];
                              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                              return (
                                <g key={`pct-line-${r}`}>
                                  {/* Line path */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={lineColor}
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    opacity="0.85"
                                  />
                                  {/* Data points + labels */}
                                  {points.map((p, pi) => (
                                    <g key={pi}>
                                      {/* Outer circle (white border) */}
                                      <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={lineColor} strokeWidth="2" />
                                      {/* Inner circle */}
                                      <circle cx={p.x} cy={p.y} r="2.5" fill={lineColor} />
                                      {/* % label above dot */}
                                      <text
                                        x={p.x} y={p.y - 8}
                                        textAnchor="middle" fill={lineColor}
                                        fontSize="8" fontWeight="800"
                                        style={{ textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white' } as React.CSSProperties}
                                      >
                                        {p.pct.toFixed(0)}%
                                      </text>
                                      <title>{r} T{p.month}: {p.pct.toFixed(1)}% đạt</title>
                                    </g>
                                  ))}
                                </g>
                              );
                            });
                          })()}

                          {/* 100% reference line */}
                          {(() => {
                            const pctMax = 200;
                            const y100 = PAD_T + innerH - (100 / pctMax) * innerH;
                            return (
                              <line
                                x1={PAD_L} y1={y100}
                                x2={CHART_W - PAD_R} y2={y100}
                                stroke="#dc2626" strokeWidth="1" strokeDasharray="6,3" opacity="0.4"
                              />
                            );
                          })()}

                          {/* Right Y-axis labels (% scale) */}
                          {[0, 50, 100, 150, 200].map(pctVal => {
                            const pctMax = 200;
                            const y = PAD_T + innerH - (pctVal / pctMax) * innerH;
                            return (
                              <text key={pctVal} x={CHART_W - PAD_R + 6} y={y + 3} textAnchor="start" fill="#94a3b8" fontSize="8" fontWeight="600">
                                {pctVal}%
                              </text>
                            );
                          })}

                          {/* Y-axis labels (left - value) */}
                          {yLabels.map((yl, i) => (
                            <text key={i} x={PAD_L - 6} y={yl.y + 4} textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="600">
                              {yl.label}
                            </text>
                          ))}

                          {/* Legend - regions */}
                          {regionsForTrend.map((r: string, i: number) => (
                            <g key={r} transform={`translate(${PAD_L + i * 120}, ${PAD_T - 14})`}>
                              <rect x={0} y={0} width={10} height={10} fill={regionColors[i % regionColors.length]} rx="2" />
                              <text x={14} y={9} fill="#475569" fontSize="9" fontWeight="700">{r}</text>
                            </g>
                          ))}
                          {/* Legend - achievement line */}
                          <g transform={`translate(${PAD_L + regionsForTrend.length * 120}, ${PAD_T - 14})`}>
                            <line x1={0} y1={5} x2={18} y2={5} stroke="#1d4ed8" strokeWidth="2.5" />
                            <circle cx={9} cy={5} r="3" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
                            <text x={22} y={9} fill="#475569" fontSize="9" fontWeight="700">% Đạt</text>
                          </g>
                          {/* Legend - target dashed */}
                          <g transform={`translate(${PAD_L + regionsForTrend.length * 120 + 70}, ${PAD_T - 14})`}>
                            <line x1={0} y1={5} x2={14} y2={5} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" />
                            <text x={18} y={9} fill="#94a3b8" fontSize="9" fontWeight="600">Target</text>
                          </g>
                          {/* Legend - 100% reference */}
                          <g transform={`translate(${PAD_L + regionsForTrend.length * 120 + 140}, ${PAD_T - 14})`}>
                            <line x1={0} y1={5} x2={14} y2={5} stroke="#dc2626" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
                            <text x={18} y={9} fill="#dc2626" fontSize="9" fontWeight="600" opacity="0.7">100%</text>
                          </g>
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. LEVEL 2: AREA / PROVINCE COMPARISON TABLE */}
                <div className="pbi-card">
                  <div className="pbi-slicer-title pbi-slicer-title-red" style={{ marginBottom: '1rem' }}>
                    CẤP 2: CHI TIẾT HIỆU SUẤT THEO VÙNG / TỈNH (AREA BREAKDOWN)
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="pbi-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: '120px' }}>Khu vực / Tỉnh</th>
                          <th>Miền</th>
                          <th style={{ textAlign: 'right' }}>Doanh số</th>
                          <th style={{ textAlign: 'center' }}>% Đạt Sell-in</th>
                          <th style={{ textAlign: 'center' }}>% Đạt Sell-out</th>
                          <th style={{ textAlign: 'center' }}>Khách MCP</th>
                          <th style={{ textAlign: 'center' }}>ASO (Khách mua)</th>
                          <th style={{ textAlign: 'center' }}>% Ghé thăm</th>
                          <th style={{ textAlign: 'center' }}>Strike Rate</th>
                          <th style={{ textAlign: 'right' }}>VPO</th>
                          <th style={{ textAlign: 'center' }}>SKU/Đơn</th>
                          <th style={{ textAlign: 'right' }}>Dropsize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {areasData.map((ar, idx) => {
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 800, color: 'var(--cj-blue)' }}>{ar.area}</td>
                              <td>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    backgroundColor: ar.region.toUpperCase().includes('BẮC') ? 'var(--cj-blue-light)' : 'var(--cj-orange-light)',
                                    color: ar.region.toUpperCase().includes('BẮC') ? 'var(--cj-blue)' : 'var(--cj-orange)',
                                    fontWeight: 700 
                                  }}
                                >
                                  {ar.region}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(ar.sales)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                {ar.sellin_target > 0 ? `${ar.sellin_pct.toFixed(1)}%` : '-'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: ar.sellout_pct >= 100 ? '#166534' : 'inherit' }}>
                                {ar.sellout_target > 0 ? `${ar.sellout_pct.toFixed(1)}%` : '-'}
                              </td>
                              <td style={{ textAlign: 'center' }}>{ar.mcp_count.toLocaleString('vi-VN')}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{ar.aso.toLocaleString('vi-VN')}</td>
                              <td style={{ textAlign: 'center' }}>{(ar.mcp_count > 0 ? (ar.total_visits / ar.mcp_count * 100) : 0).toFixed(1)}%</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{(ar.mcp_count > 0 ? (ar.buying_outlets / ar.mcp_count * 100) : 0).toFixed(1)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(ar.vpo)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{ar.sku_order.toFixed(1)}</td>
                              <td style={{ textAlign: 'right' }}>{formatCurrency(ar.dropsize)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. LEVEL 3: DETAILED SUPERVISOR & SALES REPRESENTATIVE */}
                <div className="pbi-card">
                  <div 
                    className="pbi-slicer-title" 
                    style={{ 
                      marginBottom: '1rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <span>CẤP 3: CÂY PHÂN CẤP GIÁM SÁT (GSBH) & NHÂN VIÊN THỊ TRƯỜNG (NVBH)</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#605e5c' }}>🔍 Tìm kiếm:</span>
                      <input 
                        type="text" 
                        value={sfRepSearch} 
                        onChange={e => setSfRepSearch(e.target.value)} 
                        placeholder="Tìm theo NVBH, GSBH, NPP..."
                        style={{
                          padding: '5px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                          outline: 'none',
                          minWidth: '220px',
                          fontWeight: 'normal'
                        }}
                      />
                      {sfRepSearch && (
                        <button 
                          className="btn btn-outline" 
                          onClick={() => setSfRepSearch('')}
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="pbi-table" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, boxShadow: '0 1px 0 var(--border-color)' }}>
                          <th style={{ width: '30px' }}></th>
                          <th style={{ minWidth: '180px' }}>Nhân sự / GSBH / NPP</th>
                          <th style={{ textAlign: 'right' }}>Doanh số</th>
                          <th style={{ textAlign: 'center' }}>% Đạt Sell-in</th>
                          <th style={{ textAlign: 'center' }}>% Đạt Sell-out</th>
                          <th style={{ textAlign: 'center' }}>Khách MCP</th>
                          <th style={{ textAlign: 'center' }}>ASO (Khách mua)</th>
                          <th style={{ textAlign: 'center' }}>% Ghé thăm</th>
                          <th style={{ textAlign: 'center' }}>Strike Rate</th>
                          <th style={{ textAlign: 'right' }}>VPO</th>
                          <th style={{ textAlign: 'center' }}>SKU/Đơn</th>
                          <th style={{ textAlign: 'right' }}>Dropsize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supsList.map((sup) => {
                          const expanded = isSupExpanded(sup.name);
                          return (
                            <React.Fragment key={sup.name}>
                              {/* GSBH Header Row */}
                              <tr 
                                style={{ 
                                  backgroundColor: '#f8fafc', 
                                  borderBottom: '2px solid #e2e8f0', 
                                  cursor: 'pointer',
                                  fontWeight: 800 
                                }}
                                onClick={() => toggleSup(sup.name)}
                              >
                                <td style={{ textAlign: 'center', color: 'var(--cj-blue)', fontSize: '0.9rem' }}>
                                  {expanded ? '▼' : '▶'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: 'var(--cj-blue)' }}>{sup.name} (GSBH)</span>
                                    <span style={{ fontSize: '0.72rem', color: '#605e5c', fontWeight: 'normal' }}>
                                      Vùng: {sup.area} | ASM: {sup.asm} ({sup.reps.length} NVBH)
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--cj-blue)' }}>{formatCurrency(sup.sales)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {sup.sellin_target > 0 ? `${sup.sellin_pct.toFixed(1)}%` : '-'}
                                </td>
                                <td style={{ textAlign: 'center', color: sup.sellout_pct >= 100 ? '#166534' : 'inherit' }}>
                                  {sup.sellout_target > 0 ? `${sup.sellout_pct.toFixed(1)}%` : '-'}
                                </td>
                                <td style={{ textAlign: 'center' }}>{sup.mcp_count.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{sup.aso.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{sup.visited_pct.toFixed(1)}%</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{sup.strike_rate.toFixed(1)}%</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(sup.vpo)}</td>
                                <td style={{ textAlign: 'center' }}>{sup.sku_order.toFixed(1)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(sup.dropsize)}</td>
                              </tr>

                              {/* Rep Rows under this GSBH */}
                              {expanded && sup.reps.map((rep: any) => {
                                const repSellinPct = rep.sellin_target > 0 ? (rep.sellin_actual / rep.sellin_target) * 100 : 0;
                                const repSelloutPct = rep.sellout_target > 0 ? (rep.sellout_actual / rep.sellout_target) * 100 : 0;
                                const repAso = rep.buying_outlets > 0 ? rep.sales / rep.buying_outlets : 0;
                                const repVpo = rep.total_visits > 0 ? (rep.transactions / rep.total_visits) * 100 : 0;
                                const repDropsize = rep.transactions > 0 ? rep.sales / rep.transactions : 0;
                                const repSkuOrder = rep.transactions > 0 ? rep.sku_sum / rep.transactions : 0;
                                const repVisitedPct = rep.mcp_count > 0 ? (rep.total_visits / rep.mcp_count) * 100 : 0;
                                const repStrikeRate = rep.mcp_count > 0 ? (rep.buying_outlets / rep.mcp_count) * 100 : 0;

                                return (
                                  <tr 
                                    key={rep.staff_id} 
                                    style={{ 
                                      borderBottom: '1px solid #f1f5f9',
                                      transition: 'background-color 0.15s ease'
                                    }}
                                    className="table-row-hover"
                                  >
                                    <td></td>
                                    <td style={{ paddingLeft: '1.5rem' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                          {rep.staff_name} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({rep.staff_id})</span>
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.distributor}>
                                          NPP: {rep.distributor}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(rep.sales)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      {rep.sellin_target > 0 ? `${repSellinPct.toFixed(1)}%` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center', color: repSelloutPct >= 100 ? '#166534' : 'inherit', fontWeight: 600 }}>
                                      {rep.sellout_target > 0 ? `${repSelloutPct.toFixed(1)}%` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{rep.mcp_count}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{repAso}</td>
                                    <td style={{ textAlign: 'center' }}>{repVisitedPct.toFixed(1)}%</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{repStrikeRate.toFixed(1)}%</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(repVpo)}</td>
                                    <td style={{ textAlign: 'center' }}>{repSkuOrder.toFixed(1)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(repDropsize)}</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>
        );
      })()}      {/* 3. BIZ REVIEW */}
      {activeReportTab === 'biz' && (() => {
        const raw = bizData?.rawData || [];

        // Cascading Area List: filter raw by reportRegion
        const areasList = Array.from(new Set(
          raw
            .filter(item => !reportRegion || item.region.toUpperCase() === reportRegion.toUpperCase())
            .map(item => item.area)
        )).filter(Boolean).sort();

        // Cascading NPP List: filter raw by reportRegion and reportArea
        const nppsMap = new Map<string, string>(); // ma_npp -> ten_npp
        raw
          .filter(item => {
            const matchReg = !reportRegion || item.region.toUpperCase() === reportRegion.toUpperCase();
            const matchArea = !reportArea || item.area.toUpperCase() === reportArea.toUpperCase();
            return matchReg && matchArea;
          })
          .forEach(item => {
            if (item.ma_npp && item.ma_npp !== 'N/A') {
              nppsMap.set(item.ma_npp, item.ten_npp || item.ma_npp);
            }
          });
        const nppsList = Array.from(nppsMap.entries())
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const handleRegionChangeLocal = (reg: string) => {
          onRegionChange(reg);
          onAreaChange('');
          onNppChange('');
        };

        const handleAreaChangeLocal = (ar: string) => {
          onAreaChange(ar);
          onNppChange('');
        };

        // Aggregates raw items into hierarchical nodes
        const buildBizTree = (): BizTreeNode[] => {
          const currentMonth = reportMonth || 5;

          const regionsMapCorrected: Record<string, {
            name: string;
            ytdSellin25: number;
            ytdSellin26: number;
            ytdSellout25: number;
            ytdSellout26: number;
            mtdSellin25: number;
            mtdSellin26: number;
            mtdSellout25: number;
            mtdSellout26: number;
            areas: Record<string, {
              name: string;
              ytdSellin25: number;
              ytdSellin26: number;
              ytdSellout25: number;
              ytdSellout26: number;
              mtdSellin25: number;
              mtdSellin26: number;
              mtdSellout25: number;
              mtdSellout26: number;
              npps: Record<string, {
                ma_npp: string;
                ten_npp: string;
                ytdSellin25: number;
                ytdSellin26: number;
                ytdSellout25: number;
                ytdSellout26: number;
                mtdSellin25: number;
                mtdSellin26: number;
                mtdSellout25: number;
                mtdSellout26: number;
              }>;
            }>;
          }> = {};

          raw.forEach(item => {
            const matchReg = !reportRegion || item.region.toUpperCase() === reportRegion.toUpperCase();
            const matchArea = !reportArea || item.area.toUpperCase() === reportArea.toUpperCase();
            const matchNpp = !reportNpp || item.ma_npp === reportNpp;
            const matchType = !selectedType || item.type.toLowerCase() === selectedType.toLowerCase();
            if (!matchReg || !matchArea || !matchNpp || !matchType) return;

            const regKey = item.region || 'N/A';
            const areaKey = item.area || 'N/A';
            const nppKey = item.ma_npp || 'N/A';

            if (!regionsMapCorrected[regKey]) {
              regionsMapCorrected[regKey] = {
                name: regKey,
                ytdSellin25: 0, ytdSellin26: 0, ytdSellout25: 0, ytdSellout26: 0,
                mtdSellin25: 0, mtdSellin26: 0, mtdSellout25: 0, mtdSellout26: 0,
                areas: {}
              };
            }
            const reg = regionsMapCorrected[regKey];

            if (!reg.areas[areaKey]) {
              reg.areas[areaKey] = {
                name: areaKey,
                ytdSellin25: 0, ytdSellin26: 0, ytdSellout25: 0, ytdSellout26: 0,
                mtdSellin25: 0, mtdSellin26: 0, mtdSellout25: 0, mtdSellout26: 0,
                npps: {}
              };
            }
            const areaNode = reg.areas[areaKey];

            if (!areaNode.npps[nppKey]) {
              areaNode.npps[nppKey] = {
                ma_npp: nppKey,
                ten_npp: item.ten_npp || 'N/A',
                ytdSellin25: 0, ytdSellin26: 0, ytdSellout25: 0, ytdSellout26: 0,
                mtdSellin25: 0, mtdSellin26: 0, mtdSellout25: 0, mtdSellout26: 0
              };
            }
            const nppNode = areaNode.npps[nppKey];

            const is2025 = item.year === 2025;
            const is2026 = item.year === 2026;
            const isYtd = item.month <= currentMonth;
            const isMtd = item.month === currentMonth;

            const sales = item.sales || 0;
            const isSellin = item.type.toLowerCase() === 'sellin';
            const isSellout = item.type.toLowerCase() === 'sellout';

            if (isYtd) {
              if (isSellin) {
                if (is2025) {
                  reg.ytdSellin25 += sales;
                  areaNode.ytdSellin25 += sales;
                  nppNode.ytdSellin25 += sales;
                } else if (is2026) {
                  reg.ytdSellin26 += sales;
                  areaNode.ytdSellin26 += sales;
                  nppNode.ytdSellin26 += sales;
                }
              } else if (isSellout) {
                if (is2025) {
                  reg.ytdSellout25 += sales;
                  areaNode.ytdSellout25 += sales;
                  nppNode.ytdSellout25 += sales;
                } else if (is2026) {
                  reg.ytdSellout26 += sales;
                  areaNode.ytdSellout26 += sales;
                  nppNode.ytdSellout26 += sales;
                }
              }
            }

            if (isMtd) {
              if (isSellin) {
                if (is2025) {
                  reg.mtdSellin25 += sales;
                  areaNode.mtdSellin25 += sales;
                  nppNode.mtdSellin25 += sales;
                } else if (is2026) {
                  reg.mtdSellin26 += sales;
                  areaNode.mtdSellin26 += sales;
                  nppNode.mtdSellin26 += sales;
                }
              } else if (isSellout) {
                if (is2025) {
                  reg.mtdSellout25 += sales;
                  areaNode.mtdSellout25 += sales;
                  nppNode.mtdSellout25 += sales;
                } else if (is2026) {
                  reg.mtdSellout26 += sales;
                  areaNode.mtdSellout26 += sales;
                  nppNode.mtdSellout26 += sales;
                }
              }
            }
          });

          return Object.keys(regionsMapCorrected).map(regKey => {
            const regData = regionsMapCorrected[regKey];
            const areasList: BizTreeNode[] = Object.keys(regData.areas).map(areaKey => {
              const areaData = regData.areas[areaKey];
              const nppsList: BizTreeNode[] = Object.keys(areaData.npps).map(nppKey => {
                const nppData = areaData.npps[nppKey];
                return {
                  id: `npp:${regKey}:${areaKey}:${nppKey}`,
                  name: `${nppData.ten_npp} (${nppData.ma_npp})`,
                  level: 'npp' as const,
                  region: regKey,
                  area: areaKey,
                  ma_npp: nppData.ma_npp,
                  ten_npp: nppData.ten_npp,
                  ytdSellin25: nppData.ytdSellin25,
                  ytdSellin26: nppData.ytdSellin26,
                  ytdSellout25: nppData.ytdSellout25,
                  ytdSellout26: nppData.ytdSellout26,
                  mtdSellin25: nppData.mtdSellin25,
                  mtdSellin26: nppData.mtdSellin26,
                  mtdSellout25: nppData.mtdSellout25,
                  mtdSellout26: nppData.mtdSellout26,
                  children: []
                };
              }).sort((a, b) => b.ytdSellout26 - a.ytdSellout26 || b.ytdSellin26 - a.ytdSellin26);

              return {
                id: `area:${regKey}:${areaKey}`,
                name: formatAreaName(areaKey),
                level: 'area' as const,
                region: regKey,
                area: areaKey,
                ytdSellin25: areaData.ytdSellin25,
                ytdSellin26: areaData.ytdSellin26,
                ytdSellout25: areaData.ytdSellout25,
                ytdSellout26: areaData.ytdSellout26,
                mtdSellin25: areaData.mtdSellin25,
                mtdSellin26: areaData.mtdSellin26,
                mtdSellout25: areaData.mtdSellout25,
                mtdSellout26: areaData.mtdSellout26,
                children: nppsList
              };
            }).sort((a, b) => b.ytdSellout26 - a.ytdSellout26 || b.ytdSellin26 - a.ytdSellin26);

            return {
              id: `region:${regKey}`,
              name: regKey,
              level: 'region' as const,
              region: regKey,
              area: '',
              ytdSellin25: regData.ytdSellin25,
              ytdSellin26: regData.ytdSellin26,
              ytdSellout25: regData.ytdSellout25,
              ytdSellout26: regData.ytdSellout26,
              mtdSellin25: regData.mtdSellin25,
              mtdSellin26: regData.mtdSellin26,
              mtdSellout25: regData.mtdSellout25,
              mtdSellout26: regData.mtdSellout26,
              children: areasList
            };
          }).sort((a, b) => b.ytdSellout26 - a.ytdSellout26 || b.ytdSellin26 - a.ytdSellin26);
        };

        const filterBizTree = (nodes: BizTreeNode[], query: string): BizTreeNode[] => {
          if (!query) return nodes;
          const lowerQuery = query.toLowerCase();
          
          return nodes
            .map(node => {
              const matchesSelf = 
                node.name.toLowerCase().includes(lowerQuery) || 
                (node.ma_npp && node.ma_npp.toLowerCase().includes(lowerQuery)) ||
                (node.ten_npp && node.ten_npp.toLowerCase().includes(lowerQuery)) ||
                node.region.toLowerCase().includes(lowerQuery) ||
                node.area.toLowerCase().includes(lowerQuery);
              
              if (node.children && node.children.length > 0) {
                const filteredChildren = filterBizTree(node.children, query);
                if (filteredChildren.length > 0 || matchesSelf) {
                  return {
                    ...node,
                    children: filteredChildren
                  };
                }
              }
              
              return matchesSelf ? node : null;
            })
            .filter((n): n is BizTreeNode => n !== null);
        };

        const chronologicalHistory = [...(bizData?.kpis?.history || [])].reverse();
        const asoPoints = chronologicalHistory.map(h => h.aso);
        const vpoPoints = chronologicalHistory.map(h => h.vpo);

        const renderSparkline = (points: number[], width = 100, height = 20, color = 'var(--cj-blue)') => {
          if (points.length < 2) return null;
          const max = Math.max(...points);
          const min = Math.min(...points);
          const range = max - min || 1;
          const padding = 2;
          const coordinates = points.map((p, idx) => {
            const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((p - min) / range) * (height - padding * 2) - padding;
            return `${x},${y}`;
          });
          return (
            <svg width={width} height={height} style={{ overflow: 'visible' }}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={coordinates.join(' ')}
              />
              {points.map((p, idx) => {
                const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
                const y = height - ((p - min) / range) * (height - padding * 2) - padding;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="2.5"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                );
              })}
            </svg>
          );
        };

        const headcount = bizData?.kpis?.staffHeadcount || { totalGsbh: 5, totalNvbh: 25 };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Interactive Slicers Slicing Panel */}
            <div className="pbi-slicer-panel" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              {/* Region Slicer */}
              {!isReadOnlyRegion ? (
                <div className="pbi-slicer">
                  <div className="pbi-slicer-title">Tên Miền (Region)</div>
                  <div className="pbi-slicer-items">
                    <div 
                      className={`pbi-slicer-item ${reportRegion === '' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('')}
                    >
                      Tất cả
                    </div>
                    <div 
                      className={`pbi-slicer-item ${reportRegion === 'MIỀN BẮC' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('MIỀN BẮC')}
                    >
                      Miền Bắc
                    </div>
                    <div 
                      className={`pbi-slicer-item ${reportRegion === 'MIỀN NAM' ? 'active' : ''}`}
                      onClick={() => handleRegionChangeLocal('MIỀN NAM')}
                    >
                      Miền Nam
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pbi-slicer" style={{ opacity: 0.85 }}>
                  <div className="pbi-slicer-title">Tên Miền (Bị Khóa)</div>
                  <div className="pbi-slicer-items">
                    <div className="pbi-slicer-item active" style={{ cursor: 'not-allowed' }}>
                      {reportRegion === 'MIỀN NAM' ? 'Miền Nam (HCM)' : 'Miền Bắc'}
                    </div>
                  </div>
                </div>
              )}

              {/* Area Slicer */}
              <div className="pbi-slicer">
                <div className="pbi-slicer-title pbi-slicer-title-orange">Khu vực / Tỉnh (Area)</div>
                <select
                  value={reportArea}
                  onChange={(e) => handleAreaChangeLocal(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '150px'
                  }}
                >
                  <option value="">Tất cả khu vực</option>
                  {areasList.map(a => (
                    <option key={a} value={a}>{formatAreaName(a)}</option>
                  ))}
                </select>
              </div>

              {/* NPP Slicer */}
              <div className="pbi-slicer">
                <div className="pbi-slicer-title pbi-slicer-title-red">Nhà phân phối (NPP)</div>
                <select
                  value={reportNpp}
                  onChange={(e) => onNppChange(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '180px',
                    maxWidth: '260px',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <option value="">Tất cả NPP</option>
                  {nppsList.map(n => (
                    <option key={n.code} value={n.code}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Month Slicer */}
              <div className="pbi-slicer">
                <div className="pbi-slicer-title pbi-slicer-title-orange">Tháng (Month)</div>
                <div className="pbi-slicer-items">
                  <div 
                    className={`pbi-slicer-item ${reportMonth === '' ? 'active-orange' : ''}`}
                    onClick={() => onMonthChange('')}
                  >
                    Tất cả
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <div 
                      key={m}
                      className={`pbi-slicer-item ${reportMonth === m ? 'active-orange' : ''}`}
                      onClick={() => onMonthChange(m)}
                    >
                      T{m < 10 ? '0' + m : m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Type Slicer */}
              <div className="pbi-slicer">
                <div className="pbi-slicer-title pbi-slicer-title-red">Kênh Giao dịch</div>
                <div className="pbi-slicer-items">
                  <div 
                    className={`pbi-slicer-item ${selectedType === '' ? 'active-red' : ''}`}
                    onClick={() => setSelectedType('')}
                  >
                    Tất cả
                  </div>
                  <div 
                    className={`pbi-slicer-item ${selectedType === 'Sellin' ? 'active-red' : ''}`}
                    onClick={() => setSelectedType('Sellin')}
                  >
                    Chỉ Sell-in
                  </div>
                  <div 
                    className={`pbi-slicer-item ${selectedType === 'Sellout' ? 'active-red' : ''}`}
                    onClick={() => setSelectedType('Sellout')}
                  >
                    Chỉ Sell-out
                  </div>
                </div>
              </div>

              {/* Clear Filter Button */}
              <div style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => {
                    handleRegionChangeLocal(isReadOnlyRegion ? (currentUser?.region || 'MIỀN NAM') : '');
                    onMonthChange('');
                    onYearChange(2026); // default to 2026
                    setSelectedType('');
                  }}
                >
                  Clear all filters
                </button>
              </div>
            </div>

            {/* Business Review Performance KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              
              {/* Card 1: YTD Sell-in */}
              <div className="pbi-card pbi-card-accent-blue" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>YTD Sell-in (Lũy kế)</span>
                  <span className={`pbi-growth-badge ${bizPivot.ytdSellinYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {bizPivot.ytdSellinYoY >= 0 ? '▲' : '▼'} {bizPivot.ytdSellinYoY >= 0 ? '+' : ''}{bizPivot.ytdSellinYoY.toFixed(1)}% YoY
                  </span>
                </div>
                <div className="pbi-card-value" style={{ color: 'var(--cj-blue)', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {formatCurrency(bizPivot.ytd.sellin2026)}
                </div>
                <div className="pbi-card-sub">
                  Năm trước (2025): {formatCurrency(bizPivot.ytd.sellin2025)}
                </div>
              </div>

              {/* Card 2: YTD Sell-out */}
              <div className="pbi-card pbi-card-accent-orange" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>YTD Sell-out (Lũy kế)</span>
                  <span className={`pbi-growth-badge ${bizPivot.ytdSelloutYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {bizPivot.ytdSelloutYoY >= 0 ? '▲' : '▼'} {bizPivot.ytdSelloutYoY >= 0 ? '+' : ''}{bizPivot.ytdSelloutYoY.toFixed(1)}% YoY
                  </span>
                </div>
                <div className="pbi-card-value" style={{ color: 'var(--cj-orange)', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {formatCurrency(bizPivot.ytd.sellout2026)}
                </div>
                <div className="pbi-card-sub">
                  Năm trước (2025): {formatCurrency(bizPivot.ytd.sellout2025)}
                </div>
              </div>

              {/* Card 3: MTD Sell-in */}
              <div className="pbi-card pbi-card-accent-blue" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>MTD Sell-in (Trong tháng)</span>
                  <span className={`pbi-growth-badge ${bizPivot.mtdSellinYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {bizPivot.mtdSellinYoY >= 0 ? '▲' : '▼'} {bizPivot.mtdSellinYoY >= 0 ? '+' : ''}{bizPivot.mtdSellinYoY.toFixed(1)}% YoY
                  </span>
                </div>
                <div className="pbi-card-value" style={{ color: 'var(--cj-blue)', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {formatCurrency(bizPivot.mtd.sellin2026)}
                </div>
                <div className="pbi-card-sub">
                  Năm trước (2025): {formatCurrency(bizPivot.mtd.sellin2025)}
                </div>
              </div>

              {/* Card 4: MTD Sell-out */}
              <div className="pbi-card pbi-card-accent-orange" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>MTD Sell-out (Trong tháng)</span>
                  <span className={`pbi-growth-badge ${bizPivot.mtdSelloutYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {bizPivot.mtdSelloutYoY >= 0 ? '▲' : '▼'} {bizPivot.mtdSelloutYoY >= 0 ? '+' : ''}{bizPivot.mtdSelloutYoY.toFixed(1)}% YoY
                  </span>
                </div>
                <div className="pbi-card-value" style={{ color: 'var(--cj-orange)', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {formatCurrency(bizPivot.mtd.sellout2026)}
                </div>
                <div className="pbi-card-sub">
                  Năm trước (2025): {formatCurrency(bizPivot.mtd.sellout2025)}
                </div>
              </div>

            </div>

            {/* Sparkline KPI Cards & Headcount */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              
              {/* Card ASO MTD with 3-Month Trend */}
              <div className="pbi-card pbi-card-accent-red" style={{ background: 'linear-gradient(135deg, #fff5f5, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cj-red)', fontWeight: 700 }}>Hiệu suất ASO MTD</span>
                  {asoPoints.length >= 2 && renderSparkline(asoPoints, 80, 18, 'var(--cj-red)')}
                </div>
                <div className="pbi-card-value" style={{ color: 'var(--cj-red)', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {bizData?.kpis ? parseInt(bizData.kpis.aso.toString(), 10).toLocaleString('vi-VN') : 'N/A'}
                </div>
                {chronologicalHistory.length > 0 ? (
                  <div style={{ fontSize: '0.7rem', color: '#605e5c', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    <strong>Trend:</strong>
                    {chronologicalHistory.map((h, idx) => (
                      <span key={idx}>
                        T{String(h.month).padStart(2, '0')}: {parseInt(h.aso.toString(), 10).toLocaleString('vi-VN')}
                        {idx < chronologicalHistory.length - 1 ? ' ➔ ' : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="pbi-card-sub">Số lượng điểm bán lẻ mua hàng thực tế</div>
                )}
              </div>

              {/* Card VPO MTD with 3-Month Trend */}
              <div className="pbi-card" style={{ borderLeft: '4px solid #2e7d32', background: 'linear-gradient(135deg, #f0fdf4, #ffffff)' }}>
                <div className="pbi-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#2e7d32', fontWeight: 700 }}>Chăm sóc VPO MTD</span>
                  {vpoPoints.length >= 2 && renderSparkline(vpoPoints, 80, 18, '#2e7d32')}
                </div>
                <div className="pbi-card-value" style={{ color: '#2e7d32', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {bizData?.kpis ? formatCurrency(bizData.kpis.vpo) : 'N/A'}
                </div>
                {chronologicalHistory.length > 0 ? (
                  <div style={{ fontSize: '0.7rem', color: '#605e5c', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    <strong>Trend:</strong>
                    {chronologicalHistory.map((h, idx) => (
                      <span key={idx}>
                        T{String(h.month).padStart(2, '0')}: {formatCurrency(h.vpo)}
                        {idx < chronologicalHistory.length - 1 ? ' ➔ ' : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="pbi-card-sub">Doanh số out bình quân trên mỗi điểm bán hàng</div>
                )}
              </div>

              {/* Card Active Headcount */}
              <div className="pbi-card" style={{ borderLeft: '4px solid #7b1fa2', background: 'linear-gradient(135deg, #fdf4ff, #ffffff)' }}>
                <div className="pbi-card-title" style={{ color: '#7b1fa2', fontWeight: 700 }}>Lực lượng hoạt động (Headcount)</div>
                <div className="pbi-card-value" style={{ color: '#7b1fa2', margin: '8px 0 4px 0', fontSize: '1.65rem' }}>
                  {headcount.totalNvbh} <span style={{ fontSize: '0.9rem', color: '#605e5c', fontWeight: 'normal' }}>NVBH (Rep)</span>
                </div>
                <div className="pbi-card-sub" style={{ fontWeight: 600, color: '#7b1fa2' }}>
                  Đội ngũ giám sát trực tiếp: {headcount.totalGsbh} GSBH
                </div>
              </div>

            </div>

            {/* Tree Grid Comparison */}
            <div className="pbi-card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1rem', 
                marginBottom: '1rem' 
              }}>
                <div className="pbi-slicer-title pbi-slicer-title-red" style={{ margin: 0 }}>
                  Bảng Phân Tích Chỉ Số Kinh Doanh Chi Tiết Theo Vùng & NPP
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Period Selector (YTD vs MTD) */}
                  <div style={{ display: 'inline-flex', background: '#f3f2f1', padding: '3px', borderRadius: '6px', border: '1px solid #e1dfdd' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: bizPeriodToggle === 'ytd' ? '#ffffff' : 'transparent',
                        color: bizPeriodToggle === 'ytd' ? 'var(--cj-blue)' : '#605e5c',
                        boxShadow: bizPeriodToggle === 'ytd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setBizPeriodToggle('ytd')}
                    >
                      Lũy kế YTD
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: bizPeriodToggle === 'mtd' ? '#ffffff' : 'transparent',
                        color: bizPeriodToggle === 'mtd' ? 'var(--cj-blue)' : '#605e5c',
                        boxShadow: bizPeriodToggle === 'mtd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setBizPeriodToggle('mtd')}
                    >
                      Trong tháng MTD
                    </button>
                  </div>

                  {/* Local Search input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Tìm nhanh vùng, NPP..."
                      value={bizSearchQuery}
                      onChange={(e) => setBizSearchQuery(e.target.value)}
                      style={{
                        padding: '6px 10px 6px 28px',
                        fontSize: '0.78rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        width: '200px',
                        outline: 'none'
                      }}
                    />
                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#a19f9d', fontSize: '0.8rem' }}>🔍</span>
                    {bizSearchQuery && (
                      <button 
                        type="button"
                        onClick={() => setBizSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'none',
                          color: '#a19f9d',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="pbi-table" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, boxShadow: '0 1px 0 var(--border-color)' }}>
                      <th style={{ minWidth: '220px' }}>Phân cấp (Miền ➔ Tỉnh ➔ NPP)</th>
                      
                      {/* Sell-in Columns */}
                      {(selectedType === '' || selectedType.toLowerCase() === 'sellin') && (
                        <>
                          <th style={{ textAlign: 'right', width: '130px' }}>Sell-in 2025 ({bizPeriodToggle.toUpperCase()})</th>
                          <th style={{ textAlign: 'right', width: '130px' }}>Sell-in 2026 ({bizPeriodToggle.toUpperCase()})</th>
                          <th style={{ textAlign: 'center', width: '100px' }}>YoY Sell-in</th>
                        </>
                      )}

                      {/* Sell-out Columns */}
                      {(selectedType === '' || selectedType.toLowerCase() === 'sellout') && (
                        <>
                          <th style={{ textAlign: 'right', width: '130px' }}>Sell-out 2025 ({bizPeriodToggle.toUpperCase()})</th>
                          <th style={{ textAlign: 'right', width: '130px' }}>Sell-out 2026 ({bizPeriodToggle.toUpperCase()})</th>
                          <th style={{ textAlign: 'center', width: '100px' }}>YoY Sell-out</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const fullTree = buildBizTree();
                      const filteredTree = filterBizTree(fullTree, bizSearchQuery);

                      // Helper to check if a node is expanded
                      const isNodeExpanded = (node: BizTreeNode) => {
                        if (bizSearchQuery) return true;
                        if (node.level === 'region') {
                          return expandedBizNodes[node.id] !== false; // default true
                        }
                        return !!expandedBizNodes[node.id]; // default false for area
                      };

                      // Flatten the visible tree nodes for rendering
                      const visibleRows: BizTreeNode[] = [];
                      const traverse = (node: BizTreeNode) => {
                        visibleRows.push(node);
                        if (isNodeExpanded(node) && node.children && node.children.length > 0) {
                          node.children.forEach(traverse);
                        }
                      };
                      filteredTree.forEach(traverse);

                      // Calculate Dynamic Grand Totals of Filtered Tree (sum only Region level nodes to prevent double counting)
                      let totalSellin25 = 0;
                      let totalSellin26 = 0;
                      let totalSellout25 = 0;
                      let totalSellout26 = 0;

                      filteredTree.forEach(node => {
                        totalSellin25 += bizPeriodToggle === 'ytd' ? node.ytdSellin25 : node.mtdSellin25;
                        totalSellin26 += bizPeriodToggle === 'ytd' ? node.ytdSellin26 : node.mtdSellin26;
                        totalSellout25 += bizPeriodToggle === 'ytd' ? node.ytdSellout25 : node.mtdSellout25;
                        totalSellout26 += bizPeriodToggle === 'ytd' ? node.ytdSellout26 : node.mtdSellout26;
                      });

                      const totalSellinYoY = totalSellin25 > 0 ? ((totalSellin26 - totalSellin25) / totalSellin25) * 100 : 0;
                      const totalSelloutYoY = totalSellout25 > 0 ? ((totalSellout26 - totalSellout25) / totalSellout25) * 100 : 0;

                      if (visibleRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={selectedType === '' ? 7 : 4} style={{ textAlign: 'center', padding: '2rem', color: '#a19f9d' }}>
                              Không tìm thấy kết quả phù hợp
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <>
                          {visibleRows.map((node) => {
                            const showYtd = bizPeriodToggle === 'ytd';
                            const hasChildren = node.children && node.children.length > 0;
                            const expanded = isNodeExpanded(node);

                            const sellin25 = showYtd ? node.ytdSellin25 : node.mtdSellin25;
                            const sellin26 = showYtd ? node.ytdSellin26 : node.mtdSellin26;
                            const sellinYoY = sellin25 > 0 ? ((sellin26 - sellin25) / sellin25) * 100 : 0;

                            const sellout25 = showYtd ? node.ytdSellout25 : node.mtdSellout25;
                            const sellout26 = showYtd ? node.ytdSellout26 : node.mtdSellout26;
                            const selloutYoY = sellout25 > 0 ? ((sellout26 - sellout25) / sellout25) * 100 : 0;

                            const getIndentPadding = (level: 'region' | 'area' | 'npp') => {
                              if (level === 'region') return '8px';
                              if (level === 'area') return '28px';
                              return '48px';
                            };

                            const handleToggle = () => {
                              if (!hasChildren) return;
                              setExpandedBizNodes(prev => ({
                                ...prev,
                                [node.id]: node.level === 'region' ? prev[node.id] === false : !prev[node.id]
                              }));
                            };

                            // Style row based on level
                            let rowBg = '#ffffff';
                            let rowFontWeight = 'normal';
                            let rowFontSize = '0.78rem';
                            let textColor = 'inherit';

                            if (node.level === 'region') {
                              rowBg = '#f8fafc';
                              rowFontWeight = '800';
                              rowFontSize = '0.84rem';
                              textColor = 'var(--cj-blue)';
                            } else if (node.level === 'area') {
                              rowBg = '#fafbfc';
                              rowFontWeight = '700';
                              rowFontSize = '0.8rem';
                              textColor = 'var(--cj-orange)';
                            }

                            return (
                              <tr 
                                key={node.id}
                                style={{ 
                                  backgroundColor: rowBg,
                                  borderBottom: node.level === 'region' ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                                  fontSize: rowFontSize,
                                  color: textColor,
                                  fontWeight: rowFontWeight
                                }}
                                className="table-row-hover"
                              >
                                {/* Name column with expand/collapse button */}
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: getIndentPadding(node.level) }}>
                                    {hasChildren ? (
                                      <button
                                        type="button"
                                        onClick={handleToggle}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: 0,
                                          marginRight: '6px',
                                          cursor: 'pointer',
                                          color: 'inherit',
                                          fontSize: '0.72rem',
                                          width: '12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        {expanded ? '▼' : '▶'}
                                      </button>
                                    ) : (
                                      <span style={{ width: '18px' }}></span>
                                    )}
                                    <span>
                                      {node.level === 'npp' ? (
                                        <>
                                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{node.ten_npp}</span>
                                          <span style={{ color: '#64748b', fontSize: '0.7rem', marginLeft: '6px' }}>({node.ma_npp})</span>
                                        </>
                                      ) : node.name}
                                    </span>
                                  </div>
                                </td>

                                {/* Sell-in values */}
                                {(selectedType === '' || selectedType.toLowerCase() === 'sellin') && (
                                  <>
                                    <td style={{ textAlign: 'right', fontWeight: node.level !== 'npp' ? 700 : 'normal' }}>
                                      {formatCurrency(sellin25)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: node.level !== 'npp' ? 700 : 'normal' }}>
                                      {formatCurrency(sellin26)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {sellin25 > 0 ? (
                                        <span className={`pbi-growth-badge ${sellinYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.7rem', padding: '1px 5px' }}>
                                          {sellinYoY >= 0 ? '▲' : '▼'} {sellinYoY >= 0 ? '+' : ''}{sellinYoY.toFixed(1)}%
                                        </span>
                                      ) : '-'}
                                    </td>
                                  </>
                                )}

                                {/* Sell-out values */}
                                {(selectedType === '' || selectedType.toLowerCase() === 'sellout') && (
                                  <>
                                    <td style={{ textAlign: 'right', fontWeight: node.level !== 'npp' ? 700 : 'normal' }}>
                                      {formatCurrency(sellout25)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: node.level !== 'npp' ? 700 : 'normal' }}>
                                      {formatCurrency(sellout26)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {sellout25 > 0 ? (
                                        <span className={`pbi-growth-badge ${selloutYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ fontSize: '0.7rem', padding: '1px 5px' }}>
                                          {selloutYoY >= 0 ? '▲' : '▼'} {selloutYoY >= 0 ? '+' : ''}{selloutYoY.toFixed(1)}%
                                        </span>
                                      ) : '-'}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}

                          {/* Grand Total Row */}
                          <tr style={{ height: '8px', backgroundColor: '#f3f2f1' }}>
                            <td colSpan={selectedType === '' ? 7 : 4} style={{ padding: 0, border: 'none' }}></td>
                          </tr>
                          <tr className="pbi-table-total" style={{ borderTop: '2px solid #1e293b' }}>
                            <td style={{ fontSize: '0.85rem', fontWeight: 800, padding: '10px 12px' }}>
                              ⭐ TỔNG CỘNG ({bizPeriodToggle.toUpperCase()})
                            </td>

                            {/* Sell-in Grand Total */}
                            {(selectedType === '' || selectedType.toLowerCase() === 'sellin') && (
                              <>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                  {formatCurrency(totalSellin25)}
                                </td>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                  {formatCurrency(totalSellin26)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {totalSellin25 > 0 ? (
                                    <span className={`pbi-growth-badge ${totalSellinYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ padding: '3px 6px', fontSize: '0.75rem' }}>
                                      {totalSellinYoY >= 0 ? '▲' : '▼'} {totalSellinYoY >= 0 ? '+' : ''}{totalSellinYoY.toFixed(1)}%
                                    </span>
                                  ) : '-'}
                                </td>
                              </>
                            )}

                            {/* Sell-out Grand Total */}
                            {(selectedType === '' || selectedType.toLowerCase() === 'sellout') && (
                              <>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                  {formatCurrency(totalSellout25)}
                                </td>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800 }}>
                                  {formatCurrency(totalSellout26)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {totalSellout25 > 0 ? (
                                    <span className={`pbi-growth-badge ${totalSelloutYoY >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`} style={{ padding: '3px 6px', fontSize: '0.75rem' }}>
                                      {totalSelloutYoY >= 0 ? '▲' : '▼'} {totalSelloutYoY >= 0 ? '+' : ''}{totalSelloutYoY.toFixed(1)}%
                                    </span>
                                  ) : '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
