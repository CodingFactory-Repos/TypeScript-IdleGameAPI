import { db } from "../mongo";
import {Shop} from "@/types/shop.types";

export const Shops = db!.collection<Shop>('shop')
