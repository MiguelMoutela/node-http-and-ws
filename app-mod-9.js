
import co from "co"

module.exports = (ctx) => {

    /*  example 9: REST-only, dynamic handling  */
    ctx.server.route({
        method: "GET",
        path: "/sv/items/{name}",
        handler: function * (request, reply) {
            let name = request.params.name
            let result = yield ctx.db.queryOne("SELECT val FROM items WHERE name = ?", [ name ])
            if (result === null)
                reply.notFound("no such item")
            else
                reply(result.val).type("text/plain")
        }
    })
    ctx.server.route({
        method: "PUT",
        path: "/sv/items/{name}",
        config: {
            payload: { output: "data", parse: false, allow: "text/plain" }
        },
        handler: function * (request, reply) {
            let name = request.params.name
            let val  = request.payload
            let result = yield ctx.db.queryOne("SELECT val FROM items WHERE name = ?", [ name ])
            if (result === null)
                yield ctx.db.query("INSERT INTO items VALUES (?, ?)", [ name, val ])
            else
                yield ctx.db.query("UPDATE items SET val = ? WHERE name = ?", [ val, name ])
            reply().code(204)
        }
    })

}

