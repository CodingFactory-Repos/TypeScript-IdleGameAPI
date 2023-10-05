import { AuthUserToken } from "@/types/auth.types";

export interface Shop {
    name: string;
    image: string;
    price: number;
    generate_per_seconds: number;
    eur_to: string;
    slots: number;
    xp: number;
}

export interface ReturnedShop extends Shop {
    price_in_crypto: number;
    generate_per_seconds_in_crypto: number;
}

export interface buyItem extends AuthUserToken {
    id: string;
}
