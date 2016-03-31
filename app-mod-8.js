
module.exports = (ctx) => {

    /*  example 8: WebSocket/REST combined, full connection control  */
    ctx.server.route({
        method: "POST",
        path: "/sv/ws3",
        config: {
            payload: { output: "data", parse: true, allow: "application/json" },
            plugins: {
                websocket: {
                    connect: () => {
                        ctx.verbose(3, `-- WebSockets: /sv/ws3 connect`)
                    },
                    disconnect: () => {
                        ctx.verbose(3, `-- WebSockets: /sv/ws3 disconnect`)
                    },
                    only: true
                }
            }
        },
        handler: (request, reply) => {
            ctx.verbose(3, `-- WebSockets: /sv/ws3 message`)
            reply({
                request: request.payload
            })
        }
    })

}

