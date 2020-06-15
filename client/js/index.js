let noobyClient = new nooby;

let wrapper = {
    onmessage: function (msg) {
        //console.log("[nooby] data received", msg)
        document.getElementById("console").innerHTML = msg.data.data
    },
    log: function(){
        console.log(arguments[0])
        //document.getElementById("console").innerHTML = arguments[0]
    }
}

let testTypes = function () {
    noobyClient.send({})    //empty data -> client should not send anything
    noobyClient.send({header: {c: "msg"}, data: "Hello"})    //type 0
    noobyClient.send({data: "Hello"})                      //type 2
    noobyClient.send({header: {c: "msg"}})                   //type 3
    noobyClient.ping()                                          //type 4
}

let testChannel = function () {
    noobyClient.connect("testChannel")
    noobyClient.send({data: "Hello"})
}

let randomChannel = function(){
    noobyClient.connect()
}

let test = function () {
    let start = new Date().getTime()
    for(let i = 0; i < 100; i++)
        noobyClient.send({data:"HellooooooooooooABC("+i+")"})
    console.log("finished", (new Date().getTime() - start) + "ms")

}

window.onload = function () {
    noobyClient.init(wrapper, "localhost", "25002");
}