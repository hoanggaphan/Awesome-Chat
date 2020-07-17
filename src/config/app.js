export const app = {
  // Config the number of connection event listener
  max_event_listeners: 30,
  
  // Config of peer server
  peer_port: 9000,
  peer_path: "/peerjs",

  // Config of multer module
  avatar_directory: "src/public/images/users",
  avatar_type: ["image/png", "image/jpg", "image/jpeg"],
  avatar_limit_size: 1048576, // byte = 1MB 
  general_avatar_group_chat: "group-avatar-trungquandev.png",

  image_message_directory: "src/public/images/chat/message",
  image_message_type: ["image/png", "image/jpg", "image/jpeg"],
  image_message_limit_size: 1048576, // byte = 1MB 

  attachment_message_directory: "src/public/images/chat/message",
  attachment_message_limit_size: 1048576, // byte = 1MB 

}
