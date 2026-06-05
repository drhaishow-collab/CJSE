-- Seed script for CJ MarketBoard
-- Users
INSERT INTO users (username, full_name, email, role, phone, active) VALUES
('phuchai_sup', 'Lê Phúc Hải', 'phuchai.sup@cjvietnam.com', 'admin', '0901234567', true),
('tuan_rep', 'Nguyễn Minh Tuấn', 'tuan.rep@cjvietnam.com', 'rep', '0912345678', true),
('lan_rep', 'Lê Thị Hương Làn', 'lan.rep@cjvietnam.com', 'rep', '0987654321', true);

-- Stores (MT Channel in HCM)
INSERT INTO stores (code, name, address, latitude, longitude, channel, region, phone) VALUES
('COOP_CQ', 'Co.opmart Cống Quỳnh', '189 Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP. HCM', 10.7675, 106.6888, 'MT', 'HCM', '02838325239'),
('WIN_LM81', 'WinMart Landmark 81', 'Vinhomes Central Park, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. HCM', 10.7950, 106.7218, 'MT', 'HCM', '02873081368'),
('AEON_BT', 'AEON Mall Bình Tân', '1 Đường Số 17A, Phường Bình Trị Đông B, Quận Bình Tân, TP. HCM', 10.7432, 106.5982, 'MT', 'HCM', '02862887722'),
('BHX_NDT', 'Bách Hóa Xanh Nguyễn Duy Trinh', '455 Nguyễn Duy Trinh, Phường Bình Trưng Tây, Quận 2, TP. HCM', 10.7915, 106.7725, 'MT', 'HCM', '19001908'),
('CH_AN_DONG', 'Đại lý Chợ An Đông', 'Chợ An Đông, Phường 9, Quận 5, TP. HCM', 10.7578, 106.6705, 'GT', 'HCM', '0909999888');

-- Products (CJ Bibigo vs. Competitors)
INSERT INTO products (code, name, brand, category, price, is_active) VALUES
-- CJ Bibigo
('CJ_MANDU_T_350', 'CJ Bibigo Mandu Thịt & Rau Củ 350g', 'CJ Bibigo', 'Mandu', 49500.00, true),
('CJ_MANDU_HS_350', 'CJ Bibigo Mandu Hải Sản 350g', 'CJ Bibigo', 'Mandu', 55000.00, true),
('CJ_KIMCHI_CT_500', 'CJ Bibigo Kimchi Cải Thảo Cắt Lát 500g', 'CJ Bibigo', 'Kimchi', 45000.00, true),
('CJ_RONG_BIEN_AL_3', 'CJ Bibigo Rong Biển Ăn Liền 3 gói x 4g', 'CJ Bibigo', 'Rong Bien', 32000.00, true),
-- Competitors
('CT_MANDU_T_350', 'Cầu Tre Mandu Thịt 350g', 'Cầu Tre', 'Mandu', 47000.00, true),
('VS_MANDU_T_350', 'Vissan Mandu Thịt 350g', 'Vissan', 'Mandu', 43000.00, true),
('CH_KIMCHI_CT_500', 'Cholimex Kimchi Cải Thảo 500g', 'Cholimex', 'Kimchi', 42000.00, true),
('OC_RONG_BIEN_3', 'O!nori Rong Biển Ăn Liền 3 gói', 'O!nori', 'Rong Bien', 30000.00, true);

