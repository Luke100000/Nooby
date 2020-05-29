let noobyClient = new nooby;

let wrapper = {
    onmessage: function (msg) {
        console.log("[nooby] data received", msg)
    }
}

<<<<<<< HEAD
window.onclick = function(){
    let start = new Date().getTime()
    //for(i=0; i<1;i++)
    noobyClient.send({})    //empty data -> client should not send anything
    noobyClient.send({json:{c:"msg"}, data:"Hello"})    //type 0
    noobyClient.send({data:"Hello"})                    //typ 2
    noobyClient.send({json:{c:"msg"}})                  //typ 3
    noobyClient.ping()                                  //typ 4
    console.log("finished", (new Date().getTime() - start)+"ms")
    
=======
window.onclick = function () {
    console.log(noobyClient.connection.readyState)
    let start = new Date().getTime()
    for (let i = 0; i < 1; i++)
        noobyClient.send({data: "Hello"})
    console.log("finished", new Date().getTime() - start)

>>>>>>> cade286aa8a8f75e6b2af7b695b40659fa7e8284
}

window.onload = function () {
    noobyClient.init(wrapper, "localhost", "25002");
}