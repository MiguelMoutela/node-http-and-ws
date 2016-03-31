
module.exports = (ctx) => {

    /*  example 6: WebSocket/REST combined, regular response  */
    ctx.server.route({
        method: "POST",
        path: "/sv/ws1",
        config: {
            payload: { output: "data", parse: true, allow: "application/json" },
            plugins: { websocket: true }
        },
        handler: (request, reply) => {
            reply({
                echo: request.payload
            })
        }
    })

}

