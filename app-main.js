
/*  external requirements (standard)  */
import path          from "path"
import util          from "util"
import http          from "http"

/*  external requirements (non-standard)  */
import fs            from "fs-promise"
import co            from "co"
import Bluebird      from "bluebird"
import chalk         from "chalk"
import yargs         from "yargs"
import HAPI          from "hapi"
import Auth          from "hapi-auth-basic"
import HAPIDucky     from "hapi-plugin-ducky"
import HAPITraffic   from "hapi-plugin-traffic"
import HAPIHeader    from "hapi-plugin-header"
import HAPIWebSocket from "hapi-plugin-websocket"
import Joi           from "joi"
import Boom          from "boom"
import Inert         from "inert"
import Http2         from "http2"
import WS            from "ws"
import JWT           from "jsonwebtoken"
import ducky         from "ducky"
import AlaSQL        from "alasql"
import pbkdf2        from "pbkdf2-utils"
import glob          from "glob-promise"

/*  internal requirements  */
import Package       from "./package.json"

co(function * () {
    /*  command-line option parsing  */
    let argv = yargs
        .usage("Usage: $0 [-v] [-w] [--ui=<dir>] [--db=<file>]")
        .count("v").alias("v", "verbose")
            .describe("v", "verbose output (repeatable)")
        .string("U").nargs("U", 1).alias("U", "ui").default("U", path.join(__dirname, "ui"))
            .describe("U", "user interface directory")
        .string("D").nargs("D", 1).alias("D", "db").default("D", path.join(__dirname, "app-db.json"))
            .describe("D", "database file")
        .string("H").alias("H", "host").nargs("H", 1).default("H", "127.0.0.1")
            .describe("H", "host name to listen on")
        .string("P").alias("P", "port").nargs("P", 1).default("P", "8888")
            .describe("P", "TCP port to listen on")
        .boolean("s").alias("s", "ssl").default("s", false)
            .describe("s", "speak SSL/TLS on host/port")
        .string("k").alias("k", "key").default("k", path.join(__dirname, "./app-tls-key.pem"))
            .describe("k", "use private key for SSL/TLS")
        .string("c").alias("c", "cert").default("c", path.join(__dirname, "./app-tls-crt.pem"))
            .describe("c", "use X.509 certificate for SSL/TLS")
        .boolean("t").alias("t", "traffic").default("t", false)
            .describe("t", "perform traffic accounting")
        .string("p").alias("p", "password").default("p", "admin")
            .describe("p", "password of superuser")
        .help("h").alias("h", "help").default("h", false)
            .describe("h", "show usage help")
        .boolean("V").alias("V", "version").default("V", false)
            .describe("V", "show program version")
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2))

    /*  short-circuit some options  */
    if (argv.version) {
        process.stderr.write(`${Package.name} ${Package.version} <${Package.homepage}>\n`)
        process.stderr.write(`${Package.description}\n`)
        process.stderr.write(`Copyright (c) ${Package.author.name} <${Package.author.url}>\n`)
        process.stderr.write(`Licensed under ${Package.license} <http://spdx.org/licenses/${Package.license}.html>\n`)
        process.exit(0)
    }

    /*  force color output  */
    chalk.enabled = true

    /*  utility function for verbose output  */
    const verbose = (level, msg) => {
        if (level <= argv.verbose)
            process.stderr.write(`${msg}\n`)
    }

    /*  drop a command-line headline  */
    verbose(1, "++ starting " + chalk.bold(Package.description))

    /*  establish connection to database  */
    const db = {
        query (...args) {
            return AlaSQL.promise(...args)
        },
        queryOne (...args) {
            return this.query(...args).then((result) => {
                if (result.length > 1)
                    throw new Error("more than one result found")
                return (result.length === 1 ? result[0] : null)
            })
        }
    }
    let exists = yield fs.exists(argv.D)
    if (!exists) {
        /*  on-the-fly provide database  */
        let password = yield pbkdf2.hash(argv.p, 10, "sha256")
        password = password.toString("hex")
        yield db.query(`
            CREATE FILESTORAGE DATABASE db("${argv.D}");
            ATTACH FILESTORAGE DATABASE db("${argv.D}");
            USE DATABASE db;
            CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT);
            CREATE TABLE items (name TEXT PRIMARY KEY, val TEXT);
            INSERT INTO users VALUES ("admin", ?);`, [ password ])
    }
    else
        yield db.query(`
            ATTACH FILESTORAGE DATABASE db("${argv.D}");
            USE DATABASE db;`)

    /*  establish a new server context  */
    var server = new HAPI.Server()

    /*  create underlying HTTP/HTTPS listener  */
    let listener
    if (argv.ssl) {
        let key = yield fs.readFile(argv.key,  "utf8")
        let crt = yield fs.readFile(argv.cert, "utf8")
        listener = Http2.createServer({ key: key, cert: crt })
    }
    else
        listener = http.createServer()
    if (!listener.address)
        listener.address = function () { return this._server.address() }

    /*  configure the listening socket  */
    let hapiOpts = {
        listener: listener,
        address:  argv.host,
        port:     argv.port
    }
    if (argv.ssl)
        hapiOpts.tls = true
    server.connection(hapiOpts)

    /*  register HAPI plugins  */
    let register = Bluebird.promisify(server.register, { context: server })
    yield register({ register: Inert })
    yield register({ register: Auth })
    yield register({ register: HAPIDucky })
    yield register({ register: HAPIHeader, options: { Server: `${Package.name}/${Package.version}` }})
    yield register({ register: HAPIWebSocket })
    if (argv.t)
        yield register({ register: HAPITraffic })

    /*  log all requests  */
    server.on("tail", (request) => {
        let traffic = argv.t ? request.traffic() : null
        let ws = request.websocket()
        let protocol =
            (ws ? `WebSocket/${ws.ws.protocolVersion}+` : "") +
            `HTTP/${request.raw.req.httpVersion}`
        verbose(2, "-- request: " +
            "remote="   + chalk.blue(`${request.info.remoteAddress}:${request.info.remotePort}`) + ", " +
            "method="   + chalk.blue(request.method.toUpperCase()) + ", " +
            "url="      + chalk.blue(request.url.path) + ", " +
            "protocol=" + chalk.blue(protocol) + ", " +
            "response=" + chalk.blue(request.response.statusCode) +
            (argv.t ?  ", " +
                "recv="     + chalk.blue(traffic.recvPayload) + "/" + chalk.blue(traffic.recvRaw) + ", " +
                "sent="     + chalk.blue(traffic.sentPayload) + "/" + chalk.blue(traffic.sentRaw) + ", " +
                "duration=" + chalk.blue(traffic.timeDuration) : "")
        )
    })

    /*  prepare for JSONWebToken (JWT) authentication  */
    let result = yield db.queryOne(`SELECT password FROM users WHERE username = "admin"`)
    if (result === null)
        throw new Error("admin user not found")
    let jwtKey = result.password
    server.register(require("hapi-auth-jwt2"), (err) => {
        if (err)
            throw new Error(err)
        server.auth.strategy("jwt", "jwt", {
            key:           jwtKey,
            verifyOptions: { algorithms: [ "HS256" ] },
            urlKey:        "token",
            cookieKey:     "token",
            tokenType:     "JWT",
            validateFunc: (decoded, request, callback) => {
                db.queryOne("SELECT 1 FROM users WHERE username = ?", [ decoded.id ]).then((result) => {
                    return callback(null, result !== null, decoded)
                })
            }
        })
    })

    /*  display network interaction information  */
    const displayListenHint = ([ scheme, proto ]) => {
        let url = `${scheme}://${argv.host}:${argv.port}`
        verbose(1, `-- listen on ${chalk.blue(url)} (${proto})`)
    }
    displayListenHint(argv.ssl ?
        [ "https", "HTTP/{1.0,1.1,2.0} + SSL/TLS" ] :
        [ "http",  "HTTP/{1.0,1.1}" ])
    displayListenHint(argv.ssl ?
        [ "wss", "WebSockets + SSL/TLS" ] :
        [ "ws", "WebSockets" ])

    /*  load all modules  */
    let ctx = { argv, db, server, verbose, jwtKey }
    let mods = yield glob("./app-mod-*.js")
    mods.forEach((mod) => {
        require(mod)(ctx)
    })

    /*  fire up server  */
    yield Bluebird.promisify(server.start, { context: server })()

    /*  gracefully handle server shutdown  */
    const hookInto = (signal) => {
        process.on(signal, () => {
            verbose(2, `-- received ${signal} signal`)
            verbose(2, "-- shutting down service")
            server.root.stop({ timeout: 1 * 2000 }, () => {
                verbose(1, "++ shutting down " + chalk.bold(Package.description))
                process.exit(0)
            })
        })
    }
    let signals = [ "SIGINT", "SIGTERM" ]
    signals.forEach((signal) => hookInto(signal))

}).catch((err) => {
    /*  global fatal error handling  */
    process.stderr.write(chalk.red.bold("** ERROR: ") + chalk.red(err.message) + "\n" + chalk.red(err.stack) + "\n")
    process.exit(1)
})

