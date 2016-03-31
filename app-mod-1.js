
module.exports = (ctx) => {

    /*  example 1: REST-only, HTTP redirect  */
    ctx.server.route({
        method: "GET",
        path: "/",
        handler: (request, reply) => {
            reply.redirect("ui/")
        }
    })

}

