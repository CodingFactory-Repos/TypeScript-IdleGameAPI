export interface AuthRegisterBody {
    username: string
    password: string
}

export interface User {
    username: string
    password: string
    token: string
    createdAt: Date
}

export interface SimpleUser {
    username: string
    createdAt: Date
}

export interface AuthUserToken {
    token: string
}
