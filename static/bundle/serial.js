// THIS MIGHT BE SLOW
// If it is, consider using a serialization library

export const serialize = (obj) => {
    return JSON.stringify(obj);
}

export const deserialize = (data) => {
    return JSON.parse(data)
}