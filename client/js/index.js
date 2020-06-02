let noobyClient = new nooby;

let wrapper = {
    onmessage: function (msg) {
        console.log("[nooby] data received", msg)
    }
}

let testTypes = function(){
    noobyClient.send({})    //empty data -> client should not send anything
    noobyClient.send({json:{c:"msg"}, data:"Hello"})    //type 0
    noobyClient.send({data:"Hello"})                    //typ 2
    noobyClient.send({json:{c:"msg"}})                  //typ 3
    noobyClient.ping()                                  //typ 4
}

let testChannel = function(){
    noobyClient.connect()
    noobyClient.send({data:"Hello"})
}

let test = function(){
    let start = new Date().getTime()
    console.log("finished", (new Date().getTime() - start)+"ms")
    
}

window.onload = function () {
    noobyClient.init(wrapper, "localhost", "25002");
}