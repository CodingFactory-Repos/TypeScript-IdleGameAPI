import { Inventory } from "@/db/models/Inventory";
import { Shops } from "@/db/models/Shop";
import { Users } from "@/db/models/User";
import { SimpleUser } from "@/types/auth.types";
import { InventoryType } from "@/types/inventory.types";
import { Request } from "express";
import { ObjectId, UpdateResult, WithId } from "mongodb";
import { updateUserXP } from "../auth/auth.services";
import { Marketplaces } from "@/db/models/Marketplace";
import { Marketplace } from "@/types/marketplace.types";
import { getCryptoPrice } from "../shop/shop.services";

export async function getAllInventoryItems(user: WithId<SimpleUser>) {
    const inventory = await Inventory.findOne({
        user_id: user._id,
    });

    if (!inventory) {
        return [];
    }

    const shop_item_info = await Shops.find().toArray();

    const items = inventory.items.map(async (item) => {
        const shopItem = shop_item_info.find(
            (shopItem) => shopItem._id.toString() === item.item_id.toString()
        );

        if (!shopItem) {
            return null;
        }

        const multiplier_money = (item.level + 1) / 10 + 1;
        const price_in_crypto = await getCryptoPrice(shopItem.eur_to || "BTC");

        return {
            inventory_data: {
                ...item,
                upgrade_price: (
                    (shopItem.price / price_in_crypto) *
                    multiplier_money
                ).toFixed(8),
            },
            shop_data: shopItem,
        };
    });

    return Promise.all(items);
}
export async function addItemToInventory(
    req: Request,
    action: "add" | "remove" = "add"
): Promise<
    InventoryType | null | UpdateResult<InventoryType> | { message: string }
> {
    const user = req.user as WithId<SimpleUser>;
    if (!user) {
        return { message: "Unauthorized" };
    }
    const { id } = req.body;
    const inventory = await Inventory.findOne({
        user_id: user._id,
    });

    if (!inventory) {
        return null;
    }

    const item = await Marketplaces.findOne<Marketplace>({
        _id: new ObjectId(id.id),
    });
    if (!item) {
        return { message: "Item not found" };
    }

    let newInventory: UpdateResult<InventoryType> | InventoryType | null = null;
    if (action === "add") {
        newInventory = await Inventory.findOneAndUpdate(
            { user_id: user._id },
            {
                $push: {
                    items: {
                        row_id: new ObjectId(),
                        item_id: item.itemShopId,
                        level: 1,
                        last_reward: new Date(),
                    },
                },
            }
        );
    } else if (action === "remove") {
        // Remove only one item from the inventory
        const actualInventory = inventory.items;

        const itemToRemove = actualInventory.find(
            (item) => item.item_id.toString() === id
        );

        if (!itemToRemove) {
            return null;
        }

        const index = actualInventory.indexOf(itemToRemove);

        actualInventory.splice(index, 1);

        newInventory = await Inventory.updateOne(
            { user_id: user._id },
            { $set: { items: actualInventory } }
        );
    } else {
        return null;
    }

    return newInventory;
}

export async function getItemsFarm(
    user: WithId<SimpleUser>,
    item_id: ObjectId,
    row_id: ObjectId
) {
    const inventory = await Inventory.findOne({ user_id: user._id });

    if (!inventory) {
        return { message: "Inventory not found" };
    }

    const item = inventory.items.find(
        (item) =>
            item.item_id.toString() === item_id.toString() &&
            item.row_id.toString() === row_id.toString()
    );

    if (!item) {
        return { message: "Item not found" };
    }

    // get the shop item, look the last_reward and calculate the total_farmed since then and add to the user money and update the last_reward
    const shopItem = await Shops.findOne({
        _id: item.item_id,
        // row_id: item.row_id,
    });

    if (!shopItem) {
        return { message: "Shop item not found" };
    }

    const now = new Date();

    const timeDiff = now.getTime() - item.last_reward.getTime();

    const interval = 1800000;

    // 1800000
    if (timeDiff < interval) {
        return {
            message: `You can't get the reward yet, wait ${
                interval / 60000
            } minutes`,
        };
    }

    // 1hour
    const hourDiff = timeDiff / 3600000;

    const totalFarmed =
        hourDiff *
        (shopItem.generate_per_seconds +
            (item.level - 1) * 0.1 * shopItem.generate_per_seconds);

    const newMoney = user.money + totalFarmed;

    await Users.updateOne({ _id: user._id }, { $set: { money: newMoney } });

    const updatedItems = inventory.items.map((invItem) => {
        if (
            invItem.item_id.toString() === item_id.toString() &&
            invItem.row_id.toString() === row_id.toString()
        ) {
            return {
                ...invItem,
                last_reward: now,
            };
        }
        return invItem;
    });

    await Inventory.updateOne(
        { user_id: user._id },
        { $set: { items: updatedItems } }
    );

    return { message: "Inventory updated" };
}

export async function levelUpItem(
    user_id: ObjectId,
    item_id: ObjectId,
    row_id: ObjectId
) {
    const user = await Users.findOne({ _id: user_id });

    if (!user) {
        return { message: "User not found" };
    }

    const inventory = await Inventory.findOne({ user_id: user_id });

    if (!inventory) {
        return { message: "Inventory not found" };
    }

    const item = inventory.items.find(
        (item) =>
            item.item_id.toString() === item_id.toString() &&
            item.row_id.toString() === row_id.toString()
    );

    if (!item) {
        return { message: "Item not found" };
    }

    const shopItem = await Shops.findOne({ _id: item.item_id });

    if (!shopItem) {
        return { message: "Shop item not found" };
    }

    const multiplier_money = (item.level + 1) / 10 + 1;

    const newLevel = item.level + 1;

    const price_in_crypto = await getCryptoPrice(shopItem.eur_to);

    if (user.money < (shopItem.price / price_in_crypto) * multiplier_money) {
        return { message: "You don't have enough money" };
    }

    console.log((shopItem.price / price_in_crypto) * multiplier_money);

    const updatedItems = inventory.items.map((invItem) => {
        if (
            invItem.item_id.toString() === item_id.toString() &&
            invItem.row_id.toString() === row_id.toString()
        ) {
            return {
                ...invItem,
                level: newLevel,
                upgrade_price: (
                    (shopItem.price / price_in_crypto) *
                    multiplier_money
                ).toFixed(8),
            };
        }
        return invItem;
    });

    await Inventory.updateOne(
        { user_id: user_id },
        { $set: { items: updatedItems } }
    );

    await Users.updateOne(
        { _id: user_id },
        {
            $set: {
                money:
                    user.money -
                    (shopItem.price / price_in_crypto) * multiplier_money,
            },
        }
    );

    updateUserXP(user, (shopItem.xp || 0) / 2);

    return updatedItems;
}
