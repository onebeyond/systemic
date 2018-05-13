module.exports = function(options) {

    function start(dependencies, cb) {
        return cb(null, {
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
        })
    }

    return {
        start: start
    }
}
