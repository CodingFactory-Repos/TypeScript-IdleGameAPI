import {ObjectId} from "mongodb";

export interface Marketplace {
    name: string;
    image: string;
    price: number;
    generate_per_seconds: number;
    eur_to: string;
    level: number;
    selledBy: ObjectId;
}

export interface ReturnedMarketplace extends Marketplace {
    price_in_crypto: number;
    generate_per_seconds_in_crypto: number;
}
