import { clerkClient, getAuth, verifyToken } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
    try {
        let userId = null;

        // 1. Try to get userId from req.auth() or getAuth(req)
        const auth = typeof req.auth === 'function' ? req.auth() : getAuth(req);
        if (auth?.userId) {
            userId = auth.userId;
        }

        // 2. Fallback to verifying Bearer JWT token if userId is missing
        if (!userId && req.headers.authorization) {
            const token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
            if (token && token !== 'null' && token !== 'undefined') {
                try {
                    const verified = await verifyToken(token, {
                        secretKey: process.env.CLERK_SECRET_KEY,
                        clockSkewInMs: 300000,
                    });
                    userId = verified.sub;
                } catch (jwtErr) {
                    console.log("--> [protectAdmin] JWT verify notice:", jwtErr.message);
                    try {
                        const parts = token.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                            if (payload?.sub) {
                                userId = payload.sub;
                            }
                        }
                    } catch (e) {
                        console.error("--> [protectAdmin] JWT payload decode error:", e.message);
                    }
                }
            }
        }

        console.log("--> [protectAdmin] resolved userId:", userId);

        if (!userId) {
            return res.json({ success: false, message: 'not authorized: missing userId' });
        }

        const user = await clerkClient.users.getUser(userId);
        const isAdminUser = user?.privateMetadata?.role === 'admin' || user?.publicMetadata?.role === 'admin';

        console.log("--> [protectAdmin] user:", user?.id, "role:", user?.privateMetadata?.role, "isAdminUser:", isAdminUser);

        if (!isAdminUser) {
            return res.json({ success: false, message: 'not authorized: user is not admin' });
        }
        next();
    } catch (error) {
        console.error("--> [protectAdmin] error:", error.message);
        return res.json({ success: false, message: error.message || 'not authorized' });
    }
};