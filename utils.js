const isFunction = (func) => (func && typeof func === "function")

const arraysIntersection = (...arrays) => {
    const verifiedArrays = arrays.filter(value => Array.isArray(value))
    if(arrays.length === 0) return arrays;
    return verifiedArrays.reduce((acc, currentArray) => {
            currentArray.forEach(currentValue => {
                if(acc.indexOf(currentValue) === -1) {
                    if(verifiedArrays.filter((obj) => obj.indexOf(currentValue) === -1 ).length === 0) {
                        acc.push(currentValue);
                    }
                }
            })
        return acc;
        }, [])
}

module.exports = {
    isFunction,
    arraysIntersection
}
