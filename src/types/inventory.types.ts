import { ObjectId } from "mongodb";

export interface InventoryType {
    user_id: ObjectId;
    items: {
        row_id: ObjectId;
        last_reward: Date;
        item_id: ObjectId;
        level: number;
    }[];
}
