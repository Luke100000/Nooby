var noobyClient = new nooby;

var wrapper = {
    onmessage: function(e){
        console.log("[nooby] data received",e.data)
    }
}

window.onclick = function(){
    this.console.log(noobyClient.connection.readyState)
    noobyClient.ping();
    //noobyClient.send(noobyClient.text2binary("Hello"))
}

window.onload = function(){
    noobyClient.init(wrapper, "localhost", "25002");
}