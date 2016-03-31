
module.exports = (ctx) => {

    /*  example 5: REST-only, protected resource  */
    ctx.server.route({
        method: "GET",
        path: "/sv/protected",
        config: {
            auth: { mode: "required", strategy: "jwt", scope: [ "bar" ] }
        },
        handler: (request, reply) => {
            reply({
                username: request.auth.credentials.username,
                scope:    request.auth.credentials.scope
            })
        }
    })

}

