import { SimpleUser } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import { WithId } from "mongodb";
import { requireLogin } from "../auth/auth.middleware";
import { Inventory } from "@/db/models/Inventory";
import { getItemsFarm, levelUpItem } from "./inventory.services";

export function registerInventoryRoutes(app: Express) {
    app.get(
        "/user/inventory",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user: WithId<SimpleUser> | null =
                req.user as WithId<SimpleUser>;

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const inventory = await Inventory.findOne({
                user_id: user._id,
            });

            if (!inventory) {
                return res.status(404).json({ message: "Inventory not found" });
            }

            return res.json({ ...inventory });
        }
    );

    app.get(
        "user/item-reward",
        requireLogin,
        async (req: Request, res: Response) => {
            const user: WithId<SimpleUser> | null =
                req.user as WithId<SimpleUser>;

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { row_id, item_id } = req.body;

            await getItemsFarm(req, item_id, row_id);

            return res.json({ message: "Item reward successful" });
        }
    );

    app.post(
        "/inventory/item-level-up",
        requireLogin,
        async (req: Request, res: Response) => {
            // get the header token
            const user: WithId<SimpleUser> | null =
                req.user as WithId<SimpleUser>;

            const { row_id, item_id } = req.body;

            const levelUp = await levelUpItem(user._id, item_id, row_id)
                .then((result) => {
                    return res.json({ message: result.message });
                })
                .catch((err) => {
                    return res.status(500).json({ message: err });
                });

            return levelUp;
        }
    );
}
