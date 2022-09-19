let noobyClient = new NoobyClient();

let wrapper = {
    onmessage: function (header, payload) {
        document.getElementById("console").innerHTML = header.m + ": " + header + ": " + payload
    },
    log: function () {
        console.log(arguments[0])
        //document.getElementById("console").innerHTML = arguments[0]
    }
}

let testTypes = function () {
    noobyClient.send({}, {data: "A message!"})
}

let testChannel = function () {
    noobyClient.connect("testChannel")
    noobyClient.send({}, {data: "Hello"})
}

let randomChannel = function () {
    noobyClient.connect()
}

let test = function () {
    let start = new Date().getTime()
    for (let i = 0; i < 100; i++)
        noobyClient.send({}, {data: "HellooooooooooooABC(" + i + ")"})
    console.log("finished", (new Date().getTime() - start) + "ms")
}

window.onload = function () {
    noobyClient.init(wrapper, "localhost", "25002");
}