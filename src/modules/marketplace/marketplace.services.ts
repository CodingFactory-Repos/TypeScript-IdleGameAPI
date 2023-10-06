import {Marketplaces} from "@/db/models/Marketplace";
import {Marketplace, ReturnedMarketplace} from "@/types/marketplace.types";
import {SimpleUser} from "@/types/auth.types";
import {updateUserAfterBuy,} from "@/modules/auth/auth.services";
import {ObjectId, WithId} from "mongodb";
import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";
import {Inventory} from "@/db/models/Inventory";
import {InventoryType} from "@/types/inventory.types";
import {addItemToInventory} from "../inventory/inventory.services";
import {getCryptoPrice} from "@/modules/shop/shop.services";
import {buyItem, Shop} from "@/types/shop.types";
import {Shops} from "@/db/models/Shop";
import {Users} from "@/db/models/User";

/**
 * Get all marketplace items
 */
export async function getAllMarketplaceItems(): Promise<ReturnedMarketplace[]> {
    let allItems: Promise<Marketplace[]> = Marketplaces.find().toArray();

    try {
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
    } catch (e) {
        return [];
    }
}

async function refundItemToSeller(req: any) {
    const body = req.body;

    // Get item from id in Shop
    const item = await Marketplaces.findOne<Marketplace>({_id: new ObjectId(body.id)});
    if (!item) {
        return {message: "Item not found"};
    }

    // Convert body.price to number and if it's not a number, return error
    if (isNaN(Number(item.price))) {
        return {message: "Price is not a number"};
    } else {
        item.price = Number(item.price);
    }

    const seller: SimpleUser | null = await Users.findOne<SimpleUser>({
        _id: new ObjectId(item.selledBy),
    });

    if (item) {
        // Update seller money
        await Users.findOneAndUpdate(
            {_id: new ObjectId(item.selledBy)},
            {
                $set: {
                    money: (seller?.money || 0) + item.price,
                }
            }
        );

        return true;
    }

    return false;
}

async function removeItemFromMarketplace(req: any) {
    const body = req.body;

    // Get item from id in Shop
    const item = await Marketplaces.findOne<Marketplace>({_id: new ObjectId(body.id)});
    if (!item) {
        return {message: "Item not found"};
    }

    // Convert body.price to number and if it's not a number, return error
    if (isNaN(Number(item.price))) {
        return {message: "Price is not a number"};
    } else {
        item.price = Number(item.price);
    }

    if (item) {
        // Remove item from marketplace
        await Marketplaces.deleteOne({
            _id: new ObjectId(body.id),
        });


        return true;
    }

    return false;
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
    const itemDataFromShop = await Shops.findOne<Shop>({_id: new ObjectId(item?.itemShopId)});

    // Get user inventory and add item
    const inventory = await Inventory.findOne<InventoryType>({
        user_id: user._id,
    });
    if (!inventory) {
        return {message: "Inventory not found"};
    }

    if (!itemDataFromShop) {
        return {message: "Item not found in shop"};
    }

    if (item) {
        // Check if user has enough slots
        if (inventory?.items?.length >= user.slots_number) {
            return {message: "Not enough slots"};
        }

        // Update user slots, money
        await updateUserAfterBuy(user, itemDataFromShop, "buy", item.price);

        // Update user XP
        // await updateUserXP(user, item.xp || 0);

        // Update user slots
        // await updateUserSlots(user, item.xp || 0);

        await refundItemToSeller(req)
            .then((e) => {
                console.log(e);
            });

        await addItemToInventory(req, "add", "marketplace").then((e) => {
            console.log(e);
        });

        await removeItemFromMarketplace(req).then((e) => {
            console.log(e);
        });

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
    const item = await Shops.findOne<Shop>({_id: new ObjectId(body.id)});

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
        await updateUserAfterBuy(user, item, "sell").then((e) => {
            console.log(e);
        });

        // Add item to marketplace
        await addItemToMarketplace(req).then((e) => {
            console.log(e);
        });

        // Remove item from user inventory
        await addItemToInventory(req, "remove").then((e) => {
            console.log(e);
        });

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

    // Convert body.price to number and if it's not a number, return error
    if (isNaN(Number(body.price))) {
        return {message: "Price is not a number"};
    } else {
        body.price = Number(body.price);
    }

    if (item) {
        // Add item to marketplace
        await Marketplaces.insertOne({
            name: item.name,
            image: item.image,
            price: body.price,
            eur_to: item.eur_to,
            generate_per_seconds: item.generate_per_seconds,
            level: itemStats.level,
            selledBy: new ObjectId(user._id),
            itemShopId: new ObjectId(body.id)
        });

        return true;
    }
}
