import {Shops} from "@/db/models/Shop";
import {Shop} from "@/types/shop.types";
import axios from "axios";

export async function getAllShopItems(): Promise<Shop[]> {
    let allItems: Promise<Shop[]> = Shops.find().toArray();

    // Get the first item to get the currency to convert (eur_to)
    const firstItem = await allItems.then((items) => {
        return items[0].eur_to;
    });

    const btcPrice = await axios.get(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${firstItem}&tsyms=EUR`)
        .then((response) => {
            return response.data.BTC.EUR;
        });

    // Add new field to each item with actual price in BTC
    allItems.then((items) => {
        items.forEach((item) => {
            item.price_in_crypto = item.price / btcPrice;
            item.generate_per_seconds_in_crypto = item.generate_per_seconds / btcPrice;
        });
    });

    return allItems;
}
