import {AuthRegisterBody, SimpleUser} from "@/types/auth.types";
import {Users} from "@/db/models/User";
import {Inventory} from "@/db/models/Inventory";
import crypto from "crypto";
import {Marketplace} from "@/types/marketplace.types";
import { WithId } from "mongodb";
import { getAllShopItems, getCryptoPrice } from "../shop/shop.services";
import { Shop } from "@/types/shop.types";

export async function register(body: AuthRegisterBody) {
    const alreadyExist = await Users.findOne({username: body.username});
    if (alreadyExist) {
        return {success: false, message: "User already exists"};
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(body.password)
        .digest("hex");
    const token = crypto.randomBytes(32).toString("hex");

    // get the item with the lowest price
    const items = await getAllShopItems();
    const lowestPriceItem = items.reduce((prev, current) =>
        prev.price < current.price ? prev : current
    );

    // get the crypto price of the lowest price item
    const cryptoPrice = await getCryptoPrice(lowestPriceItem.eur_to);

    const user = await Users.insertOne({
        username: body.username,
        password: hashedPassword,
        token: token.toString(),
        createdAt: new Date(),
        money: (lowestPriceItem.price * 1.2) / cryptoPrice,
        slots_number: 10,
        used_slots: 0,
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        last_daily: 0,
        hasTenBTC: false,
        hasGraphicsCard: false

    });

    await Inventory.insertOne({
        user_id: user.insertedId,
        items: [],
    });

    return {success: true, token};
}

export async function login(body: AuthRegisterBody) {
    const user = await Users.findOne({username: body.username});
    if (!user) {
        return {success: false, message: "Bad password"};
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(body.password)
        .digest("hex");
    if (user.password !== hashedPassword) {
        return {success: false, message: "Bad password"};
    }

    const token = crypto.randomBytes(32).toString("hex");
    await Users.updateOne({_id: user._id}, {$set: {token}});

    return {success: true, token};
}

export function findByToken(token: string): Promise<WithId<SimpleUser> | null> {
    return Users.findOne<WithId<SimpleUser>>(
        {token},
        {projection: {password: 0, token: 0}}
    );
}

export async function updateUserAfterBuy(user: WithId<SimpleUser>, item: Shop | Marketplace, action: "buy" | "sell" = "buy", itemPrice: number | undefined = undefined) {
    const cryptoPrice = await getCryptoPrice(item.eur_to);
    const ItemPriceInCrypto = (itemPrice ? itemPrice : item.price) / cryptoPrice;

    if (action === "buy") {
        // Check if user has enough money
        if (user.money < ItemPriceInCrypto) {
            return {message: "Not enough money"};
        }

        await Users.updateOne(
            {_id: user._id},
            {
                $set: {
                    used_slots: user.used_slots + 1,
                    money: user.money - ItemPriceInCrypto,
                },
            }
        );
    } else if (action === "sell") {
        await Users.updateOne(
            {_id: user._id},
            {
                $set: {
                    used_slots: user.used_slots - 1,
                },
            }
        );
    } else {
        return {message: "Action not found"};
    }

    return {message: "Item as been " + action + " successful"};
}

export async function updateUserXP(user: WithId<SimpleUser>, xp: number) {
    if (user.xp + xp >= user.xp_to_next_level) {
        return await Users.findOneAndUpdate(
            {_id: user._id},
            {
                $set: {
                    xp: user.xp + xp - user.xp_to_next_level,
                    level: user.level + 1,
                    xp_to_next_level: user.xp_to_next_level * 1.5,
                },
            }
        );
    } else {
        return await Users.findOneAndUpdate(
            {_id: user._id},
            {
                $set: {
                    xp: user.xp + xp,
                },
            }
        );
    }
}

// export async function daily(user: WithId<SimpleUser>) {
//     const now = Date.now();
//     const diff = now - user.last_daily;
//     const diffInHours = diff / 1000 / 60 / 60;

//     if (diffInHours < 24) {
//         return { message: "You already claimed your daily reward" };
//     }

//     await Users.updateOne(
//         { _id: user._id },
//         { $set: { money: user.money + 100, last_daily: now } }
//     );

//     return { message: "Daily reward claimed" };
// }

export async function updateUserSlots(user: WithId<SimpleUser>, xp: number, action: "buy" | "sell" = "buy") {
    if (user.xp + xp >= user.xp_to_next_level) {
        if (action == "buy") {
            await Users.updateOne(
                {_id: user._id},
                {$set: {slots_number: user.slots_number + 5}}
            );
        } else if (action == "sell") {
            await Users.updateOne(
                {_id: user._id},
                {$set: {slots_number: user.slots_number - 5}}
            );
        } else {
            return {message: "Action not found"};
        }
    }

    return {message: "Slots updated"};
}
