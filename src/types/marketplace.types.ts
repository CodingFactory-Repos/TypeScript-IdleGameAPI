import {ObjectId} from "mongodb";

export interface Marketplace {
    name: string; // Remove later
    image: string; // Remove later
    price: number;
    generate_per_seconds: number; // Remove later
    eur_to: string; // Remove later
    level: number;
    selledBy: ObjectId;
    itemShopId: ObjectId;
}

export interface ReturnedMarketplace extends Marketplace {
    price_in_crypto: number;
    generate_per_seconds_in_crypto: number;
}
