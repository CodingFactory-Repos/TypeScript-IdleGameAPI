import { ObjectId } from "mongodb";

export interface InventoryType {
    user_id: ObjectId;
    items_id: ObjectId[];
}
