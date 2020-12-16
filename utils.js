const Chance = require('chance')

const randomName = () => new Chance().first()

const isFunction = (func) => (func && typeof func === "function")

const arraysIntersection = (...arrays) => {
    const verifiedArrays = arrays.filter(value => Array.isArray(value))
    if (arrays.length === 0) return arrays;
    return verifiedArrays.reduce((acc, currentArray) => {
        currentArray.forEach(currentValue => {
            if (acc.indexOf(currentValue) === -1) {
                if (verifiedArrays.filter((obj) => obj.indexOf(currentValue) === -1).length === 0) {
                    acc.push(currentValue);
                }
            }
        })
        return acc;
    }, [])
}

const hasProp = (obj, key) => {
    if(obj.hasOwnProperty(key)) return true; // Some properties with '.' could fail, so we do a quick check
    const keyParts = key.split('.');
    return !!obj && (
        keyParts.length > 1
            ? hasProp(obj[key.split('.')[0]], keyParts.slice(1).join('.'))
            : obj.hasOwnProperty(key)
    );
};

const getProp = (obj, key) => {
    if(!!obj && obj.hasOwnProperty(key)) return obj[key]; // Some properties with '.' could fail, so we do a quick check
    if(key.includes('.')){
        const keyParts = key.split('.')
        return getProp(obj[keyParts[0]], keyParts.slice(1).join('.'))
    }
}

const setProp = (obj, key, value) => {
    if(!key.includes('.')) {
        obj[key] = value
        return;
    }
    const keyParts = key.split('.')
    if(!obj[keyParts[0]]) obj[keyParts[0]] = {}
    setProp(obj[keyParts[0]], keyParts.slice(1).join('.'), value)
}

module.exports = {
    randomName,
    isFunction,
    arraysIntersection,
    hasProp,
    getProp,
    setProp
}
