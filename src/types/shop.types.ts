import {AuthUserToken} from "@/types/auth.types";
import {Condition, ObjectId} from "mongodb";

export interface Shop {
    name: string
    image: string
    price: number
    generate_per_seconds: number
    eur_to: string
    slots: number
}

export interface ReturnedShop extends Shop {
    price_in_crypto: number
    generate_per_seconds_in_crypto: number
}

export interface buyItem extends AuthUserToken {
    id: Condition<ObjectId>
}
