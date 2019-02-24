function divEscapedContentElement(message){
  return $('<div class="user-words"></div>').text(message);
}
function divSystemContentElement(message){
  return $('<div class="sys-words"></div>').html('<span>' + message + '</span>');
}


function processUserInput(chatApp, socket){
  var message = $('#send-message').val();
  var systemMessage;
  if(message.charAt(0) == '/'){
    systemMessage = chatApp.processCommand(message);
    if(systemMessage){
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    chatApp.sendMessage($('#current-room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }
  $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function(){
  var chatApp = new Chat(socket);
  socket.on('nameResult',function(result){
    var message;
    if(result.success){
      message = '你现在的名字是<span class="sys-em">' + result.name + '</span>。';
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  socket.on('joinResult',function(result){
    $('#current-room>h3').text(result.room);
    $('#messages').append(divSystemContentElement('你进入了房间<span class="sys-em">' + result.room + "</span>。"));
  });

  socket.on('message',function(message){
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  socket.on('sysMessage',function(message){
    var newElement = $('<div class="sys-words"></div>').html(message.text);
    $('#messages').append(newElement);
  });

  socket.on('rooms',function(rooms){
    $('#room-list').empty();
    for(var room in rooms){
      room = room.substring(1, room.length);
      if(room != ''){
        $('#room-list').append(divEscapedContentElement(room));
      }
    }
    $('#room-list div').click(function(){
      chatApp.processCommand('/join' + $(this).text());
      $('#send-message').focus();
    });
  });

  setInterval(function(){
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();
  $('#send-form').submit(function(){
    processUserInput(chatApp,socket);
    return false;
  });
});