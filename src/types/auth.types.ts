export interface AuthRegisterBody {
    username: string;
    password: string;
}

export interface SimpleUser {
    username: string;
    createdAt: Date;
    money: number;
    slots_number: number;
    used_slots: number;
    level: number;
    xp: number;
    xp_to_next_level: number;
    last_daily: number;
    hasTenBTC: boolean;
    hasGraphicsCard: boolean;

}

export interface User extends SimpleUser, AuthUserToken {
    password: string;
}

export interface AuthUserToken {
    token: string;
}
