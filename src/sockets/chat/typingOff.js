import { pushSocketIdToArray, emitNotifyToArray, removeSocketIdFromArray } from '../../helpers/socketHelper';

/**
 * @param io from socket.io library
 */
const typingOff = (io) => {
  let clients = {};
  io.on("connection", (socket) => {
    clients = pushSocketIdToArray(clients, socket.request.user._id, socket.id);
    // Join all room chat of user
    socket.request.user.chatGroupIds.map(group => socket.join(group._id));

    socket.on("user-is-not-typing", (data) => {
      if (data.groupId) {
        let response = {
          currentUserId: socket.request.user._id,
          currentGroupId: data.groupId,
        }

        // Emit all users in room chat except sender
        socket.to(data.groupId).emit("response-user-is-not-typing", response);
      }

      if (data.contactId) {
        let response = {
          currentUserId: socket.request.user._id,
        }

        // emit notification
        if (clients[data.contactId]) {
          emitNotifyToArray(clients, data.contactId, io, "response-user-is-not-typing", response);
        }
      }
    });

    socket.on("disconnect", () => {
      clients = removeSocketIdFromArray(clients, socket.request.user._id, socket);
      socket.request.user.chatGroupIds.map(group => socket.leave(group._id));
    });
  });
};

module.exports = typingOff;
