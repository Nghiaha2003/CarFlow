import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CarFlow RWA 12-table database...');

  const rolesData = [
    { roleName: 'ADMIN', description: 'Quản trị viên hệ thống CarFlow RWA (Kiểm duyệt hồ sơ, KYC & Token hóa on-chain)' },
    { roleName: 'OWNER', description: 'Chủ tài sản phương tiện vận tải (Khai báo xe & hồ sơ pháp lý IPFS)' },
    { roleName: 'INVESTOR', description: 'Nhà đầu tư RWA (Mua cổ phần ERC-3643 & nhận cổ tức Vault ERC-4626)' },
    { roleName: 'OPERATOR', description: 'Người vận hành / Tài xế đội xe (Cập nhật hành trình, doanh thu & bảo dưỡng)' },
  ];

  const roles = {};
  for (const r of rolesData) {
    roles[r.roleName] = await prisma.role.upsert({
      where: { roleName: r.roleName },
      update: { description: r.description },
      create: r,
    });
  }

  const passwordHash = await bcrypt.hash('CarFlow@2026', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@carflow.vn' },
    update: {},
    create: {
      roleId: roles.ADMIN.id,
      fullName: 'Hà Đình Nghĩa (System Admin)',
      email: 'admin@carflow.vn',
      passwordHash,
      phoneNumber: '0886511571',
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      kycStatus: 'VERIFIED',
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@carflow.vn' },
    update: {},
    create: {
      roleId: roles.OWNER.id,
      fullName: 'Công ty Vận tải Xanh Sài Gòn',
      email: 'owner@carflow.vn',
      passwordHash,
      phoneNumber: '0909123456',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      kycStatus: 'VERIFIED',
    },
  });

  const investor = await prisma.user.upsert({
    where: { email: 'investor@carflow.vn' },
    update: {},
    create: {
      roleId: roles.INVESTOR.id,
      fullName: 'Nguyễn Minh Quân (RWA Investor)',
      email: 'investor@carflow.vn',
      passwordHash,
      phoneNumber: '0918222333',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      kycStatus: 'VERIFIED',
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@carflow.vn' },
    update: {},
    create: {
      roleId: roles.OPERATOR.id,
      fullName: 'Lê Hoàng Nam (Fleet Operator)',
      email: 'operator@carflow.vn',
      passwordHash,
      phoneNumber: '0933444555',
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      kycStatus: 'VERIFIED',
    },
  });

  const vehicles = [
    {
      assetCode: 'CF-EV-1001',
      vehicleName: 'VinFast VF 9 Plus Commercial EV',
      vehicleSegment: 'EV',
      manufactureYear: 2025,
      location: 'TP. Hồ Chí Minh',
      imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80',
      licensePlate: '51K-889.24',
      chassisNumber: 'RLNVF9PLUS2025VN01',
      engineNumber: 'EVDUAL-300KW-001',
      estimatedValue: 68000,
      targetApr: 13.8,
      utilizationRate: 92.0,
      usageStatus: 'OPERATING',
      tokenizationStatus: 'TOKENIZED',
      description: 'Xe điện SUV hạng E khai thác dịch vụ đưa đón sân bay Tân Sơn Nhất và hợp đồng doanh nghiệp.',
    },
    {
      assetCode: 'CF-LUX-1002',
      vehicleName: 'Mercedes-Benz EQS 580 4MATIC',
      vehicleSegment: 'Luxury',
      manufactureYear: 2025,
      location: 'Đà Nẵng',
      imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80',
      licensePlate: '43A-799.88',
      chassisNumber: 'W1KCG5FB5PA100288',
      engineNumber: 'EQS-385KW-088',
      estimatedValue: 122000,
      targetApr: 11.9,
      utilizationRate: 88.5,
      usageStatus: 'OPERATING',
      tokenizationStatus: 'TOKENIZED',
      description: 'Đội xe điện hạng sang phục vụ resort 5 sao và hội nghị quốc tế tại Đà Nẵng - Hội An.',
    },
    {
      assetCode: 'CF-LOG-1003',
      vehicleName: 'Hyundai Mighty EX8 GTL Cold-Chain',
      vehicleSegment: 'Logistics',
      manufactureYear: 2024,
      location: 'Bình Dương - Cát Lái',
      imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80',
      licensePlate: '61C-562.19',
      chassisNumber: 'KMJEX8GTL2024BD19',
      engineNumber: 'D4CC-160PS-519',
      estimatedValue: 46000,
      targetApr: 15.4,
      utilizationRate: 94.0,
      usageStatus: 'OPERATING',
      tokenizationStatus: 'PENDING_REVIEW',
      description: 'Xe tải thùng lạnh vận chuyển hàng chuỗi cung ứng FMCG tuyến KCN VSIP - Cảng Cát Lái.',
    },
  ];

  for (const v of vehicles) {
    const asset = await prisma.asset.upsert({
      where: { assetCode: v.assetCode },
      update: {},
      create: { ...v, ownerId: owner.id },
    });

    const existingDoc = await prisma.assetDocument.findFirst({ where: { assetId: asset.id } });
    if (!existingDoc) {
      await prisma.assetDocument.create({
        data: {
          assetId: asset.id,
          uploadedBy: owner.id,
          documentType: 'registration',
          fileName: `${v.assetCode}_Cavet_DangKy.pdf`,
          fileUrl: `/uploads/${v.assetCode}_Cavet_DangKy.pdf`,
          ipfsCid: `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`,
          documentHash: `0x8f4e2b91c0d7a31b5e9a1029384756abcdef1234567890abcdef1234567890`,
          verificationStatus: v.tokenizationStatus === 'TOKENIZED' ? 'VERIFIED' : 'PENDING',
        },
      });
    }

    if (v.tokenizationStatus === 'TOKENIZED') {
      const existingToken = await prisma.assetToken.findFirst({ where: { assetId: asset.id } });
      if (!existingToken) {
        const totalSupply = v.estimatedValue / 10;
        const availableSupply = Math.round(totalSupply * 0.22);
        const token = await prisma.assetToken.create({
          data: {
            assetId: asset.id,
            tokenType: 'ERC3643_SHARE',
            tokenStandard: 'ERC-3643',
            tokenSymbol: v.assetCode.replace(/-/g, ''),
            contractAddress: v.assetCode === 'CF-EV-1001'
              ? '0x5FbDB2315678afecb367f032d93F642f64180aa3'
              : '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
            vaultAddress: v.assetCode === 'CF-EV-1001'
              ? '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
              : '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
            registryHash: '0x4a9b817c91e23f44556677889900aabbccddeeff00112233445566778899aabb',
            totalSupply,
            availableSupply,
            unitPrice: 10,
            metadataUri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
            metadataHash: '0x8f4e2b91c0d7a31b5e9a1029384756abcdef1234567890abcdef1234567890',
            mintTxHash: '0x71c98a1e2234b5c67890d1e2f3a4b5c6d7e8f90123456789abcdef0123456789',
            tokenStatus: 'active',
          },
        });

        await prisma.tokenHolding.create({
          data: {
            investorId: investor.id,
            assetTokenId: token.id,
            tokenBalance: 650,
            claimedYield: 420.5,
          },
        });

        await prisma.tokenTransaction.create({
          data: {
            assetTokenId: token.id,
            fromUserId: admin.id,
            toUserId: investor.id,
            transactionType: 'buy',
            tokenAmount: 650,
            unitPrice: 10,
            totalValue: 6500,
            blockchainTxHash: '0x98b7c6d5e4f3a2b10987654321fedcba9876543210abcdef1234567890abcdef',
            transactionStatus: 'success',
          },
        });

        await prisma.assetOperatorAssignment.create({
          data: {
            assetId: asset.id,
            operatorId: operator.id,
            status: 'active',
          },
        });

        await prisma.operationRecord.create({
          data: {
            assetId: asset.id,
            operatorId: operator.id,
            operationStatus: 'COMPLETED_SHIFT',
            mileage: 342,
            revenue: 285.0,
            cost: 42.5,
            netProfit: 242.5,
            note: 'Khai thác ca ngày tuyến Sân bay Tân Sơn Nhất - Quận 1, sạc nhanh 45kWh.',
          },
        });
      }
    } else {
      const existingReq = await prisma.tokenizationRequest.findFirst({ where: { assetId: asset.id } });
      if (!existingReq) {
        await prisma.tokenizationRequest.create({
          data: {
            assetId: asset.id,
            requestedBy: owner.id,
            requestStatus: 'pending',
            proposedSupply: 4600,
            unitPrice: 10,
            requestNote: 'Đề nghị thẩm định hồ sơ đăng kiểm lạnh và phát hành cổ phần RWA chuẩn ERC-3643.',
          },
        });
      }
    }
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'SYSTEM_MODULE_0_INITIALIZED',
        entityType: 'system',
        entityId: admin.id,
        newValue: JSON.stringify({ tables: 12, standards: ['ERC-3643', 'ERC-4626'], version: '0.1.0' }),
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
