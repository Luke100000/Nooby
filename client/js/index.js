var noobyClient = new nooby;

var wrapper = {
    onmessage: function(msg){
        console.log("[nooby] data received", msg)
    }
}

window.onclick = function(){
    console.log(noobyClient.connection.readyState)
    var start = new Date().getTime()
    for(i=0; i<100;i++)
        noobyClient.ping();
    console.log("finished", new Date().getTime() - start)
    //noobyClient.send(text2binary("Hello"))
}

window.onload = function(){
    noobyClient.init(wrapper, "localhost", "25002");
}