-- Visits (Past visits and today's visits)
-- 1. Visit yesterday by Tuan at Co.opmart Cong Quynh
INSERT INTO visits (id, store_id, user_id, visit_date, check_in_time, check_out_time, compliance_rate, notes, shelf_image_url) VALUES
(1, 1, 2, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours', 90.00, 'Quầy kệ sạch sẽ, đầy đủ hàng hóa. Đã sắp xếp lại ụ trưng bày đầu kệ của CJ Bibigo.', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800');

INSERT INTO visit_details (visit_id, product_id, is_oos, share_of_shelf, actual_price) VALUES
(1, 1, false, 45.00, 49500.00), -- CJ Mandu Thit
(1, 2, false, 40.00, 55000.00), -- CJ Mandu HS
(1, 3, false, 50.00, 45000.00), -- CJ Kimchi
(1, 5, false, 30.00, 47000.00), -- Cau Tre Mandu
(1, 6, false, 25.00, 45000.00); -- Vissan Mandu (High price than usual)

-- Competitor Intel for visit 1
INSERT INTO competitor_intel (visit_id, competitor_brand, intel_type, description, image_url) VALUES
(1, 'Cầu Tre', 'Promo', 'Cầu Tre chạy chương trình mua 2 tặng 1 cho dòng Mandu Thịt.', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=800');

-- 2. Visit today by Lan at WinMart Landmark 81 (Currently checked out)
INSERT INTO visits (id, store_id, user_id, visit_date, check_in_time, check_out_time, compliance_rate, notes, shelf_image_url) VALUES
(2, 2, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '8 hours', CURRENT_DATE + INTERVAL '9 hours 15 minutes', 95.00, 'Trưng bày đẹp mắt tại Landmark 81. Đầy đủ các mặt hàng. Doanh số ghi nhận tăng mạnh nhờ chương trình khuyễn mãi cuối tuần.', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800');

INSERT INTO visit_details (visit_id, product_id, is_oos, share_of_shelf, actual_price) VALUES
(2, 1, false, 60.00, 49500.00), -- CJ Mandu Thit
(2, 2, false, 55.00, 55000.00), -- CJ Mandu HS
(2, 3, false, 65.00, 45000.00), -- CJ Kimchi
(2, 4, false, 50.00, 32000.00), -- CJ Rong Bien
(2, 5, false, 20.00, 47000.00), -- Cau Tre Mandu
(2, 7, false, 20.00, 42000.00); -- Cholimex Kimchi

-- 3. Visit today by Tuan at AEON Mall Binh Tan (Currently active check-in, check_out is null)
INSERT INTO visits (id, store_id, user_id, visit_date, check_in_time, check_out_time, compliance_rate, notes, shelf_image_url) VALUES
(3, 3, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 hours', NULL, 75.00, 'Đang tiến hành kiểm kho. Phát hiện sản phẩm Mandu Hải Sản đang tạm hết hàng trên kệ (Out of Stock). Đang liên hệ với quản lý siêu thị để lên đơn hàng bổ sung.', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800');

INSERT INTO visit_details (visit_id, product_id, is_oos, share_of_shelf, actual_price) VALUES
(3, 1, false, 35.00, 49500.00), -- CJ Mandu Thit
(3, 2, true, 0.00, 55000.00),  -- CJ Mandu HS (OOS!)
(3, 3, false, 40.00, 45000.00), -- CJ Kimchi
(3, 5, false, 35.00, 47000.00); -- Cau Tre Mandu

INSERT INTO competitor_intel (visit_id, competitor_brand, intel_type, description, image_url) VALUES
(3, 'Vissan', 'Display', 'Vissan thuê thêm 2 mặt kệ tủ đông phụ tại lối đi chính.', NULL);

-- 4. Visit yesterday by Lan at Bach Hoa Xanh Nguyen Duy Trinh
INSERT INTO visits (id, store_id, user_id, visit_date, check_in_time, check_out_time, compliance_rate, notes, shelf_image_url) VALUES
(4, 4, 3, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '14 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '15 hours', 80.00, 'Bách Hóa Xanh không gian chật hẹp, việc trưng bày gặp khó khăn. Đã treo thêm POSM dây treo của CJ Bibigo Rong Biển.', 'https://images.unsplash.com/photo-1543083503-086c5e5db76f?auto=format&fit=crop&q=80&w=800');

INSERT INTO visit_details (visit_id, product_id, is_oos, share_of_shelf, actual_price) VALUES
(4, 1, false, 40.00, 49500.00), -- CJ Mandu Thit
(4, 3, false, 30.00, 45000.00), -- CJ Kimchi
(4, 4, false, 60.00, 32000.00), -- CJ Rong Bien
(4, 8, false, 40.00, 30000.00); -- O!nori Rong Bien
