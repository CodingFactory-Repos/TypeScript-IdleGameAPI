import { SimpleUser } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import { WithId } from "mongodb";
import { findByReqHeaderToken } from "../auth/auth.services";
import { requireLogin } from "../auth/auth.middleware";
import { Inventory } from "@/db/models/Inventory";
import { Shops } from "@/db/models/Shop";

export function registerInventoryRoutes(app: Express) {
    app.get(
        "/user/inventory",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user: WithId<SimpleUser> | null = await findByReqHeaderToken(
                req
            );
            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const inventory = await Inventory.findOne({
                user_id: user._id,
            });

            if (!inventory) {
                return res.status(404).json({ message: "Inventory not found" });
            }

            // get the user inventory items id's and get the items from the shop
            const items = await Shops.find({
                _id: { $in: inventory.items_id },
            }).toArray();

            return res.json({ items });
        }
    );
}
