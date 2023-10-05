import { AuthRegisterBody } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import { buyShopItem, getAllShopItems } from "./shop.services";
import { requireLogin } from "@/modules/auth/auth.middleware";
import { ObjectId } from "mongodb";
import { Shops } from "@/db/models/Shop";

export function registerShopRoutes(app: Express) {
    // on enregistre une route /auth/register
    // TypeParams, TypeQuery, TypeBody
    app.get(
        "/shop",
        async (
            _req: Request<unknown, unknown, AuthRegisterBody>,
            res: Response
        ) => {
            // on call le service auth.register
            const result = await getAllShopItems();

            // on reponds a la requete http avec le result
            res.json(result);
        }
    );

    app.post("/shop/buy-item", requireLogin, async (req, res) => {
        const result = await buyShopItem(req);

        res.json(result);
    });

    app.get(
        "/shop/item/:item_id",
        requireLogin,
        async (req: Request, res: Response) => {
            const { item_id } = req.params;

            const item = await Shops.findOne({
                _id: new ObjectId(item_id),
            });

            return res.json({ ...item });
        }
    );
}
