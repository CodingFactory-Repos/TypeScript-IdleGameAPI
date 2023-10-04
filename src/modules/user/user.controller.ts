import { SimpleUser } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import { WithId } from "mongodb";
import { findByToken } from "../auth/auth.services";
import { requireLogin } from "../auth/auth.middleware";

export function registerUserRoutes(app: Express) {
    app.get(
        "/user/inventory",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user: WithId<SimpleUser> | null = await findByToken(
                req.headers.token as string
            );

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            return res.status(200).json(user?.inventory);
        }
    );
}
