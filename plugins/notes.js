let { bot } = require("../lib");
const NotesDB = require("../lib/database/notes");

bot(
  { pattern: "notes", fromMe: true, desc: 'Get notes' },
  async (message, match) => {
    const _notes = await NotesDB.getNotes();
    const notes = [];
    _notes.map((note) => {
      if (!note.note.includes("IMG;;;")) {
        notes.push("📜" + note.note);
      }
    });
    if (!notes) {
      return await message.sendMessage("_There are no notes saved_");
    }

    await message.sendMessage(notes.join("\n\n"));
  }
);

bot(
  { pattern: "save ?(.*)", fromMe: true, desc: "Save notes" },
  async (message, match) => {
    const userNote = match || message.reply_message.text;
    if (!userNote && !message.reply_message.text) {
      await message.sendMessage("_Enter a note or reply to a text message_");

      return;
    }

    if (userNote) {
      await NotesDB.saveNote(userNote);
      await message.sendMessage("_Succesfully saved_");

      return;
    } else {
      await message.sendMessage("_Can't save note due to some error_");

      return;
    }
  }
);

bot(
  { pattern: "deleteNotes", fromMe: true, desc: 'Delete notes'},
  async (message, match) => {
    await NotesDB.deleteAllNotes();
    return await message.sendMessage("_Succesfully deleted all notes_");
  }
);
