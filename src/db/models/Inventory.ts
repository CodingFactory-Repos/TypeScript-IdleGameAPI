import { InventoryType } from "@/types/inventory.types";
import { db } from "../mongo";

export const Inventory = db!.collection<InventoryType>("inventory");
