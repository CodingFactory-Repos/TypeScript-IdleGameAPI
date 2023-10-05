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
        {
            $push: {
                items: {
                    row_id: new ObjectId(),
                    item_id: item._id,
                    level: 1,
                    total_farmed: 0,
                    canLevelUp: false,
                    level_up_cost: item.generate_per_seconds * 10,
                },
            },
        }
    );

    return newInventory;
}

// for each item in inventory, update the total_farmed every 30 seconds
export async function updateItemFarm() {
    const user: WithId<SimpleUser> | null = await findByReqHeaderToken({
        headers: {
            token: "6ccb5e31be052c0691749bd3d97813e08742624c1037cd84f74b262d0ce9b15e",
        },
    });
    if (!user) {
        return { message: "Unauthorized" };
    }

    const user_id = user._id;

    const inventory = await Inventory.findOne({
        user_id: user_id,
    });

    if (!inventory) {
        return { message: "Inventory not found" };
    }

    if (!inventory.items) {
        return [];
    }

    const shopItems = await Shops.find({
        _id: { $in: inventory.items.map((item) => item.item_id) },
    }).toArray();

    const newItems = inventory?.items?.map((item) => {
        const shopItem = shopItems.find(
            (shopItem) => shopItem._id.toString() === item.item_id.toString()
        );
        if (!shopItem) {
            return item;
        }

        const newTotalFarmedString =
            item.total_farmed + shopItem.generate_per_seconds;

        // Check if item can level up
        let canLevelUp = false;
        if (item.level_up_cost <= newTotalFarmedString) {
            canLevelUp = true;
        }

        return {
            ...item,
            total_farmed: newTotalFarmedString,
            canLevelUp,
        };
    });

    await Inventory.updateOne(
        { user_id: user_id },
        { $set: { items: newItems } }
    );

    return { message: "Inventory updated" };
}

export async function onItemLevelUp(user_id: ObjectId, row_id: ObjectId) {
    const inventory = await Inventory.findOne({ user_id: user_id });

    if (!inventory) {
        return { message: "Inventory not found" };
    }

    const item = inventory.items.find(
        (item) => item.row_id.toString() === row_id.toString()
    );

    if (!item) {
        return { message: "Item not found" };
    }

    if (!item.canLevelUp) {
        return { message: "Item can't level up" };
    }

    const shopItem = await Shops.findOne({
        _id: item.item_id,
    });

    if (!shopItem) {
        return { message: "Shop item not found" };
    }

    const newInventory = await Inventory.findOneAndUpdate(
        {
            user_id: user_id,
            "items.row_id": row_id,
        },
        {
            $set: {
                "items.$.level": item.level + 1,
                "items.$.level_up_cost":
                    (item.level_up_cost + shopItem.generate_per_seconds) * 10,
            },
        }
    );

    return newInventory;
}

// Call updateItemFarm() every 30 seconds
setInterval(async () => {
    try {
        await updateItemFarm();
        console.log("Updated inventory");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { message: "An error occurred" };
    }
}, 10000);
