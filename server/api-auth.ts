import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check for a valid API Key in the X-API-Key header.
 * The key is compared against the EXTERNAL_API_KEY environment variable.
 */
export function apiAuth(req: Request, res: Response, next: NextFunction) {
    // Only apply to API routes
    if (!req.path.startsWith("/api")) {
        return next();
    }

    // Define which paths are public (if any)
    const publicPaths = ["/api/health"];
    if (publicPaths.includes(req.path)) {
        return next();
    }

    // Allow GET requests to prescription images (needed for <img> tags)
    if (req.method === "GET" && req.path.match(/^\/api\/prescriptions\/[^\/]+\/image$/)) {
        return next();
    }

    const apiKey = req.header("X-API-Key");
    const expectedKey = process.env.EXTERNAL_API_KEY;

    // If EXTERNAL_API_KEY is not set, we might want to warn or skip during development
    // But for production safety, if it's set, we MUST validate it.
    if (!expectedKey) {
        if (process.env.NODE_ENV === "production") {
            console.error("EXTERNAL_API_KEY is not set in production!");
            return res.status(500).json({ error: "API configuration error" });
        }
        // In development, if no key is set, we let it pass but log a warning
        console.warn("EXTERNAL_API_KEY is not set. API is currently unprotected.");
        return next();
    }

    if (apiKey !== expectedKey) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
    }

    next();
}
