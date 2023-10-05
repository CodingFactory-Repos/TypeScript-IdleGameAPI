import { SimpleUser } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import { WithId } from "mongodb";
import { requireLogin } from "../auth/auth.middleware";
import { Inventory } from "@/db/models/Inventory";
import { Shops } from "@/db/models/Shop";
import { onItemLevelUp } from "./inventory.services";

export function registerInventoryRoutes(app: Express) {
    app.get(
        "/user/inventory",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user = req?.user as WithId<SimpleUser>;

            const inventory = await Inventory.findOne({
                user_id: user._id,
            });

            if (!inventory) {
                return res.status(404).json({message: "Inventory not found"});
            }

            // get the user inventory items id's and get the items from the shop
            const items = await Shops.find({
                _id: { $in: inventory.items.map((item) => item.item_id) },
            }).toArray();

            return res.json({items});
        }
    );

    app.post(
        "/user/inventory/level-up",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user: WithId<SimpleUser> | null = req.user as WithId<SimpleUser>;

            const { row_id } = req.body;

            const inventory = await Inventory.findOne({ user_id: user._id });

            if (!inventory) {
                return res.status(404).json({ message: "Inventory not found" });
            }

            const item = inventory.items.find(
                (item) => item.row_id.toString() === row_id
            );

            if (!item) {
                return res.status(404).json({ message: "Item not found" });
            }

            await onItemLevelUp(user._id, row_id);

            return res.json({ message: "Item level up successful" });
        }
    );
}
