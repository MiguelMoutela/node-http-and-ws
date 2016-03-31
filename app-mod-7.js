
module.exports = (ctx) => {

    /*  example 7: WebSocket/REST combined, no response  */
    ctx.server.route({
        method: "POST",
        path: "/sv/ws2",
        config: {
            payload: { output: "data", parse: true, allow: "application/json" },
            plugins: { websocket: true }
        },
        handler: (request, reply) => {
            reply().code(204 /* No Content */)
        }
    })

}

