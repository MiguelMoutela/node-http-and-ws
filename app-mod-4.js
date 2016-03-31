
module.exports = (ctx) => {

    /*  example 4: REST-only, unprotected resource  */
    ctx.server.route({
        method: "GET",
        path: "/sv/unprotected",
        handler: (request, reply) => {
            reply({
                foo: 42
            })
        }
    })

}

