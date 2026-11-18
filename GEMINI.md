# CarFlow RWA — Project Rules & Architecture Guide

## Domain & Thesis Alignment
- **Product**: **CarFlow RWA** — Hệ thống quản lý và mã hóa tài sản phương tiện vận tải thực tế (Real-World Assets) kết hợp Web2 & Web3.
- **Author**: Hà Đình Nghĩa (MSSV: 2114174) — ĐHBK ĐHQG-HCM (GVHD: ThS. Phan Trung Hiếu).
- **Languages**: Giao diện hỗ trợ chuyển đổi song ngữ **Tiếng Việt (VI)** và **Tiếng Anh (EN)**.
- **4 Core Roles (RBAC)**: `ADMIN`, `OWNER` (Chủ tài sản), `INVESTOR` (Nhà đầu tư), `OPERATOR` (Người vận hành).
- **On-Chain Token Architecture**:
  1. `VehicleIdentityRegistry` — Sổ cái định danh phương tiện (VIN, biển số, mã CID IPFS).
  2. `VehicleShareToken` (**ERC-3643** Permissioned RWA Token) — Cổ phần quyền lợi kinh tế gắn kiểm tra KYC/ONCHAINID.
  3. `DividendVault` (**ERC-4626** Tokenized Yield Vault) — Kho lưu trữ doanh thu vận hành và phân phối cổ tức tự động.
  4. `AssetTokenizationManager` — Hợp đồng điều phối phát hành đồng bộ.

## Engineering Workflow (Modular Delivery)
- Dự án được chia thành 8 Module (`M0` -> `M7`).
- Mỗi module phải đảm bảo:
  1. Hoạt động thực tế trên trình duyệt (Frontend + Backend + DB/Blockchain), không dùng mock tĩnh giả tạo khi module đó đã hoàn thành.
  2. Xử lý đầy đủ các trạng thái giao diện theo skill `ui-states` (loading, empty, validation error, permission denied, busy button, success).
  3. Cập nhật trạng thái tiến độ thực tế tại `backend/src/data/roadmap.js` để hiển thị trực tiếp trên trang `/progress`.
  4. Kiểm tra build không lỗi, không lộ khóa bí mật (`.env`, private key) và commit chuẩn Conventional Commits (`feat(module-X): ...`) đẩy lên GitHub.
