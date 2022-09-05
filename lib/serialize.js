const {
    jidDecode,
    downloadContentFromMessage,
    getContentType,
  } = require("@adiwajshing/baileys"),
  fs = require("fs");
cmd = {
  1: [
    "-fs 1M",
    "-vcodec",
    "libwebp",
    "-vf",
    `scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1`,
  ],
  2: ["-fs 1M", "-vcodec", "libwebp"],
};
const fetch = require("node-fetch");
const { fromBuffer } = require("file-type");
const {
  writeExifImg,
  writeExifVid,
  imageToWebp,
  videoToWebp,
} = require("./sticker");
const downloadMedia = (message, pathFile) =>
  new Promise(async (resolve, reject) => {
    let type = Object.keys(message)[0];
    let mimeMap = {
      imageMessage: "image",
      videoMessage: "video",
      stickerMessage: "sticker",
      documentMessage: "document",
      audioMessage: "audio",
    };
    let mes = message;
    if (type == "templateMessage") {
      mes = message.templateMessage.hydratedFourRowTemplate;
      type = Object.keys(mes)[0];
    }
    if (type == "buttonsMessage") {
      mes = message.buttonsMessage;
      type = Object.keys(mes)[0];
    }
    try {
      if (pathFile) {
        const stream = await downloadContentFromMessage(
          mes[type],
          mimeMap[type]
        );
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        await fs.promises.writeFile(pathFile, buffer);
        resolve(pathFile);
      } else {
        const stream = await downloadContentFromMessage(
          mes[type],
          mimeMap[type]
        );
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        resolve(buffer);
      }
    } catch (e) {
      reject(e);
    }
  });
