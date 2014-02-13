var http = require('http')
  , redis  = require('redis')
  , socketio = require('socket.io')
  , RedisStore = socketio.RedisStore
  , dnode = require('dnode')
  , fs = require('fs')

var server = http.createServer(function (req, res) {
  return fs.createReadStream(__dirname + '/index.html').pipe(res)
}).listen(8080)

var io = socketio.listen(server)

io.set('store', new RedisStore({ redisPub: redis.createClient(), redisSub: redis.createClient(), redisClient: redis.createClient() }))

io.sockets.on('connection', function (socket) {

  socket.on('tweet:track', function (term) {
    var d = dnode.connect(7001, function (remote) {
      socket.join(term)
      remote.track(term)
      d.end()
    })

    d.on('error', function (err) {
      // Server is probably down
      console.log(err)
    })
  })

  socket.on('tweet:untrack', function (term) {
    var d = dnode.connect(7001, function (remote) {
      socket.leave(term)
      remote.untrack(term)
      d.end()
    })
  })

  socket.on('disconnect', function () {
    var rooms = Object.keys(io.sockets.manager.roomClients[socket.id])

    var d = dnode.connect(7001, function (remote) {
      rooms.forEach(function (room) {
        if (room[0] === '/') {
          remote.untrack(room.substring(1))
        }
      })
      d.end()
    })
  })
})
