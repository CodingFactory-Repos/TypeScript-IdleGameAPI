import { Shops } from "@/db/models/Shop";
import { buyItem, ReturnedShop, Shop } from "@/types/shop.types";
import axios, { AxiosResponse } from "axios";
import { SimpleUser } from "@/types/auth.types";
import {
    updateUserAfterBuy,
    updateUserSlots,
    updateUserXP,
} from "@/modules/auth/auth.services";
import { ObjectId, WithId } from "mongodb";
import { Request } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { Inventory } from "@/db/models/Inventory";
import { InventoryType } from "@/types/inventory.types";
import { addItemToInventory } from "../inventory/inventory.services";

export async function getAllShopItems(): Promise<ReturnedShop[]> {
    let allItems: Promise<Shop[]> = Shops.find().toArray();

    // Get the first item to get the currency to convert (eur_to)
    const firstItem = await allItems.then((items: Shop[]) => {
        return items[0].eur_to;
    });

    const btcPrice = await getCryptoPrice(firstItem);

    // Add new field to each item with actual price in BTC and convert to ReturnedShop
    return await allItems.then((items: Shop[]) => {
        return items.map((item: Shop) => {
            return {
                ...item,
                price_in_crypto: item.price / btcPrice,
                generate_per_seconds_in_crypto:
                    item.generate_per_seconds / btcPrice,
            };
        });
    });
}

export async function getCryptoPrice(crypto: string): Promise<number> {
    return await axios
        .get(
            `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${crypto}&tsyms=EUR`
        )
        .then((response: AxiosResponse<any>) => {
            return response.data[crypto].EUR;
        });
}

export async function buyShopItem(
    req: Request<{}, any, any, ParsedQs, Record<string, any>>
): Promise<any> {
    // Get user from token
    const user: WithId<SimpleUser> = req.user as WithId<SimpleUser>;
    const body: buyItem = req.body;

    // Get item from id
    const item = await Shops.findOne<Shop>({ _id: new ObjectId(body.id) });

    // Get user inventory and add item
    const inventory = await Inventory.findOne<InventoryType>({
        user_id: user._id,
    });
    if (!inventory) {
        return { message: "Inventory not found" };
    }

    if (item) {
        // Check if user has enough slots
        if (inventory?.items?.length + 1 >= user.slots_number) {
            return { message: "Not enough slots" };
        }

        if (user.money < item.price) {
            return { message: "Not enough money" };
        }

        // Update user slots, money
        await updateUserAfterBuy(user, item);

        // Update user XP
        await updateUserXP(user, item.xp || 0);

        // Update user slots
        await updateUserSlots(user, item.xp || 0);

        // Add item to user inventory
        await addItemToInventory(req);

        return { message: "Item bought" };
    } else {
        return { message: "Item not found" };
    }
}
