
module.exports = (ctx) => {

    /*  example 2: REST-only, static content  */
    ctx.server.route({
        method: "GET",
        path: "/ui/{path*}",
        handler: {
            directory: {
                path:            ctx.argv.ui,
                index:           true,
                redirectToSlash: true
            }
        }
    })

}

