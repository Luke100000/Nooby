var subscribe = function(callbacks, client, msg){
    //Help, please delete when subscribe is finished
    callbacks.channel       //here are the channels stored
    callbacks.channelHashmap    //Hashmap[client] = i   >>> channel[i] here is user
    
    //if socket was on another channel delete the old reference

    //set new channel





    //OLD STUFF >>>>

    // if socket was on another channel delete the old reference
    if (socket.channel && sockets[socket.channel] && sockets[socket.channel][socket.connectionId]) {
        delete sockets[socket.channel][socket.connectionId]
    }
    
    socket.channel = json.channel        //set new channel
    socket.write('Hello. Nooby online. \r\n')
    
    //create channel
    if (sockets[socket.channel] == null) {
        sockets[socket.channel] = { }
        
        channelSettings[socket.channel] = {level:0, password:msg.split("=")[2] || ""}
        stats.add("channels", 1)
    } else {
        if (msg.split("=")[2] !== channelSettings[socket.channel].password) {
            socket.write('__MSG__START__ewrong_password__MSG__END__')
            _log('Client tried to subscribe for channel: "' + socket.channel + '" with wrong password')
            return
        }
    }
    
    //connect client
    sockets[socket.channel][socket.connectionId] = {socket:socket, ID:(channelSettings[socket.channel].level > 0 ? msg.split("=")[1] : socket.connectionId)}
    
    _log('Client subscribes for channel: "' + socket.channel + '" with settings level ' + channelSettings[socket.channel].level + " and username=" + msg.split("=")[1])
    
    //set first user to admin (or all when selected)
    if (Object.keys(sockets[socket.channel]).length === 1) {
        sockets[socket.channel][socket.connectionId].admin = "true"
    }
    
    //send all admins the connectionID
    var subscribers = Object.keys(sockets[socket.channel])
    for (var i = 0, l = subscribers.length; i < l; i++) {
        if (sockets[socket.channel][ subscribers[i] ].admin === "true") {
            sockets[socket.channel][ subscribers[i] ].socket.isConnected && sockets[socket.channel][ subscribers[i] ].socket.write('__MSG__START__c' + socket.connectionId + "=" + msg.split("=")[1] + '__MSG__END__')
        }
    }
}

module.exports = subscribe