module.exports = function(options) {

    async function start(dependencies) {
        return {
            logger: {
                level: 'warn'
            },
            mongo: {
                primary: {
                    url: 'mongo://primary'
                },
                secondary: {
                    url: 'mongo://secondary'
                }
            }
        }
    }

    return {
        start: start
    }
}
