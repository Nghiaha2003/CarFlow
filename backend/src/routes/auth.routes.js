import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { isAddress, getAddress } from 'ethers';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, signToken } from '../middleware/auth.middleware.js';

const router = Router();

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    walletAddress: user.walletAddress,
    kycStatus: user.kycStatus,
    status: user.status,
    role: user.role?.roleName || user.role,
    createdAt: user.createdAt,
  };
}

// API-01: POST /api/v1/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const fullName = (req.body.full_name || req.body.fullName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const phoneNumber = (req.body.phone_number || req.body.phoneNumber || '').trim() || null;
    const requestedRole = (req.body.role_name || req.body.role || 'INVESTOR').toUpperCase();

    if (!fullName || !email || password.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT_DATA',
        message: 'Vui lòng nhập đầy đủ Họ tên, Email hợp lệ và mật khẩu tối thiểu 6 ký tự.',
      });
    }

    const allowedSignupRoles = ['INVESTOR', 'OWNER', 'OPERATOR'];
    const targetRoleName = allowedSignupRoles.includes(requestedRole) ? requestedRole : 'INVESTOR';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email này đã được đăng ký trong hệ thống CarFlow RWA.',
      });
    }

    const role = await prisma.role.findUnique({ where: { roleName: targetRoleName } });
    if (!role) {
      return res.status(500).json({
        success: false,
        code: 'ROLE_NOT_INITIALIZED',
        message: 'Hệ thống vai trò chưa được khởi tạo.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        roleId: role.id,
        fullName,
        email,
        passwordHash,
        phoneNumber,
        kycStatus: 'UNVERIFIED',
      },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({ email: user.email, role: role.roleName }),
      },
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản CarFlow RWA thành công.',
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
});

// API-02: POST /api/v1/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'Vui lòng nhập cả Email và Mật khẩu.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Tài khoản của bạn đang bị tạm khóa.',
      });
    }

    const token = signToken(user);
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
});

// GET /api/v1/auth/me
router.get('/auth/me', authenticateJWT, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { role: true },
  });
  return res.json({ success: true, user: serializeUser(user) });
});

// API-03: PUT /api/v1/users/wallet
router.put('/users/wallet', authenticateJWT, async (req, res) => {
  try {
    const rawAddress = (req.body.wallet_address || req.body.walletAddress || '').trim();
    if (!rawAddress || !isAddress(rawAddress)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_WALLET_ADDRESS',
        message: 'Địa chỉ ví EVM không hợp lệ (Cần định dạng chuẩn 0x... 42 ký tự).',
      });
    }

    const checksumAddress = getAddress(rawAddress);
    const conflict = await prisma.user.findFirst({
      where: {
        walletAddress: checksumAddress,
        NOT: { id: req.user.id },
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        code: 'WALLET_ALREADY_LINKED',
        message: 'Địa chỉ ví này đã được liên kết với một tài khoản khác.',
      });
    }

    const oldUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress: checksumAddress },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'LINK_WEB3_WALLET',
        entityType: 'user',
        entityId: req.user.id,
        oldValue: oldUser.walletAddress || null,
        newValue: checksumAddress,
      },
    });

    return res.json({
      success: true,
      message: 'Liên kết địa chỉ ví Web3 thành công.',
      user: serializeUser(updated),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
});

// POST /api/v1/users/kyc-request (Submit ERC-3643 ONCHAINID KYC verification request)
router.post('/users/kyc-request', authenticateJWT, async (req, res) => {
  try {
    const identityNumber = (req.body.identityNumber || '').trim();
    const countryCode = (req.body.countryCode || 'VN').trim();

    if (!identityNumber || identityNumber.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_KYC_DOCUMENT',
        message: 'Vui lòng nhập số CCCD / Mã số doanh nghiệp hợp lệ để đăng ký ONCHAINID.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.walletAddress) {
      return res.status(400).json({
        success: false,
        code: 'WALLET_REQUIRED_FOR_KYC',
        message: 'Bạn cần liên kết địa chỉ ví Web3 trước khi gửi yêu cầu xác thực KYC ERC-3643.',
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { kycStatus: user.kycStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING' },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'SUBMIT_KYC_ONCHAINID',
        entityType: 'kyc',
        entityId: req.user.id,
        newValue: JSON.stringify({ identityNumberMasked: `***${identityNumber.slice(-4)}`, countryCode, wallet: user.walletAddress }),
      },
    });

    return res.json({
      success: true,
      message: 'Đã gửi hồ sơ KYC ONCHAINID. Quản trị viên sẽ duyệt vào danh sách tuân thủ ERC-3643.',
      user: serializeUser(updated),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
});

export default router;
