var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, '杂言');
    handleMessageBroadcasting(socket,nickNames);
    handleNameChangeAttempts(socket,nickNames,namesUsed);
    handleRoomJoining(socket);

    socket.on('rooms', function () {
      socket.emit('rooms', io.sockets.manager.rooms);
    });
    handleClientDisconnection(socket,nickNames,namesUsed);
  });
};

// 用户加入是分配用户名
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
  var name = '佚名' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult',{
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

// 进入房间
function joinRoom(socket,room){
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult',{room: room});
  socket.broadcast.to(room).emit('sysMessage',{
    text: nickNames[socket.id] + '进入了聊天室<span class="sys-em">' + room + '</span>。'
  });

  var usersInRoom = io.sockets.clients(room);
  if(usersInRoom.length > 1){
    var userInRoomSummary = '<span class="sys-em">'+ room + '</span>' + '房间现有的用户：';
    for(var index in usersInRoom){
      var userSocketId = usersInRoom[index].id;
      if(userSocketId != socket.id){
        if(index > 0){
          userInRoomSummary += '，';
        }
        userInRoomSummary += nickNames[userSocketId];
      }
    }
    userInRoomSummary += '。';
    socket.emit('sysMessage', {text: userInRoomSummary});
  }
}

// 修改昵称
function handleNameChangeAttempts(socket,nickNames,namesUsed){
  socket.on('nameAttempt',function(name){
    if(name.indexOf("佚名") == 0){
      socket.emit('nameResult',{
        success: false,
        message: '自定义名称不能以“佚名”开头。'
      });
    } else {
      if(namesUsed.indexOf(name) == -1){
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult',{
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('sysMessage',{
          text: '<span class="sys-em">'+ previousName + '将昵称改为了' + name + '</span>。'
        });
      } else {
        socket.emit('nameResult',{
          success: false,
          message: '昵称<span class="sys-em">' + name + '</span>被占用。'
        });
      }
    }
  });
}

// 发送聊天信息
function handleMessageBroadcasting(socket){
  socket.on('message',function(message){
    socket.broadcast.to(message.room).emit('message',{
      text: nickNames[socket.id] + ': ' + message.text
    });
  });
}

// 创建房间
function handleRoomJoining(socket){
  socket.on('join',function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

// 用户链接断开
function handleClientDisconnection(socket){
  socket.on('disconnect', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
