import { AuthRegisterBody, SimpleUser } from "@/types/auth.types";
import { Users } from "@/db/models/User";
import { Inventory } from "@/db/models/Inventory";
import crypto from "crypto";
import { WithId } from "mongodb";

export async function register(body: AuthRegisterBody) {
    const alreadyExist = await Users.findOne({ username: body.username });
    if (alreadyExist) {
        return { success: false, message: "User already exists" };
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(body.password)
        .digest("hex");
    const token = crypto.randomBytes(32).toString("hex");

    const user = await Users.insertOne({
        username: body.username,
        password: hashedPassword,
        token: token.toString(),
        createdAt: new Date(),
        money: 100,
        slots_number: 10,
        used_slots: 0,
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        last_daily: 0,
    });

    await Inventory.insertOne({
        user_id: user.insertedId,
        items_id: [],
    });

    return { success: true, token };
}

export async function login(body: AuthRegisterBody) {
    const user = await Users.findOne({ username: body.username });
    if (!user) {
        return { success: false, message: "Bad password" };
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(body.password)
        .digest("hex");
    if (user.password !== hashedPassword) {
        return { success: false, message: "Bad password" };
    }

    const token = crypto.randomBytes(32).toString("hex");
    await Users.updateOne({ _id: user._id }, { $set: { token } });

    return { success: true, token };
}

export function findByToken(token: string): Promise<WithId<SimpleUser> | null> {
    return Users.findOne<WithId<SimpleUser>>(
        { token },
        { projection: { password: 0, token: 0 } }
    );
}

export async function findByReqHeaderToken(req: any) {
    const user: WithId<SimpleUser> | null = await findByToken(
        req.headers.token as string
    );
    if (!user) {
        return null;
    }

    return user;
}

export async function updateUserAfterBuy(user: WithId<SimpleUser>, item: any) {
    // Check if user has enough money
    if (user.money < item.price) {
        return { message: "Not enough money" };
    }

    await Users.updateOne(
        { _id: user._id },
        {
            $set: {
                used_slots: user.used_slots + 1,
                money: user.money - item.price,
            },
        }
    );

    return { message: "Item bought successfully" };
}

export async function updateUserXP(user: WithId<SimpleUser>, xp: number) {
    if (user.xp + xp >= user.xp_to_next_level) {
        const newUser = await Users.findOneAndUpdate(
            { _id: user._id },
            {
                $set: {
                    xp: user.xp + xp - user.xp_to_next_level,
                    level: user.level + 1,
                    xp_to_next_level: user.xp_to_next_level * 1.5,
                },
            }
        );

        return newUser;
    } else {
        const newUser = await Users.findOneAndUpdate(
            { _id: user._id },
            {
                $set: {
                    xp: user.xp + xp,
                },
            }
        );

        return newUser;
    }
}

// export async function daily(user: WithId<SimpleUser>) {
//     const now = Date.now();
//     const diff = now - user.last_daily;
//     const diffInHours = diff / 1000 / 60 / 60;

//     if (diffInHours < 24) {
//         return { message: "You already claimed your daily reward" };
//     }

//     await Users.updateOne(
//         { _id: user._id },
//         { $set: { money: user.money + 100, last_daily: now } }
//     );

//     return { message: "Daily reward claimed" };
// }

export async function updateUserSlots(user: WithId<SimpleUser>, xp: number) {
    if (user.xp + xp >= user.xp_to_next_level) {
        await Users.updateOne(
            { _id: user._id },
            { $set: { slots_number: user.slots_number + 5 } }
        );
    }

    return { message: "Slots updated" };
}
