export type APIUser = {
    first_name: string
    last_name: string
    email: string
    mobile: string
    phone: string
    street: string
    state: string
    town: string
    country: number
    postcode: string
    latitude: number
    longitude: number
    date_created: string
    timezone: string
};

export type DumbUser = {
    id: number
    first_name: string | null
    last_name: string
    email: string
    url: string
}

