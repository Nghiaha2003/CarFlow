# CarFlow RWA — Nền tảng Quản lý & Token hóa Tài sản Phương tiện Vận tải Thực tế

> **Đồ án Tốt nghiệp (CO4337)** — Khoa Khoa học và Kỹ thuật Máy tính, Trường Đại học Bách Khoa – ĐHQG TP.HCM  
> **Sinh viên thực hiện**: Hà Đình Nghĩa (MSSV: 2114174)  
> **Giảng viên hướng dẫn**: ThS. Phan Trung Hiếu

## 1. Kiến trúc Công nghệ (Hybrid Web2 + Web3 RWA)

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, Ethers.js v6 (Chuyển đổi song ngữ Việt – Anh, thiết kế chuẩn FinTech RWA bám sát `Hình 5.16` – `Hình 5.20`).
- **Backend**: Node.js, ExpressJS, JWT + `bcryptjs` (RBAC 4 vai trò: `ADMIN`, `OWNER`, `INVESTOR`, `OPERATOR`), đầy đủ hệ thống RESTful API `/api/v1/*` (`API-01` → `API-10`).
- **Cơ sở dữ liệu Off-chain**: Prisma ORM với đầy đủ **12 bảng chuẩn hóa** (`roles`, `users`, `assets`, `asset_operator_assignments`, `asset_documents`, `tokenization_requests`, `asset_tokens`, `token_transactions`, `token_holdings`, `operation_records`, `report_logs`, `audit_logs`) — chạy SQLite cục bộ tức thì và tương thích 100% PostgreSQL.
- **Lưu trữ Tài liệu Pháp lý**: IPFS Content Addressing (Băm mật mã `SHA-256` & mã định danh `CIDv1` chuẩn base32).
- **Blockchain & Smart Contracts (Solidity 0.8.24 + EVM JSON-RPC Node cổng `8545` tương thích Hyperledger Besu)**:
  - `OnchainIdentityRegistry.sol`: Sổ cái danh tính tuân thủ KYC / ONCHAINID.
  - `VehicleIdentityRegistry.sol`: Định danh độc bản phương tiện (VIN, biển số, mã CID IPFS) & lưu vết bằng chứng bảo dưỡng bất biến (`API-10`).
  - `VehicleShareToken.sol` (**ERC-3643**): Token cổ phần RWA tự động kiểm tra KYC khi chuyển nhượng, hỗ trợ đóng băng (`freezeToken`) và cưỡng chế pháp lý (`forceTransfer`).
  - `DividendVault.sol` (**ERC-4626**): Kho lưu trữ doanh thu khai thác xe và phân phối lợi tức tự động theo tỷ lệ cổ phần nắm giữ.
  - `AssetTokenizationManager.sol`: Hợp đồng điều phối phát hành đồng bộ trên chuỗi khối.

## 2. Lộ trình 8 Module Hoàn thiện

| Mã | Tên Module | Trạng thái |
|---|---|---|
| **M0** | Khởi tạo Monorepo, Lược đồ 12 Bảng DB, Bộ 12 AAS Skills & Dashboard Tiến độ Live (`/progress`) | ✅ Hoàn thành |
| **M1** | Xác thực JWT, Phân quyền RBAC 4 vai trò, Liên kết Ví MetaMask & Hồ sơ KYC (`API-01..03`, `Hình 5.16`) | ✅ Hoàn thành |
| **M2** | Quản lý Tài sản Xe & Lưu trữ Chứng từ Pháp lý IPFS (`API-04..05`) | ✅ Hoàn thành |
| **M3** | Hệ sinh thái 5 Smart Contract Solidity (`ERC-3643`, `ERC-4626`, `IdentityRegistry`) & Node EVM cục bộ | ✅ Hoàn thành |
| **M4** | Admin Studio (`Hình 5.19`): Duyệt KYC On-chain, Phát hành Token hóa (`API-06`) & Bảo dưỡng (`API-10`) | ✅ Hoàn thành |
| **M5** | Sàn Giao dịch RWA (`Hình 5.17`), Chi tiết Đầu tư (`Hình 5.18`) & Chuyển nhượng Tuân thủ (`API-07..08`) | ✅ Hoàn thành |
| **M6** | Nhật ký Vận hành Đội xe (`API-09`) & Rút Cổ tức Tự động qua Kho `DividendVault` (`ERC-4626`) | ✅ Hoàn thành |
| **M7** | Command Center (`Hình 5.20`), Kết xuất Báo cáo CSV & Kiểm toán Đối chiếu Off-chain ↔ On-chain | ✅ Hoàn thành |

## 3. Tài khoản Demo 4 Tác nhân (Mật khẩu chung: `CarFlow@2026`)

| Vai trò | Email | Chức năng chính |
|---|---|---|
| **ADMIN** | `admin@carflow.vn` | Duyệt KYC ONCHAINID, phê duyệt đúc hợp đồng ERC-3643/4626, chứng thực bảo dưỡng |
| **OWNER** | `owner@carflow.vn` | Khai báo phương tiện vận tải mới, tải & băm chứng từ pháp lý lên IPFS |
| **INVESTOR** | `investor@carflow.vn` | Đầu tư mua cổ phần ERC-3643, chuyển nhượng P2P tuân thủ & rút cổ tức từ Vault ERC-4626 |
| **OPERATOR** | `operator@carflow.vn` | Ghi nhận ca vận hành hàng ngày (km, doanh thu, chi phí sạc) & nạp lợi nhuận ròng vào Vault |

## 4. Khởi chạy Hệ thống

```bash
# 1. Cài đặt thư viện & kiểm thử bộ Smart Contract Solidity
npm run setup
npm run contracts:compile
npm run contracts:test

# 2. Khởi tạo 12 bảng CSDL & nạp dữ liệu mẫu
npm run db:push
npm run db:seed

# 3. Khởi chạy 3 tầng dịch vụ (EVM Node :8545, Backend :4000, Frontend :5173)
npm run dev:chain
npm run dev:backend
npm run dev:frontend
```
