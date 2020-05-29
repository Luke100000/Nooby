let noobyClient = new nooby;

let wrapper = {
    onmessage: function (msg) {
        console.log("[nooby] data received", msg)
    }
}

window.onclick = function () {
    console.log(noobyClient.connection.readyState)
    let start = new Date().getTime()
    for (let i = 0; i < 1; i++)
        noobyClient.send({data: "Hello"})
    console.log("finished", new Date().getTime() - start)

}

window.onload = function () {
    noobyClient.init(wrapper, "localhost", "25002");
}