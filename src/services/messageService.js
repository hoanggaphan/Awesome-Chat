import _ from 'lodash';
import ChatGroupModel from '../models/chatGroupModel';
import ContactModel from '../models/contactModel';
import UserModel from '../models/userModel';
import MessageModel from '../models/messageModel';

const LIMIT_CONVERSATION_TAKEN = 15;
const LIMIT_MESSAGES_TAKEN = 30;

/**
 * get all conversation
 * @param {string} currentUserId 
 */
const getAllConversationItems = (currentUserId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const contacts = await ContactModel.getContacts(currentUserId, LIMIT_CONVERSATION_TAKEN)
      const userConversationPromise = contacts.map(async (contact) => {
        if (currentUserId == contact.userId) {
          let getUserContact = await UserModel.getNormalUserDataById(contact.contactId);
          getUserContact.updatedAt = contact.updatedAt;
          return getUserContact;
        } else {
          let getUserContact = await UserModel.getNormalUserDataById(contact.userId);
          getUserContact.updatedAt = contact.updatedAt;
          return getUserContact;
        }
      });

      const userConversations = await Promise.all(userConversationPromise);
      const groupConversations = await ChatGroupModel.getChatGroups(currentUserId, LIMIT_CONVERSATION_TAKEN);
      let allConversations = [...userConversations, ...groupConversations];
      allConversations = _.sortBy(allConversations, (item) => -item.updatedAt);

      // get message to apply in screen chat
      let allConversationWithMessagesPromise = allConversations.map(async (conversation) => {
        let messages = await MessageModel.model.getMessages(currentUserId, conversation._id, LIMIT_MESSAGES_TAKEN);

        conversation = conversation.toObject()
        conversation.messages = messages;

        return conversation;
      })
      let allConversationWithMessages = await Promise.all(allConversationWithMessagesPromise);
      // sort by updatedAt desending
      allConversationWithMessages = _.sortBy(allConversationWithMessages, (item) => -item.updatedAt);

      resolve({
        allConversations,
        userConversations,
        groupConversations,
        allConversationWithMessages
      });
    } catch (error) {
      reject(error);
    }
  })
}

module.exports = { getAllConversationItems };
