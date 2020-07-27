function attachmentChat(divId) {
  $(`#attachment-chat-${divId}`).off("change").on("change", function () {
    // Validation update user avatar in frontend
    const fileData = $(this).prop("files")[0];
    const limit = 1048576; // byte = 1MB

    if (fileData.size > limit) {
      alertify.notify("Tệp đính kèm có kích thước tối đa 1MB", "error", 5);
      $(this).val(null);
      return;
    }  

    let targetId = $(this).data('chat')
    let isChatGroup = false;
  
    let messageFormData = new FormData();
    messageFormData.append("my-attachment-chat", fileData);
    messageFormData.append("uid", targetId);
  
    if($(this).hasClass("chat-in-group")) {
      messageFormData.append("isChatGroup", true);
      isChatGroup = true;
    }
  
    $.ajax({
      url: "/message/add-new-attachment",
      type: "post",
      cache: false,
      contentType: false,
      processData: false,
      data: messageFormData,
      success: function (data) {
        let dataToEmit = data;

        // step 01: handle message data before show
        let messageOfMe = $(`<div class="bubble me bubble-image-file" data-mess-id="${data.newMessage._id}"></div>`);
        let attachmentChat = `<div class="bubble-content">
                                <a
                                    href="data:${data.newMessage.file.contentType}; base64, ${bufferToBase64(data.newMessage.file.data.data)}"
                                    download="${data.newMessage.file.fileName}"
                                >
                                  ${data.newMessage.file.fileName}
                                </a>
                            </div>`
        let senderAvatar = `<img src="/images/users/${data.newMessage.sender.avatar}" class="avatar-small" title="${data.newMessage.sender.name}" />`

        if (isChatGroup) {
          messageOfMe.html(`${senderAvatar} ${attachmentChat}`);

          increaseNumberMessageGroup(divId);
          dataToEmit.groupId = targetId;

        } else {
          messageOfMe.html(`${senderAvatar} ${attachmentChat}`);
          dataToEmit.contactId = targetId;
        }

        // step 02: append message data to screen
        $(`.right .chat[data-chat=${divId}]`).append(messageOfMe);
        nineScrollRight(divId);

        // step 03: change data preview & time in leftSide
        $(`.person[data-chat = ${divId}]`).find("span.time").removeClass("message-time-realtime").html(moment(data.newMessage.createdAt).locale("vi").startOf("seconds").fromNow());
        $(`.person[data-chat = ${divId}]`).find("span.preview").html("Tệp đính kèm...");

        // step 04: move conversation to the top 
        $(`.person[data-chat = ${divId}]`).on("event.moveConversationToTheTop", function () {
          let dataToMove = $(this).parent();
          $(this).closest("ul").prepend(dataToMove);
          $(this).off("event.moveConversationToTheTop");
        })
        $(`.person[data-chat = ${divId}]`).trigger("event.moveConversationToTheTop");

        // step 05: emit realtime
        socket.emit("chat-attachment", dataToEmit);

        // step 06: add image to modal attachment
        let attachmentChatToModal = `<li>
                                        <a
                                          href="data:${data.newMessage.file.contentType}; base64, ${bufferToBase64(data.newMessage.file.data.data)}"
                                          download="${data.newMessage.file.fileName}"
                                        >
                                          ${data.newMessage.file.fileName}
                                        </a>
                                    </li>`
        $(`#attachmentsModal_${divId}`).find(".list-attachments").append(attachmentChatToModal);

      },
      error: function (error) {
        alertify.notify(error.responseText, "error", 5);
      },
    });
  });
}

