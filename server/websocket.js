const io = require('socket.io')();

// initial data
let data = { "id": "772fd8a3-10fa-49bc-b278-76f2adda4f45", "offsetX": 0, "offsetY": 0, "zoom": 100, "gridSize": 0, "links": [], "nodes": [{ "id": "5b96a8b0-1fc4-4ee6-b692-5ae8cd59d555", "type": "task", "selected": false, "x": 250, "y": 100, "extras": {}, "ports": [{ "id": "a49c367f-0979-4d7b-aa26-f64b650c6f51", "type": "task", "selected": false, "name": "top", "parentNode": "5b96a8b0-1fc4-4ee6-b692-5ae8cd59d555", "links": [], "position": "top" }, { "id": "b0cb1b23-7e7a-4b8a-837a-6b19d8092d54", "type": "task", "selected": false, "name": "left", "parentNode": "5b96a8b0-1fc4-4ee6-b692-5ae8cd59d555", "links": [], "position": "left" }, { "id": "5a7e14d2-cb47-4cc1-ab8d-4402f5cce3b8", "type": "task", "selected": false, "name": "bottom", "parentNode": "5b96a8b0-1fc4-4ee6-b692-5ae8cd59d555", "links": [], "position": "bottom" }, { "id": "4b88f907-f05d-4f39-86d7-74b8d41f5afe", "type": "task", "selected": false, "name": "right", "parentNode": "5b96a8b0-1fc4-4ee6-b692-5ae8cd59d555", "links": [], "position": "right" }], "icon": "mirror", "level": 1 }] };
let connectedUsers = [];
let userIncrement = 1;

io.on('connection', function (socket) {
    let isActiveTimeout;

    const user = {
        id: socket.id,
        name: 'User ' + userIncrement++,
        isActive: true
    };
    connectedUsers.push(user);
    console.log(`${user.name} connected`);

    // set user to inactive after some seconds
    clearTimeout(isActiveTimeout);
    isActiveTimeout = setTimeout(() => {
        user.isActive = false;
        io.sockets.emit('connectedUsers', connectedUsers);
    }, 5000);

    // send connected users to everyone, including the just connected client
    io.sockets.emit('connectedUsers', connectedUsers);

    // send current data to client
    socket.emit('datachange', data);

    // handle new data sent from client
    socket.on('datachange', function (newData) {
        // mark user as active
        const user = connectedUsers.find(user => user.id === socket.id);
        user.isActive = true;
        console.log(`received data from ${user.name}`);

        // send connected users to everyone
        io.sockets.emit('connectedUsers', connectedUsers);

        // set user to inactive after some seconds
        clearTimeout(isActiveTimeout);
        isActiveTimeout = setTimeout(() => {
            user.isActive = false;
            io.sockets.emit('connectedUsers', connectedUsers);
        }, 5000);

        // update server-state of data
        data = newData;

        // send new data to everyone except sender
        socket.broadcast.emit('datachange', data);
    });

    socket.on('disconnect', function () {
        // remove user
        connectedUsers = connectedUsers.filter(user => {
            if (user.id === socket.id) {
                console.log(`${user.name} disconnected`);
                return false;
            }
            return true;
        });

        // send connected users to everyone
        socket.broadcast.emit('connectedUsers', connectedUsers);
    });
});

const port = 3001;
io.listen(port);
console.log('listening on port ', port);