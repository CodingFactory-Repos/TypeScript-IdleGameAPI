import { AuthRegisterBody } from "@/types/auth.types";
import { Express, Request, Response } from "express";
import {buyMarketplaceItem, getAllMarketplaceItems, sellMarketplaceItem} from "./marketplace.services";
import {requireLogin} from "@/modules/auth/auth.middleware";

export function registerMarketplaceRoutes(app: Express) {
    // on enregistre une route /auth/register
    // TypeParams, TypeQuery, TypeBody
    app.get(
        "/marketplace",
        async (
            _req: Request<unknown, unknown, AuthRegisterBody>,
            res: Response
        ) => {
            // on call le service auth.register
            const result = await getAllMarketplaceItems();

            // on reponds a la requete http avec le result
            res.json(result);
        }
    );

    app.post("/marketplace/buy-item", requireLogin, async (req, res) => {
        const result = await buyMarketplaceItem(req);

        res.json(result);
    });

    app.post("/marketplace/sell-item", requireLogin, async (req, res) => {
        const result = await sellMarketplaceItem(req);

        res.json(result);
    });
}
