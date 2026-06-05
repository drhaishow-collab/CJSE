import React, { useState } from 'react';

export const KpiDocs: React.FC = () => {
  // Playground state
  const [sales, setSales] = useState<number>(150000000);
  const [asoInput, setAsoInput] = useState<number>(35);
  const [visits, setVisits] = useState<number>(200);
  const [transactions, setTransactions] = useState<number>(120);
  const [skuSum, setSkuSum] = useState<number>(240);
  const [mcp, setMcp] = useState<number>(50);
  const [visitedCount, setVisitedCount] = useState<number>(45);

  // Calculations
  const computedVpo = asoInput > 0 ? sales / asoInput : 0;
  const computedDropsize = transactions > 0 ? sales / transactions : 0;
  const computedSkuOrder = transactions > 0 ? skuSum / transactions : 0;
  const computedVisitedPct = mcp > 0 ? (visitedCount / mcp) * 100 : 0;
  const computedStrikeRate = mcp > 0 ? (asoInput / mcp) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="pbi-canvas" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      {/* Header */}
      <div className="pbi-header" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div className="pbi-header-title">
          <span style={{ fontSize: '1.8rem' }}>📖</span>
          <div>
            <div style={{ fontWeight: 800, color: '#252423', fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
              TÀI LIỆU ĐỊNH NGHĨA CHỈ SỐ KPI
            </div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', fontWeight: 600, marginTop: '2px' }}>
              Tra cứu định nghĩa, công thức tính toán và cấu trúc SQL các chỉ số trên CJ MarketBoard
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        
        {/* ASO Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid var(--cj-blue)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'var(--cj-blue)', fontSize: '1.1rem' }}>ASO (Active Outlets)</span>
            <span className="badge" style={{ backgroundColor: 'var(--cj-blue-light)', color: 'var(--cj-blue)', fontWeight: 700 }}>Count</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Số khách hàng có mua hàng thực tế
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Đo lường số lượng điểm bán hàng (khách hàng/outlets) thực tế phát sinh giao dịch mua hàng bán ra (doanh số Sell-out lớn hơn 0) trong tháng/kỳ báo cáo.
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              ASO = Đếm duy nhất Khách hàng có Giao dịch
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: COUNT(DISTINCT fs.ma_kh) FROM fact_sellout
            </div>
          </div>
        </div>

        {/* VPO Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid var(--cj-orange)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'var(--cj-orange)', fontSize: '1.1rem' }}>VPO (Value Per Outlet)</span>
            <span className="badge" style={{ backgroundColor: 'var(--cj-orange-light)', color: 'var(--cj-orange)', fontWeight: 700 }}>Currency</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Doanh số Sell-out trung bình của một khách hàng trong tháng
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Đo lường trị giá doanh thu bán ra trung bình tính trên từng khách hàng active. Khi tính cho team/vùng, đây là tổng doanh số Sell-out của team/vùng chia cho số lượng khách hàng mua hàng của team/vùng đó.
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              VPO = Tổng Doanh Số Sell-out / ASO
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: SUM(fs.revenue) / COUNT(DISTINCT fs.ma_kh)
            </div>
          </div>
        </div>

        {/* Drop Size Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid #0d9488', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#0d9488', fontSize: '1.1rem' }}>Drop Size</span>
            <span className="badge" style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)', color: '#0d9488', fontWeight: 700 }}>Currency</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Doanh số trung bình trên mỗi đơn hàng thành công
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Đo lường độ lớn trung bình của một đơn hàng. Giúp đánh giá khả năng thuyết phục khách hàng mua nhiều hàng hơn trong một lần NVBH ghé thăm lấy đơn.
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              Drop Size = Tổng Doanh Số / Tổng số Đơn (Txns)
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: SUM(doanh_so) / COUNT(DISTINCT hoa_don)
            </div>
          </div>
        </div>

        {/* SKUs / Order Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid #7b1fa2', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#7b1fa2', fontSize: '1.1rem' }}>SKUs / Order</span>
            <span className="badge" style={{ backgroundColor: 'rgba(123, 31, 162, 0.08)', color: '#7b1fa2', fontWeight: 700 }}>Average</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Số mặt hàng trung bình trên một đơn hàng
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Đo lường mức độ đa dạng hóa giỏ hàng bán ra. Cho biết NVBH có giới thiệu bán chéo thành công nhiều chủng loại sản phẩm khác nhau (Mandu, Kimchi, Rong biển...) trong đơn hay không.
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              SKUs / Order = Tổng số Dòng SKU / Tổng số Đơn
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: AVG(sku_count_per_order)
            </div>
          </div>
        </div>

        {/* % Visited Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid var(--cj-blue)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'var(--cj-blue)', fontSize: '1.1rem' }}>% Visited</span>
            <span className="badge" style={{ backgroundColor: 'var(--cj-blue-light)', color: 'var(--cj-blue)', fontWeight: 700 }}>Percentage</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Tỷ lệ ghé thăm điểm bán trên tuyến MCP
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Tỷ lệ điểm bán hàng được nhân viên bán hàng ghé thăm thực tế (check-in) so với tổng số điểm bán thuộc danh sách tuyến bán hàng định sẵn (MCP - Master Coverage Plan).
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              % Visited = (Khách đã Ghé Thăm / Khách MCP) * 100
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: count(distinct vieng_tham) / count(distinct mcp)
            </div>
          </div>
        </div>

        {/* Strike Rate Card */}
        <div className="pbi-card" style={{ borderLeft: '4px solid #166534', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#166534', fontSize: '1.1rem' }}>Strike Rate (Tỷ lệ Active)</span>
            <span className="badge" style={{ backgroundColor: 'rgba(22, 101, 52, 0.08)', color: '#166534', fontWeight: 700 }}>Percentage</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
            Tỷ lệ mua hàng trên tuyến MCP
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            Tỷ lệ điểm bán hàng thực tế phát sinh đơn hàng (Active Outlets) so với tổng số điểm bán hàng trên tuyến MCP. Đánh giá chất lượng và tỷ lệ chuyển đổi đơn hàng của tuyến bán hàng.
          </p>
          <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              Strike Rate = (ASO / Khách MCP) * 100
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>
              SQL: count(distinct active_kh) / count(distinct mcp)
            </div>
          </div>
        </div>

      </div>

      {/* Concept Explanations */}
      <div className="pbi-card" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '0.75rem' }}>
          💡 THUẬT NGỮ CƠ BẢN TRONG HỆ THỐNG SALES FORCE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.8rem', color: '#475569' }}>
          <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }} className="laptop-divider-hide">
            <strong style={{ color: '#0f172a' }}>1. Sell-in (Doanh số nhập NPP)</strong>
            <p style={{ marginTop: '4px', lineHeight: 1.4 }}>
              Doanh số công ty CJ bán vào và xuất hóa đơn cho các Nhà phân phối (NPP) đại lý cấp 1.
            </p>
          </div>
          <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }} className="laptop-divider-hide">
            <strong style={{ color: '#0f172a' }}>2. Sell-out (Doanh số bán ra thị trường)</strong>
            <p style={{ marginTop: '4px', lineHeight: 1.4 }}>
              Doanh số thực tế của các nhân viên bán hàng (NVBH) chốt đơn ngoài thị trường từ Nhà phân phối bán ra cho các điểm bán lẻ, tạp hóa, đại lý nhỏ hoặc siêu thị mini.
            </p>
          </div>
          <div>
            <strong style={{ color: '#0f172a' }}>3. Tuyến bán hàng MCP</strong>
            <p style={{ marginTop: '4px', lineHeight: 1.4 }}>
              Kế hoạch phân tuyến ghé thăm điểm bán định kỳ hàng ngày/tuần dành cho từng NVBH để đảm bảo độ phủ và chăm sóc khách hàng đều đặn.
            </p>
          </div>
        </div>
      </div>

      {/* Expanded KPI definitions in natural language */}
      <div className="pbi-card" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>
          🧾 ĐỊNH NGHĨA CHỈ SỐ MỞ RỘNG THEO NGÔN NGỮ TỰ NHIÊN
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--cj-blue)', marginBottom: '0.5rem' }}>Nhóm 1: Chỉ số Cơ bản (Basic Performance)</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Total Sell-out:</strong> là tổng doanh thu bán ra thị trường, được cộng từ toàn bộ doanh thu thuần trên bảng bán ra. Chỉ số này cho biết thị trường thực tế đã tiêu thụ được bao nhiêu giá trị hàng hóa trong kỳ báo cáo.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Total Sell-out = Tổng doanh thu thuần bán ra</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(net_revenue) FROM dwh fact_sellout</div>
                </div>
              </div>
              <div>
                <strong>Total Sell-in:</strong> là tổng doanh thu bán vào nhà phân phối, được cộng từ toàn bộ doanh thu thuần trên bảng bán vào. Chỉ số này phản ánh lượng hàng công ty đã xuất bán cho hệ thống phân phối trong kỳ.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Total Sell-in = Tổng doanh thu thuần bán vào</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(net_revenue) FROM dwh fact_sellin</div>
                </div>
              </div>
              <div>
                <strong>Total Quantity:</strong> là tổng số lượng sản phẩm đã bán ra, được cộng từ tất cả dòng số lượng trên dữ liệu sell-out. Chỉ số này dùng để theo dõi sản lượng thay vì chỉ theo dõi giá trị doanh thu.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Total Quantity = Tổng số lượng bán ra</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(quantity) FROM dwh fact_sellout</div>
                </div>
              </div>
              <div>
                <strong>Total Orders:</strong> là tổng số đơn hàng bán ra phát sinh trong kỳ, được tính bằng cách đếm số đơn hàng khác nhau. Chỉ số này giúp đánh giá tần suất đặt hàng của thị trường.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Total Orders = Đếm số đơn hàng khác nhau</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: COUNT(DISTINCT order_number) FROM dwh fact_sellout</div>
                </div>
              </div>
              <div>
                <strong>Active Customers:</strong> là tổng số khách hàng có phát sinh mua hàng trong kỳ, được tính bằng cách đếm số khách hàng khác nhau trên dữ liệu sell-out. Đây là chỉ số nền tảng để đo độ phủ và mức độ hoạt động của mạng lưới bán hàng.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Active Customers = Đếm khách hàng có giao dịch</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: COUNT(DISTINCT customer_id) FROM dwh fact_sellout</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: 'var(--cj-orange)', marginBottom: '0.5rem' }}>Nhóm 2: Tăng trưởng (Growth & Time Intelligence)</div>
            <div style={{ padding: '0.85rem 1rem', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', fontSize: '0.82rem', color: '#9a3412', marginBottom: '0.75rem' }}>
              Lưu ý: để các chỉ số lũy kế như YTD, MTD và cùng kỳ năm trước hoạt động chính xác, bảng <strong>`dwh dim_date`</strong> cần được đánh dấu là <strong>Date Table</strong> trong Power BI và dùng cột <strong>`full_date`</strong> làm cột ngày chuẩn.
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Sell-out YTD:</strong> là doanh thu bán ra lũy kế từ đầu năm đến ngày đang xem. Chỉ số này cho biết tiến độ doanh thu tích lũy trong cả năm thay vì chỉ nhìn riêng một tháng.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Sell-out YTD = Doanh thu bán ra lũy kế từ đầu năm</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: TOTALYTD([Total Sell-out], 'dwh dim_date'[full_date])</div>
                </div>
              </div>
              <div>
                <strong>Sell-out MTD:</strong> là doanh thu bán ra lũy kế từ đầu tháng đến ngày đang xem trong tháng hiện tại. Chỉ số này phù hợp để theo dõi tiến độ chạy tháng.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Sell-out MTD = Doanh thu bán ra lũy kế từ đầu tháng</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: TOTALMTD([Total Sell-out], 'dwh dim_date'[full_date])</div>
                </div>
              </div>
              <div>
                <strong>Sell-out SPLY:</strong> là doanh thu bán ra của đúng cùng kỳ năm trước. Đây là mốc đối chiếu chuẩn để so sánh tăng trưởng năm nay với năm trước trên cùng khoảng thời gian.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Sell-out SPLY = Doanh thu bán ra cùng kỳ năm trước</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: CALCULATE([Total Sell-out], SAMEPERIODLASTYEAR('dwh dim_date'[full_date]))</div>
                </div>
              </div>
              <div>
                <strong>YoY Growth %:</strong> là tỷ lệ tăng trưởng doanh thu so với cùng kỳ năm trước, được tính bằng phần chênh lệch giữa doanh thu hiện tại và doanh thu cùng kỳ năm trước, rồi chia lại cho doanh thu cùng kỳ năm trước. Chỉ số này cho biết doanh thu đang tăng hay giảm bao nhiêu phần trăm theo năm.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>YoY Growth % = (Doanh thu hiện tại - Doanh thu cùng kỳ năm trước) / Doanh thu cùng kỳ năm trước</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Total Sell-out] - [Sell-out SPLY], [Sell-out SPLY])</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: '#0d9488', marginBottom: '0.5rem' }}>Nhóm 3: Route To Market (Bao phủ & Phân phối)</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Drop-size:</strong> là doanh thu bán ra trung bình trên mỗi đơn hàng, được lấy tổng sell-out chia cho tổng số đơn. Chỉ số này phản ánh mỗi lần chốt đơn NVBH bán được giá trị lớn hay nhỏ.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Drop-size = Tổng Doanh Số Sell-out / Tổng Số Đơn</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Total Sell-out], [Total Orders])</div>
                </div>
              </div>
              <div>
                <strong>Rev per Outlet:</strong> là doanh thu trung bình trên một khách hàng có mua hàng, được lấy tổng sell-out chia cho số khách hàng active. Chỉ số này cho biết chất lượng doanh thu trên mỗi outlet đang hoạt động.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Rev per Outlet = Tổng Doanh Số Sell-out / Active Customers</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Total Sell-out], [Active Customers])</div>
                </div>
              </div>
              <div>
                <strong>Target Customers:</strong> là tổng số khách hàng nằm trong danh sách cần quản lý hoặc chăm sóc trên tuyến, được cộng từ dữ liệu visit. Đây là quy mô nền khách hàng mà đội bán hàng phải bao phủ.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Target Customers = Tổng số khách hàng trên tuyến cần quản lý</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(total_customers) FROM dwh fact_visits</div>
                </div>
              </div>
              <div>
                <strong>Coverage %:</strong> là tỷ lệ bao phủ bán hàng, được tính bằng số khách hàng thực sự có mua chia cho tổng số khách hàng mục tiêu trên tuyến. Chỉ số này cho biết đội bán hàng đã chuyển đổi được bao nhiêu outlet trong tổng số outlet cần quản lý.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Coverage % = Active Customers / Target Customers</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Active Customers], [Target Customers])</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>Nhóm 4: Hiệu quả Sales (Sales Force Effectiveness - SFE)</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Total Calls:</strong> là tổng số lần viếng thăm hoặc cuộc gọi bán hàng, bao gồm cả cuộc gọi đúng tuyến và ngoài tuyến. Chỉ số này cho biết khối lượng hoạt động thực tế của lực lượng bán hàng.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Total Calls = Calls đúng tuyến + Calls ngoài tuyến</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(calls_in_route) + SUM(calls_out_route) FROM dwh fact_visits</div>
                </div>
              </div>
              <div>
                <strong>Strike Rate %:</strong> là tỷ lệ viếng thăm chuyển đổi thành đơn hàng, được tính bằng tổng số đơn hàng chia cho tổng số cuộc gọi bán hàng. Chỉ số này phản ánh chất lượng viếng thăm và khả năng chốt đơn của đội ngũ sales.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Strike Rate % = Tổng Số Đơn / Total Calls</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Total Orders], [Total Calls])</div>
                </div>
              </div>
              <div>
                <strong>Productivity:</strong> là số cuộc gọi trung bình trong một ngày làm việc, được lấy tổng số cuộc gọi chia cho số ngày có hoạt động đi thị trường trong kỳ. Chỉ số này cho biết năng suất làm việc hàng ngày của nhân viên bán hàng.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Productivity = Total Calls / Số ngày có đi làm</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Total Calls], DISTINCTCOUNT('dwh fact_visits'[date_key]))</div>
                </div>
              </div>
              <div>
                <strong>Wrong Distance Calls:</strong> là tổng số lần viếng thăm bị cảnh báo sai khoảng cách GPS. Chỉ số này được dùng để kiểm soát tính tuân thủ check-in và chất lượng dữ liệu ngoài thị trường.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Wrong Distance Calls = Tổng số lần cảnh báo GPS sai khoảng cách</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(wrong_distance_calls) FROM dwh fact_visits</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: '#7b1fa2', marginBottom: '0.5rem' }}>Nhóm 5: Đo lường KPI (Thực đạt vs Mục tiêu)</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Target Amount:</strong> là tổng giá trị mục tiêu được giao, cộng từ dữ liệu KPI target. Đây là mức đích cần đạt của cá nhân, team hoặc vùng trong kỳ.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Target Amount = Tổng giá trị mục tiêu</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(target) FROM dwh fact_kpi</div>
                </div>
              </div>
              <div>
                <strong>Actual Amount:</strong> là tổng giá trị thực hiện được, cộng từ dữ liệu KPI actual. Đây là phần kết quả thực tế đã đạt so với mục tiêu được giao.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Actual Amount = Tổng giá trị thực đạt</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>SQL: SUM(actual) FROM dwh fact_kpi</div>
                </div>
              </div>
              <div>
                <strong>Achievement %:</strong> là tỷ lệ hoàn thành mục tiêu, được tính bằng thực đạt chia cho mục tiêu. Chỉ số này cho biết mức độ hoàn thành KPI của cá nhân, nhóm hoặc khu vực đang ở bao nhiêu phần trăm.
                <div style={{ marginTop: '0.35rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CÔNG THỨC</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>Achievement % = Actual Amount / Target Amount</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>DAX: DIVIDE([Actual Amount], [Target Amount])</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulator Playground */}
      <div className="pbi-card" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.3px' }}>
          🧮 TRÌNH MÔ PHỎNG & TÍNH TOÁN KPI ĐỘNG (PLAYGROUND SIMULATOR)
        </div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
          Nhập các thông số cơ bản ngoài thị trường của Rep/Team để hệ thống tự động kiểm tra và xuất ra các chỉ số KPI tương ứng.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Inputs Column */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
              Dữ liệu đầu vào (Input data)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Doanh số Sell-out (đ):</label>
              <input 
                type="number" 
                value={sales} 
                onChange={(e) => setSales(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Khách mua hàng (ASO):</label>
              <input 
                type="number" 
                value={asoInput} 
                onChange={(e) => setAsoInput(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Khách MCP trên tuyến:</label>
              <input 
                type="number" 
                value={mcp} 
                onChange={(e) => setMcp(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Số khách ghé thăm:</label>
              <input 
                type="number" 
                value={visitedCount} 
                onChange={(e) => setVisitedCount(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Số đơn hàng (Transactions):</label>
              <input 
                type="number" 
                value={transactions} 
                onChange={(e) => setTransactions(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Tổng số dòng mặt hàng (SKU):</label>
              <input 
                type="number" 
                value={skuSum} 
                onChange={(e) => setSkuSum(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Outputs Column */}
          <div style={{ flex: '1.2 1 350px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid #e2e8f0' }} className="playground-output-panel">
            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
              Kết quả KPI tương ứng (Calculated Output)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              
              {/* Output VPO */}
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>VPO (Doanh số/KH)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cj-orange)', marginTop: '4px' }}>
                  {formatCurrency(computedVpo)}
                </div>
              </div>

              {/* Output Dropsize */}
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Drop Size (Doanh số/Đơn)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>
                  {formatCurrency(computedDropsize)}
                </div>
              </div>

              {/* Output SKUs/Order */}
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>SKUs / Order</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7b1fa2', marginTop: '4px' }}>
                  {computedSkuOrder.toFixed(2)}
                </div>
              </div>

              {/* Output Visited % */}
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>% Visited (Ghé thăm)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cj-blue)', marginTop: '4px' }}>
                  {computedVisitedPct.toFixed(1)}%
                </div>
              </div>

              {/* Output Strike Rate */}
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Strike Rate (Khách active/Tuyến MCP)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                  {computedStrikeRate.toFixed(1)}%
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
