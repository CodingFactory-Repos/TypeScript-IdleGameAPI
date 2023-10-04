import {Shops} from "@/db/models/Shop";
import {buyItem, ReturnedShop, Shop} from "@/types/shop.types";
import axios, {AxiosResponse} from "axios";
import {SimpleUser} from "@/types/auth.types";
import {findByToken} from "@/modules/auth/auth.services";
import {ObjectId, WithId} from "mongodb";

export async function getAllShopItems(): Promise<ReturnedShop[]> {
    let allItems: Promise<Shop[]> = Shops.find().toArray();

    // Get the first item to get the currency to convert (eur_to)
    const firstItem = await allItems.then((items: Shop[]) => {
        return items[0].eur_to;
    });

    const btcPrice = await axios.get(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${firstItem}&tsyms=EUR`)
        .then((response: AxiosResponse<any>) => {
            return response.data.BTC.EUR;
        });

    // Add new field to each item with actual price in BTC and convert to ReturnedShop
    return await allItems.then((items: Shop[]) => {
        return items.map((item: Shop) => {
            return {
                ...item,
                price_in_crypto: item.price / btcPrice,
                generate_per_seconds_in_crypto: item.generate_per_seconds / btcPrice,
            }
        });
    });
}

export async function buyShopItem(body: buyItem) {
    // Get user from token
    const user: WithId<SimpleUser> | null = await findByToken(body.token);
    if (!user) {
        return false;
    }

    // Get item from id
    const item = await Shops.findOne<Shop>({ _id: new ObjectId(body.id) });

    // Check if user has enough money
    return [item, user];
}
