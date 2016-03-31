
import co     from "co"
import Boom   from "boom"

module.exports = (ctx) => {

    /*  example 9: REST-only, dynamic handling  */
    ctx.server.route({
        method: "GET",
        path: "/sv/items/{name}",
        handler: (request, reply) => {
            co(function * () {
                let name = request.params.name
                let result = yield ctx.db.queryOne("SELECT val FROM items WHERE name = ?", [ name ])
                if (result === null)
                    reply(Boom.notFound("no such item"))
                else
                    reply(result.val).type("text/plain")
            }).catch((err) => {
                reply(Boom.badImplementation(`internal error: ${err.message}`))
            })
        }
    })
    ctx.server.route({
        method: "PUT",
        path: "/sv/items/{name}",
        config: {
            payload: { output: "data", parse: false, allow: "text/plain" }
        },
        handler: (request, reply) => {
            co(function * () {
                let name = request.params.name
                let val  = request.payload
                let result = yield ctx.db.queryOne("SELECT val FROM items WHERE name = ?", [ name ])
                if (result === null)
                    yield ctx.db.query("INSERT INTO items VALUES (?, ?)", [ name, val ])
                else
                    yield ctx.db.query("UPDATE items SET val = ? WHERE name = ?", [ val, name ])
                reply().code(204)
            }).catch((err) => {
                reply(Boom.badImplementation(`internal error: ${err.message}`))
            })
        }
    })

}

