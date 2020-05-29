var noobyClient = new nooby;

var wrapper = {
    onmessage: function(msg){
        console.log("[nooby] data received", msg)
    }
}

window.onclick = function(){
    var start = new Date().getTime()
    //for(i=0; i<1;i++)
    noobyClient.send({})    //empty data -> client should not send anything
    noobyClient.send({json:{c:"msg"}, data:"Hello"})    //type 0
    noobyClient.send({data:"Hello"})                    //typ 2
    noobyClient.send({json:{c:"msg"}})                  //typ 3
    noobyClient.ping()                                  //typ 4
    console.log("finished", (new Date().getTime() - start)+"ms")
    
}

window.onload = function(){
    noobyClient.init(wrapper, "localhost", "25002");
}