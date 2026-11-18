# CarFlow RWA — Nền tảng Quản lý & Token hóa Tài sản Phương tiện Vận tải Thực tế

> **Đồ án Tốt nghiệp (CO4337)** — Khoa Khoa học và Kỹ thuật Máy tính, Trường Đại học Bách Khoa – ĐHQG TP.HCM  
> **Sinh viên thực hiện**: Hà Đình Nghĩa (MSSV: 2114174)  
> **Giảng viên hướng dẫn**: ThS. Phan Trung Hiếu

## 1. Kiến trúc Công nghệ (Hybrid Web2 + Web3 RWA)

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, Ethers.js v6 (Song ngữ Việt – Anh, thiết kế chuẩn FinTech RWA).
- **Backend**: Node.js, ExpressJS, JWT + `bcryptjs` (RBAC 4 vai trò: `ADMIN`, `OWNER`, `INVESTOR`, `OPERATOR`), chuẩn RESTful API `/api/v1/*`.
- **Cơ sở dữ liệu Off-chain**: Prisma ORM với đầy đủ **12 bảng chuẩn hóa** (`roles`, `users`, `assets`, `asset_operator_assignments`, `asset_documents`, `tokenization_requests`, `asset_tokens`, `token_transactions`, `token_holdings`, `operation_records`, `report_logs`, `audit_logs`) — chạy SQLite cục bộ tức thì và tương thích 100% PostgreSQL.
- **Lưu trữ Tài liệu Pháp lý**: IPFS Content Addressing (SHA-256 / CIDv1 verification).
- **Blockchain & Smart Contracts (EVM / Hyperledger Besu & Hardhat)**:
  - `VehicleIdentityRegistry`: Định danh độc bản phương tiện & mã băm hồ sơ pháp lý IPFS.
  - `VehicleShareToken` (**ERC-3643**): Token cổ phần RWA có kiểm soát tuân thủ danh tính KYC/ONCHAINID.
  - `DividendVault` (**ERC-4626**): Kho lưu trữ dòng tiền khai thác và phân bổ lợi tức tự động.
  - `AssetTokenizationManager`: Hợp đồng điều phối quy trình phát hành on-chain.

## 2. Lộ trình Phát triển theo Module (8 Modules)

| Mã | Tên Module | Trạng thái |
|---|---|---|
| **M0** | Khởi tạo Monorepo, Lược đồ 12 Bảng DB, Bộ 12 AAS Skills & Trang Theo dõi Tiến độ Live (`/progress`) | ✅ Hoàn thành |
| **M1** | Xác thực JWT, Phân quyền RBAC 4 vai trò, Liên kết Ví MetaMask & Hồ sơ KYC (`API-01..03`) | ⏳ Tiếp theo |
| **M2** | Quản lý Tài sản Xe & Lưu trữ Chứng từ Pháp lý IPFS (`API-04..05`) | 📋 Kế hoạch |
| **M3** | Hệ sinh thái Smart Contract RWA (`ERC-3643`, `ERC-4626`, `VehicleIdentityRegistry`) trên Hardhat/Besu | 📋 Kế hoạch |
| **M4** | Admin Studio: Duyệt KYC On-chain & Phát hành Token hóa Phương tiện (`API-06`) | 📋 Kế hoạch |
| **M5** | Sàn Giao dịch RWA (Marketplace) & Đầu tư Cổ phần qua Ví MetaMask (`API-07..08`) | 📋 Kế hoạch |
| **M6** | Nhật ký Vận hành Đội xe, Bảo dưỡng & Chia Cổ tức tự động qua Vault ERC-4626 (`API-09`) | 📋 Kế hoạch |
| **M7** | Command Center: Báo cáo Dòng tiền, ROI & Kiểm toán Đối chiếu On-chain/Off-chain (`API-10`) | 📋 Kế hoạch |

## 3. Khởi chạy Nhanh

```bash
# 1. Cài đặt thư viện
npm run setup

# 2. Khởi tạo 12 bảng CSDL & nạp dữ liệu mẫu ban đầu
npm run db:push
npm run db:seed

# 3. Chạy Backend (http://localhost:4000) & Frontend (http://localhost:5173)
npm run dev:backend
npm run dev:frontend
```