async function serialize(msg, conn) {
  msg.decodeJid = (jid) => {
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      ).trim();
    } else return jid;
  };

  msg.getName = (jid, withoutContact = false) => {
    id = msg.decodeJid(jid);
    withoutContact = conn.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = conn.groupMetadata(id) || {};
        resolve(
          v.name ||
            v.subject ||
            require("awesome-phonenumber")(
              "+" + id.replace("@s.whatsapp.net", "")
            ).getNumber("international")
        );
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === msg.decodeJid(conn.user.id)
          ? conn.user
          : store.contacts[id] || {};
    return (
      (withoutContact ? "" : v.name) ||
      v.subject ||
      v.verifiedName ||
      require("awesome-phonenumber")(
        "+" + jid.replace("@s.whatsapp.net", "")
      ).getNumber("international")
    );
  };
  conn.getBuffer = async (url, options) => {
    try {
      options ? options : {};
      const res = await require("axios")({
        method: "get",
        url,
        headers: {
          DNT: 1,
          "Upgrade-Insecure-Request": 1,
        },
        ...options,
        responseType: "arraybuffer",
      });
      return res.data;
    } catch (e) {
      console.log(`Error : ${e}`);
    }
  };
  msg.sendContact = async (jid, contact, quoted = false, opts = {}) => {
    let list = [];
    for (let i of contact) {
      num = typeof i == "number" ? i + "@s.whatsapp.net" : i;
      num2 = typeof i == "number" ? i : i.split("@")[0];
      list.push({
        displayName: await conn.getName(num),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${await conn.getName(
          num
        )}\nFN:${await conn.getName(
          num
        )}\nitem1.TEL;waid=${num2}:${num2}\nitem1.X-ABLabel:Phone number\nitem4.ADR:;;India;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
      });
    }
    return conn.sendMessage(
      jid,
      {
        contacts: { displayName: `${list.length} Contact`, contacts: list },
        ...opts,
      },
      { quoted }
    );
  };

  /**
   *
   * @param {*} jid
   * @param {*} path
   * @param {*} quoted
   * @param {*} options
   * @returns
   */

  conn.logger = {
    ...conn.logger,
    info() {
      console.log();
    },
    error() {
      console.log();
    },
    warn() {
      console.log();
    },
  };

  if (msg.key) {
    msg.id = msg.key.id;
    msg.isSelf = msg.key.fromMe;
    msg.from = msg.key.remoteJid;
    msg.isGroup = msg.from.endsWith("@g.us");
    msg.sender = msg.isGroup
      ? msg.decodeJid(msg.key.participant)
      : msg.isSelf
      ? msg.decodeJid(conn.user.id)
      : msg.from;
  }
  if (msg.message) {
    msg.type = getContentType(msg.message);
    if (msg.type === "ephemeralMessage") {
      msg.message = msg.message[msg.type].message;
      const tipe = Object.keys(msg.message)[0];
      msg.type = tipe;
      if (tipe === "viewOnceMessage") {
        msg.message = msg.message[msg.type].message;
        msg.type = getContentType(msg.message);
      }
    }
    if (msg.type === "viewOnceMessage") {
      msg.message = msg.message[msg.type].message;
      msg.type = getContentType(msg.message);
    }

    try {
      msg.mentions = msg.message[msg.type].contextInfo
        ? msg.message[msg.type].contextInfo.mentionedJid || []
        : [];
    } catch {
      msg.mentions = false;
    }
    try {
      const quoted = msg.message[msg.type].contextInfo;
      if (quoted.quotedMessage["ephemeralMessage"]) {
        const tipe = Object.keys(
          quoted.quotedMessage.ephemeralMessage.message
        )[0];
        if (tipe === "viewOnceMessage") {
          msg.quoted = {
            type: "view_once",
            stanzaId: quoted.stanzaId,
            sender: msg.decodeJid(quoted.participant),
            message:
              quoted.quotedMessage.ephemeralMessage.message.viewOnceMessage
                .message,
          };
        } else {
          msg.quoted = {
            type: "ephemeral",
            stanzaId: quoted.stanzaId,
            sender: msg.decodeJid(quoted.participant),
            message: quoted.quotedMessage.ephemeralMessage.message,
          };
        }
      } else if (quoted.quotedMessage["viewOnceMessage"]) {
        msg.quoted = {
          type: "view_once",
          stanzaId: quoted.stanzaId,
          sender: msg.decodeJid(quoted.participant),
          message: quoted.quotedMessage.viewOnceMessage.message,
        };
      } else {
        msg.quoted = {
          type: "normal",
          stanzaId: quoted.stanzaId,
          sender: msg.decodeJid(quoted.participant),
          message: quoted.quotedMessage,
        };
      }
      msg.quoted.isSelf = msg.quoted.sender === msg.decodeJid(conn.user.id);
      msg.quoted.mtype = Object.keys(msg.quoted.message).filter(
        (v) => v.includes("Message") || v.includes("conversation")
      )[0];
      msg.quoted.text =
        msg.quoted.message[msg.quoted.mtype].text ||
        msg.quoted.message[msg.quoted.mtype].description ||
        msg.quoted.message[msg.quoted.mtype].caption ||
        (msg.quoted.mtype == "templateButtonReplyMessage" &&
          msg.quoted.message[msg.quoted.mtype].hydratedTemplate[
            "hydratedContentText"
          ]) ||
        msg.quoted.message[msg.quoted.mtype] ||
        "";
      msg.quoted.key = {
        id: msg.quoted.stanzaId,
        fromMe: msg.quoted.isSelf,
        remoteJid: msg.from,
      };
      msg.quoted.delete = () =>
        conn.sendMessage(msg.from, { delete: msg.quoted.key });
      msg.quoted.download = (pathFile) =>
        downloadMedia(msg.quoted.message, pathFile);
    } catch (e) {
      msg.quoted = null;
    }
    try {
      msg.body =
        msg.message.conversation ||
        msg.message[msg.type].text ||
        msg.message[msg.type].caption ||
        (msg.type === "listResponseMessage" &&
          msg.message[msg.type].singleSelectReply.selectedRowId) ||
        (msg.type === "buttonsResponseMessage" &&
          msg.message[msg.type].selectedButtonId &&
          msg.message[msg.type].selectedButtonId) ||
        (msg.type === "templateButtonReplyMessage" &&
          msg.message[msg.type].selectedId) ||
        "";
    } catch {
      msg.body = "";
    }
    msg.getQuotedObj = msg.getQuotedMessage = async () => {
      if (!msg.quoted.stanzaId) return false;
      let q = await store.loadMessage(msg.from, msg.quoted.stanzaId, conn);
      return serialize(q, conn);
    };
    conn.getFile = async (PATH, returnAsFilename) => {
      let res, filename;
      let data = Buffer.isBuffer(PATH)
        ? PATH
        : /^data:.*?\/.*?;base64,/i.test(PATH)
        ? Buffer.from(PATH.split`,`[1], "base64")
        : /^https?:\/\//.test(PATH)
        ? await (res = await fetch(PATH)).buffer()
        : fs.existsSync(PATH)
        ? ((filename = PATH), fs.readFileSync(PATH))
        : typeof PATH === "string"
        ? PATH
        : Buffer.alloc(0);
      if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");
      let type = (await fromBuffer(data)) || {
        mime: "application/octet-stream",
        ext: ".bin",
      };
      if (data && returnAsFilename && !filename)
        (filename = path.join(
          __dirname,
          "../tmp/" + new Date() * 1 + "." + type.ext
        )),
          await fs.promises.writeFile(filename, data);
      return {
        res,
        filename,
        ...type,
        data,
      };
    };
    /**
     *
     * @param {*} jid
     * @param {*} path
     * @param {*} quoted
     * @param {*} options
     * @returns
     */
    conn.sendImageAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifImg(buff, options);
      } else {
        buffer = await imageToWebp(buff);
      }
      await conn.sendMessage(jid, { sticker:{url:buffer}, ...options }, options);
    };

    /**
     *
     * @param {*} jid
     * @param {*} path
     * @param {*} quoted
     * @param {*} options
     * @returns
     */
    conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifVid(buff, options);
      } else {
        buffer = await videoToWebp(buff);
      }
      await conn.sendMessage(jid, { sticker:{url:buffer}, ...options }, options);
    };
    msg.sendFromUrl = async (
      path,
      filename = "",
      caption = "",
      quoted,
      ptt = false,
      options = {}
    ) => {
      let type = await conn.getFile(path, true);
      let { res, data: file, filename: pathFile } = type;
      if ((res && res.status !== 200) || file.length <= 65536) {
        try {
          throw { json: JSON.parse(file.toString()) };
        } catch (e) {
          if (e.json) throw e.json;
        }
      }
      let opt = { filename };
      if (quoted) opt.quoted = quoted;
      if (!type) if (options.asDocument) options.asDocument = true;
      let mtype = "",
        mimetype = type.mime;
      let naem = (a) => "./tmp/" + Date.now() + "." + a;
      if (/webp/.test(type.mime)) mtype = "sticker";
      else if (/image/.test(type.mime)) mtype = "image";
      else if (/video/.test(type.mime)) mtype = "video";
      else if (/audio/.test(type.mime))
        (ss = await (ptt ? toPTT : toAudio2)(file, type.ext)),
          (skk = await require("file-type").fromBuffer(ss.data)),
          (ty = naem(skk.ext)),
          require("fs").writeFileSync(ty, ss.data),
          (pathFile = ty),
          (mtype = "audio"),
          (mimetype = "audio/mpeg");
      else mtype = "document";
      conn
        .sendMessage(
          msg.from,
          {
            ...options,
            caption,
            ptt,
            fileName: filename,
            [mtype]: { url: pathFile },
            mimetype,
          },
          {
            ...opt,
            ...options,
          }
        )
        .then(() => {
          fs.unlinkSync(pathFile);
        });
    };
    msg.reply = async (text, opt = "") =>
      conn.sendMessage(
        msg.from,
        {
          text: require("util").format(text),
          mentions: opt.withTag
            ? [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
                (v) => v[1] + "@s.whatsapp.net"
              )
            : [],
          ...opt,
        },
        { ...opt, quoted: msg }
      );
    msg.send = async (text, opt) =>
      conn.sendMessage(
        msg.from,
        {
          text: require("util").format(text),
          ...opt,
        },
        { ...opt }
      );
    msg.download = (pathFile) => downloadMedia(msg.message, pathFile);
  }
  return msg;
}

module.exports = { serialize, downloadMedia };