export interface Shop {
    name: string
    image: string
    price: number
    generate_per_seconds: number
    eur_to: string
    slots: number
    price_in_crypto?: number
    generate_per_seconds_in_crypto?: number
}
