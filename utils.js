var Chance = require('chance')

function randomName() {
    return new Chance().first()
}

function isFunction(func) {
    return (func && typeof func === "function")
}

function arraysIntersection(...arrays) {
    var verifiedArrays = arrays.filter(function (value) {
        return Array.isArray(value)
    })
    if (arrays.length === 0) return arrays;
    return verifiedArrays.reduce(function (acc, currentArray) {
        currentArray.forEach(function (currentValue) {
            if (acc.indexOf(currentValue) === -1) {
                if (verifiedArrays.filter(function (obj) {
                    return obj.indexOf(currentValue) === -1
                }).length === 0) {
                    acc.push(currentValue);
                }
            }
        })
        return acc;
    }, [])
}

function hasProp(obj, key) {
    if (obj.hasOwnProperty(key)) return true; // Some properties with '.' could fail, so we do a quick check
    var keyParts = key.split('.');
    return !!obj && (
        keyParts.length > 1
            ? hasProp(obj[key.split('.')[0]], keyParts.slice(1).join('.'))
            : obj.hasOwnProperty(key)
    );
}

function getProp(obj, key) {
    if (!!obj && obj.hasOwnProperty(key)) return obj[key]; // Some properties with '.' could fail, so we do a quick check
    if (key.includes('.')) {
        var keyParts = key.split('.')
        return getProp(obj[keyParts[0]], keyParts.slice(1).join('.'))
    }
}

function setProp(obj, key, value) {
    if (!key.includes('.')) {
        obj[key] = value
        return;
    }
    var keyParts = key.split('.')
    if (!obj[keyParts[0]]) obj[keyParts[0]] = {}
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
