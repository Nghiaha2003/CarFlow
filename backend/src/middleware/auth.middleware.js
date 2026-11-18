import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'carflow_rwa_super_secret_jwt_key_change_in_prod_2026';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role?.roleName || user.roleName,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Yêu cầu đăng nhập (Thiếu JWT Bearer Token).',
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Tài khoản không tồn tại hoặc đã bị khóa.',
      });
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus,
      role: user.role.roleName,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      code: 'INVALID_OR_EXPIRED_TOKEN',
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn (24h).',
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Chưa xác thực người dùng.',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: `Quyền truy cập bị từ chối. Yêu cầu vai trò: ${allowedRoles.join(', ')} (Hiện tại: ${req.user.role}).`,
      });
    }
    next();
  };
}
