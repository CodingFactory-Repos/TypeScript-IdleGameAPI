import { ObjectId } from "mongodb";

export interface InventoryType {
    user_id: ObjectId;
    items: {
        row_id: ObjectId;
        item_id: ObjectId;
        level: number;
        total_farmed: number;
        canLevelUp: boolean;
        level_up_cost: number;
    }[];
}
