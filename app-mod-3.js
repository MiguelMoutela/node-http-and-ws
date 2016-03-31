
import co     from "co"
import Boom   from "boom"
import JWT    from "jsonwebtoken"
import pbkdf2 from "pbkdf2-utils"

module.exports = (ctx) => {

    /*  example 3: REST-only, dynamic handling, Ducky, embedded co, JWT  */
    ctx.server.route({
        method: "POST",
        path: "/sv/login",
        config: {
            auth:     false,
            payload:  { output: "data", parse: true, allow: "application/json" },
            plugins: {
                ducky: `{ username: string, password: string }`
            }
        },
        handler: (request, reply) => {
            co(function * () {
                /*  fetch payload  */
                let { username, password } = request.payload

                /*  determine user  */
                let result = yield ctx.db.queryOne("SELECT password FROM users WHERE username = ?", [ username ])
                if (result === null)
                    return reply(Boom.unauthorized("invalid username"))

                /*  verify credential  */
                let buf = new Buffer(result.password, "hex")
                let valid = yield pbkdf2.verify(password, buf)
                if (!valid)
                    return reply(Boom.unauthorized("invalid credentials"))

                /*  issue new token  */
                let token = JWT.sign({
                    id:       username,
                    username: username,
                    scope:    [ "admin", "foo", "bar" ]
                }, ctx.jwtKey, { algorithm: "HS256", expiresIn: "1h" })
                reply({ token: token }).code(201)

            }).catch((err) => {
                reply(Boom.badImplementation(`internal error: ${err.message}`))
            })
        }
    })

}

