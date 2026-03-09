import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../../utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, username } = request.body as any;

    if (!email || !password || !username) {
        return reply.error('Missing required fields', 400);
    }

    // Check if email or username in use
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });

    if (existingUser) {
        return reply.error('Email or username already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Use the mockable prisma client directly
    const newUser = await prisma.user.create({
        data: {
            email,
            username,
            password_hash
        }
    });

    // Generate tokens
    const payload = { userId: newUser.id };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set refresh token in cookie
    reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    });

    // Remove pwd hash from response
    const { password_hash: _, ...safeUser } = newUser;

    return reply.status(201).send({
        code: 201,
        message: 'success',
        data: {
            accessToken,
            user: safeUser
        }
    });
};

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
        return reply.error('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user || user.status === 0 || user.is_deleted === 1) {
        return reply.error('Invalid credentials or account disabled', 401);
    }

    let validPassword = false;
    try {
        validPassword = await bcrypt.compare(password, user.password_hash);
    } catch {
        return reply.error('Invalid credentials', 401);
    }
    if (!validPassword) {
        return reply.error('Invalid credentials', 401);
    }

    const payload = { userId: user.id };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set cookie
    reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
    });

    const { password_hash, ...safeUser } = user;

    return reply.success({
        accessToken,
        user: safeUser
    });
};

export const refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
        return reply.error('Refresh token missing', 401);
    }

    try {
        const { verifyRefreshToken } = await import('../../utils/jwt');
        const payload = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user || user.status === 0 || user.is_deleted === 1) {
            return reply.error('User not found or disabled', 401);
        }

        const { generateAccessToken } = await import('../../utils/jwt');
        const newAccessToken = generateAccessToken({ userId: user.id });

        return reply.success({
            accessToken: newAccessToken
        });
    } catch (error) {
        return reply.error('Invalid refresh token', 401);
    }
};

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
    // Clear the cookie
    reply.clearCookie('refreshToken', {
        path: '/'
    });

    return reply.success(null, 'Logged out successfully');
};

export const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
        return reply.error('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || user.status === 0 || user.is_deleted === 1) {
        return reply.error('User not found or disabled', 401);
    }

    const { password_hash, ...safeUser } = user;
    return reply.success(safeUser);
};