$(document).ready(function () {
  socket.on("response-chat-attachment", function (response) {
    let divId = "";
    let currentUserId = $("#dropdown-navbar-user").data("uid");
    
    // step 01: handle message data before show
    let messageOfYou = $(`<div class="bubble you bubble-image-file" data-mess-id="${response.newMessage._id}"></div>`);
    let attachmentChat = `<div class="bubble-content">
                            <a
                                href="data:${response.newMessage.file.contentType}; base64, ${bufferToBase64(response.newMessage.file.data.data)}"
                                download="${response.newMessage.file.fileName}"
                            >
                              ${response.newMessage.file.fileName}
                            </a>
                          </div>`
    let senderAvatar = `<img src="/images/users/${response.newMessage.sender.avatar}" class="avatar-small" title="${response.newMessage.sender.name}" />`

    if (response.currentGroupId) {
      messageOfYou.html(`${senderAvatar} ${attachmentChat}`);

      divId = response.currentGroupId;

      increaseNumberMessageGroup(divId);
    } else {
      messageOfYou.html(`${senderAvatar} ${attachmentChat}`);
      divId = response.currentUserId;
    }

    // All steps handle chat if conversation is showing window screen
    if($("#all-chat").find(`li[data-chat = "${divId}"]`).length) {
      // step 02: append message data to screen
      $(`.right .chat[data-chat=${divId}]`).append(messageOfYou);
      nineScrollRight(divId);
        
      // step 03: change data preview & time in leftSide
      $(`.person[data-chat = ${divId}]`).find("span.time").addClass("message-time-realtime");
      $(`.person[data-chat = ${divId}]`).find("span.time").html(moment(response.newMessage.createdAt).locale("vi").startOf("seconds").fromNow());
      $(`.person[data-chat = ${divId}]`).find("span.preview").html("Tệp đính kèm...");
  
      // step 04: move conversation to the top 
      $(`.person[data-chat = ${divId}]`).on("event.moveConversationToTheTop", function () {
        let dataToMove = $(this).parent();
        $(this).closest("ul").prepend(dataToMove);
        $(this).off("event.moveConversationToTheTop");
      })
      $(`.person[data-chat = ${divId}]`).trigger("event.moveConversationToTheTop");
  
      // step 06: add image to modal attachment
      let attachmentChatToModal = `
        <li>
          <a
            href="data:${response.newMessage.file.contentType}; base64, ${bufferToBase64(response.newMessage.file.data.data)}"
            download="${response.newMessage.file.fileName}"
          >
            ${response.newMessage.file.fileName}
          </a>
        </li>
      `
  
      $(`#attachmentsModal_${divId}`).find(".list-attachments").append(attachmentChatToModal);

      return;
    }

    // All steps handle chat with user conversation is not showing window screen
    if (!response.currentGroupId) {
      // Step 01: handle leftSide.js
      let subUsername = response.sender.name;
      if (subUsername.length > 15) {
        subUsername = subUsername.substr(0, 14) + "...";
      }
      let leftSideData = "";
      let lastMess = lastItemFromArr(response.messages);
      
      if (lastMess.messageType === "text") {
        leftSideData = `
            <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
              <li class="person" data-chat="${divId}">
                <div class="left-avatar">
                <div class="dot"></div>
                  <img src="images/users/${response.sender.avatar}" alt="" />
                </div>
                <span class="name">
                  ${subUsername}
                </span>
                <span class="time message-time-realtime">
                  ${convertTimestampHumanTime(lastMess.createdAt)}
                </span>
                <span class="preview convert-emoji">
                  ${lastMess.text}
                </span>
              </li>
            </a>`;
      }
      
      if (lastMess.messageType === "image") {
        leftSideData = `
            <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
              <li class="person" data-chat="${divId}">
                <div class="left-avatar">
                <div class="dot"></div>
                  <img src="images/users/${response.sender.avatar}" alt="" />
                </div>
                <span class="name">
                  ${subUsername}
                </span>
                <span class="time message-time-realtime">
                  ${convertTimestampHumanTime(lastMess.createdAt)}
                </span>
                <span class="preview convert-emoji">
                  Hình ảnh...
                </span>
              </li>
            </a>`;
      }
  
      if (lastMess.messageType === "file") {
        leftSideData = `
            <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
              <li class="person" data-chat="${divId}">
                <div class="left-avatar">
                <div class="dot"></div>
                  <img src="images/users/${response.sender.avatar}" alt="" />
                </div>
                <span class="name">
                  ${subUsername}
                </span>
                <span class="time message-time-realtime">
                  ${convertTimestampHumanTime(lastMess.createdAt)}
                </span>
                <span class="preview convert-emoji">
                  Tệp đính kèm...
                </span>
              </li>
            </a>`;
      }
  
      $("#all-chat").find("ul").prepend(leftSideData);
      $("#user-chat").find("ul").prepend(leftSideData);
  
      // Step 02: handle rightSide.ejs
      let rightSideData = `
      <div class="right tab-pane" data-chat="${divId}" id="to_${divId}">
        <div class="top">
          <span>To: 
            <span class="name">${response.sender.name}</span>
          </span>
          <span class="chat-menu-right">
            <a href="#attachmentsModal_${divId}" class="show-attachments" data-toggle="modal">
              Tệp đính kèm
              <i class="fa fa-paperclip"></i>
            </a>
          </span>
          <span class="chat-menu-right">
            <a href="javascript:void(0)">&nbsp;</a>
          </span>
          <span class="chat-menu-right">
          <a href="#imagesModal_${divId}" class="show-images" data-toggle="modal">
            Hình ảnh
            <i class="fa fa-photo"></i>
          </a>
          </span>
        </div>
        <div class="content-chat">
          <div class="chat" data-chat="${divId}">
            <img src="images/chat/message-loading.gif" class="message-loading" />
          </div>
        </div>
        <div class="write" data-chat="${divId}">
          <input type="text" class="write-chat" id="write-chat-${divId}" data-chat="${divId}" />
          <div class="icons">
            <a href="#" class="icon-chat" data-chat="">
              <i class="fa fa-smile-o"></i>
            </a>
            <label for="image-chat-${divId}">
              <input
                type="file"
                id="image-chat-${divId}"
                name="my-image-chat"
                class="image-chat"
                data-chat="${divId}"
              />
              <i class="fa fa-photo"></i>
            </label>
            <label for="attachment-chat-${divId}">
              <input
                type="file"
                id="attachment-chat-${divId}"
                name="my-attachment-chat"
                class="attachment-chat"
                data-chat="${divId}"
              />
              <i class="fa fa-paperclip"></i>
            </label>
            <a
              href="javascript:void(0)"
              id="video-chat-${divId}"
              class="video-chat"
              data-chat="${divId}"
            >
              <i class="fa fa-video-camera"></i>
            </a>
          </div>
        </div>
      </div>`
      $("#screen-chat").prepend(rightSideData);
      
      response.messages.forEach(message => {
        let messageHtml = "";
        if (message.messageType === "text") {
          messageHtml = `
          <div 
            class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
            data-mess-id="${message._id}"
          >
            <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="${message.sender.name}">
            <div class="bubble-content">
              ${message.text}  
            </div>
          </div>`;
        }
  
        if (message.messageType === "image") {
          messageHtml = `
          <div 
            class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
            data-mess-id="${message._id}"
          >
            <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="${message.sender.name}">
            <img
              src="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
              class="show-image-chat"
            />
          </div>`;
        }
  
        if (message.messageType === "file") {
          messageHtml = `
          <div 
            class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
            data-mess-id="${message._id}"
          >
            <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="${message.sender.name}">
            <div class="bubble-content">
              <a
                href="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
                download="${message.file.fileName}"
              >
                ${message.file.fileName}
              </a>
            </div>
          </div>`;
        }
        $(`.chat[data-chat = ${divId}]`).append(messageHtml);
      });
  
      // Step 03: call function changeScreenChat
      changeScreenChat();
  
      // Step 04: Enable chat emoji
      enableEmojioneArea();
  
      // Step 05: convert emoji
      convertEmoji();
  
      // Step 06: handle imageModal
      let imgModalData = `
      <div class="modal fade" id="imagesModal_${divId}" role="dialog">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal">&times;</button>
              <h4 class="modal-title">Tất cả hình ảnh trong cuộc trò truyện.</h4>
            </div>
            <div class="modal-body">
              <div class="all-images" style="visibility: hidden;"></div>
            </div>
          </div>
        </div>
      </div>`;
      $("body").append(imgModalData);
  
      response.messages.forEach(message => {
        if (message.messageType === "image") {
          let messageHtml = `
            <img src="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}" />
          `;
  
          $(`#imagesModal_${divId}`).find(".all-images").append(messageHtml);
        }
      });
  
      // Step 07: call grid photo
      gridPhotos(5);
  
      // Step 08: handle attachmentModal
      let attachmentModalData = `
      <div class="modal fade" id="attachmentsModal_${divId}" role="dialog">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal">&times;</button>
              <h4 class="modal-title">Tất cả tệp đính kèm trong cuộc trò chuyện.</h4>
            </div>
            <div class="modal-body">
              <ul class="list-attachments"></ul>
            </div>
          </div>
        </div>
      </div>`
      $("body").append(attachmentModalData);
  
      response.messages.forEach(message => {
        if (message.messageType === "file") {
          let messageHtml = `
              <li>
                <a
                  href="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
                  download="${message.file.fileName}"
                >
                  ${message.file.fileName}
                </a>
              </li>
            `;
  
          $(`#attachmentsModal_${divId}`).find(".list-attachments").append(messageHtml);
        }
      });
  
      // Step 09: update online
      socket.emit("check-status");
  
      // Step 10: Read more messages
      readMoreMessages();

      return;
    }

    // All steps handle chat if group conversation is not showing window screen
    // Step 01: handle leftSide.js
    let subUsername = response.receiver.name;
    if (subUsername.length > 15) {
      subUsername = subUsername.substr(0, 14) + "...";
    }
    let leftSideData = "";
    let lastMess = lastItemFromArr(response.messages);
    
    if (lastMess.messageType === "text") {
      leftSideData = `
          <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
            <li class="person group-chat" data-chat="${divId}">
              <div class="left-avatar">
                <img src="images/users/group-avatar-trungquandev.png" alt="" />
              <span class="name">
                <span class="group-chat-name">
                  ${subUsername}
                </span> 
              </span>
              <span class="time message-time-realtime">
                ${convertTimestampHumanTime(lastMess.createdAt)}
              </span>
              <span class="preview convert-emoji">
                ${lastMess.text}
              </span>
            </li>
          </a>`;
    }
    
    if (lastMess.messageType === "image") {
      leftSideData = `
          <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
            <li class="person group-chat" data-chat="${divId}">
              <div class="left-avatar">
                <img src="images/users/group-avatar-trungquandev.png" alt="" />
              <span class="name">
                <span class="group-chat-name">
                  ${subUsername}
                </span> 
              </span>
              <span class="time message-time-realtime">
                ${convertTimestampHumanTime(lastMess.createdAt)}
              </span>
              <span class="preview convert-emoji">
                Hình ảnh...
              </span>
            </li>
          </a>`;
    }

    if (lastMess.messageType === "file") {
      leftSideData = `
          <a href="#uid_${divId}" class="room-chat" data-target="#to_${divId}">
            <li class="person group-chat" data-chat="${divId}">
              <div class="left-avatar">
                <img src="images/users/group-avatar-trungquandev.png" alt="" />
              <span class="name">
                <span class="group-chat-name">
                  ${subUsername}
                </span> 
              </span>
              <span class="time message-time-realtime">
                ${convertTimestampHumanTime(lastMess.createdAt)}
              </span>
              <span class="preview convert-emoji">
                Tệp đính kèm...
              </span>
            </li>
          </a>`;
    }

    $("#all-chat").find("ul").prepend(leftSideData);
    $("#group-chat").find("ul").prepend(leftSideData);

    // Step 02: handle rightSide.ejs
    let rightSideData = `
    <div class="right tab-pane" data-chat="${divId}" id="to_${divId}">
      <div class="top">
        <span>To: 
          <span class="name">${response.sender.name}</span>
        </span>
        <span class="chat-menu-right">
          <a href="#attachmentsModal_${divId}" class="show-attachments" data-toggle="modal">
            Tệp đính kèm
            <i class="fa fa-paperclip"></i>
          </a>
        </span>
        <span class="chat-menu-right">
          <a href="javascript:void(0)">&nbsp;</a>
        </span>
        <span class="chat-menu-right">
        <a href="#imagesModal_${divId}" class="show-images" data-toggle="modal">
          Hình ảnh
          <i class="fa fa-photo"></i>
        </a>
        </span>
        <span class="chat-menu-right">
          <a href="javascript:void(0)">&nbsp;</a>
        </span>
        <span class="chat-menu-right">
          <a href="javascript:void(0)" class="number-members" data-toggle="modal">
            <span class="show-number-members" >${response.receiver.usersAmount}</span>
            <i class="fa fa-users"></i>
          </a>
        </span>
        <span class="chat-menu-right">
          <a href="javascript:void(0)">&nbsp;</a>
        </span>
        <span class="chat-menu-right">
          <a href="javascript:void(0)" class="number-messages" data-toggle="modal">
            <span class="show-number-messages" >${response.receiver.messagesAmount}</span>
            <i class="fa fa-comment-o"></i>
          </a>
        </span>
      </div>
      <div class="content-chat">
        <div class="chat chat-in-group" data-chat="${divId}">
          <img src="images/chat/message-loading.gif" class="message-loading" />
        </div>
      </div>
      <div class="write" data-chat="${divId}">
        <input type="text" class="write-chat chat-in-group" id="write-chat-${divId}" data-chat="${divId}" />
        <div class="icons">
          <a href="#" class="icon-chat" data-chat="">
            <i class="fa fa-smile-o"></i>
          </a>
          <label for="image-chat-${divId}">
            <input
              type="file"
              id="image-chat-${divId}"
              name="my-image-chat"
              class="image-chat chat-in-group"
              data-chat="${divId}"
            />
            <i class="fa fa-photo"></i>
          </label>
          <label for="attachment-chat-${divId}">
            <input
              type="file"
              id="attachment-chat-${divId}"
              name="my-attachment-chat"
              class="attachment-chat chat-in-group"
              data-chat="${divId}"
            />
            <i class="fa fa-paperclip"></i>
          </label>
          <a
            href="javascript:void(0)"
            id="video-chat-${divId}"
            class="video-chat"
            data-chat="${divId}"
          >
            <i class="fa fa-video-camera"></i>
          </a>
        </div>
      </div>
    </div>`
    $("#screen-chat").prepend(rightSideData);
    
    response.messages.forEach(message => {
      let messageHtml = "";
      if (message.messageType === "text") {
        messageHtml = `
        <div 
          class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
          data-mess-id="${message._id}"
        >
          <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="">
          <div class="bubble-content">
            ${message.text}  
          </div>
        </div>`;
      }

      if (message.messageType === "image") {
        messageHtml = `
        <div 
          class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
          data-mess-id="${message._id}"
        >
          <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="${message.sender.name}">
          <img
            src="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
            class="show-image-chat"
          />
        </div>`;
      }

      if (message.messageType === "file") {
        messageHtml = `
        <div 
          class="convert-emoji bubble ${message.senderId == currentUserId ? 'me': 'you'}"
          data-mess-id="${message._id}"
        >
          <img src="/images/users/${message.sender.avatar}" class="avatar-small" title="${message.sender.name}">
          <div class="bubble-content">
            <a
              href="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
              download="${message.file.fileName}"
            >
              ${message.file.fileName}
            </a>
          </div>
        </div>`;
      }
      $(`.chat[data-chat = ${divId}]`).append(messageHtml);
    });

    // Step 03: call function changeScreenChat
    changeScreenChat();

    // Step 04: Enable chat emoji
    enableEmojioneArea();

    // Step 05: convert emoji
    convertEmoji();

    // Step 06: handle imageModal
    let imgModalData = `
    <div class="modal fade" id="imagesModal_${divId}" role="dialog">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">&times;</button>
            <h4 class="modal-title">Tất cả hình ảnh trong cuộc trò truyện.</h4>
          </div>
          <div class="modal-body">
            <div class="all-images" style="visibility: hidden;"></div>
          </div>
        </div>
      </div>
    </div>`;
    $("body").append(imgModalData);

    response.messages.forEach(message => {
      if (message.messageType === "image") {
        let messageHtml = `
          <img src="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}" />
        `;

        $(`#imagesModal_${divId}`).find(".all-images").append(messageHtml);
      }
    });

    // Step 07: call grid photo
    gridPhotos(5);

    // Step 08: handle attachmentModal
    let attachmentModalData = `
    <div class="modal fade" id="attachmentsModal_${divId}" role="dialog">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">&times;</button>
            <h4 class="modal-title">Tất cả tệp đính kèm trong cuộc trò chuyện.</h4>
          </div>
          <div class="modal-body">
            <ul class="list-attachments"></ul>
          </div>
        </div>
      </div>
    </div>`
    $("body").append(attachmentModalData);

    response.messages.forEach(message => {
      if (message.messageType === "file") {
        let messageHtml = `
            <li>
              <a
                href="data:${message.file.contentType}; base64, ${bufferToBase64(message.file.data.data)}"
                download="${message.file.fileName}"
              >
                ${message.file.fileName}
              </a>
            </li>
          `;

        $(`#attachmentsModal_${divId}`).find(".list-attachments").append(messageHtml);
      }
    });

    // Step 09: update online
    socket.emit("check-status");

    // Step 10: Read more messages
    readMoreMessages();
  });
});
