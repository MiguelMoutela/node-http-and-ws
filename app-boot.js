
/*  support ECMAScript 6 via on-the-fly transpilation of our own source code
    onto regular ECMAScript 5 source code which Node.js can directly execute  */
require("babel-register")({
    extensions: [ ".js" ],
    presets:    [ "es2015" ],
    ignore:     /node_modules/,
    cache:      true
})

/*  load ECMAScript 6 polyfills  */
require("babel-polyfill")

/*  pass-through control to main procedure  */
require("./app-main")

