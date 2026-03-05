import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-access-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_JWT_SECRET || 'dev-refresh-secret';

// Defines payload structure
export interface JwtPayload {
    userId: string;
}

// 15 minutes
export const generateAccessToken = (payload: JwtPayload) => {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

// 7 days
export const generateRefreshToken = (payload: JwtPayload) => {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
};
