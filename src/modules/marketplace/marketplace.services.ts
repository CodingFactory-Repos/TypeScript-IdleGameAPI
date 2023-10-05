import {Marketplaces} from "@/db/models/Marketplace";
import {ReturnedMarketplace, Marketplace} from "@/types/marketplace.types";
import {SimpleUser} from "@/types/auth.types";
import {
    updateUserAfterBuy,
} from "@/modules/auth/auth.services";
import {ObjectId, WithId} from "mongodb";
import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";
import {Inventory} from "@/db/models/Inventory";
import {InventoryType} from "@/types/inventory.types";
import {addItemToInventory} from "../inventory/inventory.services";
import {getCryptoPrice} from "@/modules/shop/shop.services";
import {buyItem, Shop} from "@/types/shop.types";
import {Shops} from "@/db/models/Shop";

/**
 * Get all marketplace items
 */
export async function getAllMarketplaceItems(): Promise<ReturnedMarketplace[]> {
    let allItems: Promise<Marketplace[]> = Marketplaces.find().toArray();

    // Get the first item to get the currency to convert (eur_to)
    const firstItem = await allItems.then((items: Marketplace[]) => {
        return items[0].eur_to;
    });

    const btcPrice = await getCryptoPrice(firstItem);

    // Add new field to each item with actual price in BTC and convert to ReturnedMarketplace
    return await allItems.then((items: Marketplace[]) => {
        return items.map((item: Marketplace) => {
            return {
                ...item,
                price_in_crypto: item.price / btcPrice,
                generate_per_seconds_in_crypto:
                    item.generate_per_seconds / btcPrice,
            };
        });
    });
}

/**
 * Buy an item from the marketplace
 *
 * @param req
 */
export async function buyMarketplaceItem(
    req: Request<{}, any, any, ParsedQs, Record<string, any>>
): Promise<any> {
    // Get user from token
    const user: WithId<SimpleUser> = req.user as WithId<SimpleUser>;
    const body: buyItem = req.body;

    // Get item from id
    const item = await Marketplaces.findOne<Marketplace>({_id: new ObjectId(body.id)});

    // Get user inventory and add item
    const inventory = await Inventory.findOne<InventoryType>({
        user_id: user._id,
    });
    if (!inventory) {
        return {message: "Inventory not found"};
    }

    if (item) {
        // Check if user has enough slots
        if (inventory?.items?.length >= user.slots_number) {
            return {message: "Not enough slots"};
        }

        // Update user slots, money
        await updateUserAfterBuy(user, item);

        // Update user XP
        // await updateUserXP(user, item.xp || 0);

        // Update user slots
        // await updateUserSlots(user, item.xp || 0);

        // Add item to user inventory
        await addItemToInventory(req);

        return {message: "Item bought"};
    } else {
        return {message: "Item not found"};
    }
}

export async function sellMarketplaceItem(
    req: Request<{}, any, any, ParsedQs, Record<string, any>>
): Promise<any> {
    // Get user from token
    const user: WithId<SimpleUser> = req.user as WithId<SimpleUser>;
    const body: buyItem = req.body;

    // Get item from id
    const item = await Marketplaces.findOne<Marketplace>({_id: new ObjectId(body.id)});

    // Get user inventory and check if item exists in inventory
    const inventory = await Inventory.findOne<InventoryType>({
        user_id: user._id,
    });
    if (!inventory) {
        return {message: "Inventory not found"};
    }

    if (item) {
        // Check if item exists in inventory
        const itemExists = inventory.items.find((item) => {
            return item.item_id.toString() === body.id;
        });
        if (!itemExists) {
            return {message: "Item not found in inventory"};
        }

        // Update user slots, money
        await updateUserAfterBuy(user, item, "sell");

        // Update user XP
        // await updateUserXP(user, item.xp);

        // Update user slots
        // await updateUserSlots(user, undefined, "sell");

        // Add item to marketplace
        await addItemToMarketplace(req);

        // Remove item from user inventory
        await addItemToInventory(req, "remove");

        return {message: "Item sold"};
    }
}

export async function addItemToMarketplace(
    req: Request<{}, any, any, ParsedQs, Record<string, any>>
): Promise<any> {
    const body = req.body;
    const user: WithId<SimpleUser> = req.user as WithId<SimpleUser>;

    // Get item from id in Shop
    const item = await Shops.findOne<Shop>({_id: new ObjectId(body.id)});
    let itemStatsFromInventory: InventoryType | null = await Inventory.findOne<InventoryType>({
        user_id: user._id,
    });
    if (!itemStatsFromInventory) {
        return {message: "Inventory not found"};
    }

    // Get item from Inventory and get level of item
    const itemStats = itemStatsFromInventory.items.find((item) => {
        return item.item_id.toString() === body.id;
    });
    if (!itemStats) {
        return {message: "Item not found in inventory"};
    }

    if (item) {
        // Add item to marketplace
        await Marketplaces.insertOne({
            name: item.name,
            image: item.image,
            price: body.price,
            eur_to: item.eur_to,
            generate_per_seconds: (item.generate_per_seconds + (itemStats.level - 1) * 0.1 * item.generate_per_seconds),
            level: itemStats.level,
            selledBy: new ObjectId(user._id),
        });

        return true;
    }
}
