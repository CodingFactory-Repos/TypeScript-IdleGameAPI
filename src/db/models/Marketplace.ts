import { db } from "../mongo";
import {Marketplace} from "@/types/marketplace.types";

export const Marketplaces = db!.collection<Marketplace>('marketplace')
