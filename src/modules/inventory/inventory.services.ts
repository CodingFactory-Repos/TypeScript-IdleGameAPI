import { Inventory } from "@/db/models/Inventory";
import { Shops } from "@/db/models/Shop";
import { SimpleUser } from "@/types/auth.types";
import { InventoryType } from "@/types/inventory.types";
import { buyItem } from "@/types/shop.types";
import { Request } from "express";
import { ObjectId, WithId } from "mongodb";
import { findByReqHeaderToken } from "../auth/auth.services";

export async function addItemToInventory(
    req: Request
): Promise<InventoryType | null | { message: string }> {
    const user: WithId<SimpleUser> | null = await findByReqHeaderToken(req);
    if (!user) {
        return { message: "Unauthorized" };
    }
    const { id } = req.body as buyItem;
    const inventory = await Inventory.findOne({
        user_id: user._id,
    });

    if (!inventory) {
        return null;
    }

    const item = await Shops.findOne({
        _id: new ObjectId(id),
    });

    if (!item) {
        return null;
    }

    const newInventory = await Inventory.findOneAndUpdate(
        { user_id: user._id },
        { $push: { items_id: item._id } }
    );

    return newInventory;
}
