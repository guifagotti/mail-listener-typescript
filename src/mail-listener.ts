import {
    IOptions,
    IMailBox,
    IMailObject,
    IMailAttachment,
  } from "./types/config";
  var Imap = require("imap");
  var EventEmitter = require("events").EventEmitter;
  var simpleParser = require("mailparser").simpleParser;
  var fs = require("fs");
  var async = require("async");
  
  export class MailListener extends EventEmitter {
    constructor(options: IOptions) {
      super();
      this.markSeen = false;
      this.mailbox = options.mailbox || "INBOX";
      if ("string" === typeof options.searchFilter) {
        this.searchFilter = [options.searchFilter];
      } else {
        this.searchFilter = options.searchFilter || ["UNSEEN"];
      }
      if (options.attachments && options.attachmentOptions === undefined) {
        throw new Error('Missing attachmentOptions inside options when attachments = true')  
      }
      this.fetchUnreadOnStart = options.fetchUnreadOnStart || false;
      this.mailParserOptions = options.mailParserOptions || {};
      if (
        options.attachments &&
        options.attachmentOptions &&
        options.attachmentOptions.stream
      ) {
        this.mailParserOptions.streamAttachments = true;
      }
      this.attachmentOptions = options.attachmentOptions || {};
      this.attachments = options.attachments || false;
      this.attachmentOptions.directory = this.attachmentOptions.directory
        ? this.attachmentOptions.directory
        : "";
      this.imap = new Imap({
        xoauth2: options.xoauth2,
        user: options.username,
        password: options.password,
        host: options.host,
        port: options.port,
        tls: options.tls,
        tlsOptions: options.tlsOptions || {},
        connTimeout: options.connTimeout || null,
        authTimeout: options.authTimeout || null,
        debug: console.log(),
      });
      this.imap.once("ready", this.imapReady.bind(this));
      this.imap.once("close", this.imapClose.bind(this));
      this.imap.on("error", this.imapError.bind(this));
    }
  
    start() {
      this.imap.connect();
    }
  
    stop() {
      this.imap.end();
    }
  
    imapReady() {
      this.imap.openBox(this.mailbox, false, (error: any, mailbox: IMailBox) => {
        if (error) {
          console.log("Error", error);
          this.emit("error", error);
        } else {
          console.log( `Mailbox server connected`)
          this.emit("Mailbox:connected");
          this.emit("mailbox", mailbox);
          if (this.fetchUnreadOnStart) {
            this.parseUnread.call(this);
          }
          let listener = this.imapMail.bind(this);
          this.imap.on("mail", listener);
          this.imap.on("update", listener);
        }
      });
    }
  
    imapClose() {
      this.emit("server:disconnected");
    }
  
    imapError(error: any) {
      console.log(error);
      this.emit("error", error);
    }
  
    imapMail() {
      this.parseUnread.call(this);
    }
  
    parseUnread() {
      let self = this;
      self.imap.search(self.searchFilter, (error: any, results: string[]) => {
        
        try {
          if (error) {
            self.emit("error search", error);
          } else if (results.length > 0) {
            async.each(
              results,
              (result: any, callback: any) => {
                console.log('Mail processing...')
                let f = self.imap.fetch(result, {
                  bodies: "",
                  markSeen: self.markSeen,
                });
                f.on("message", (msg: any, seqno: any) => {
                  msg.on("body", async (stream: any, info: any) => {
                    let parsed: IMailObject = await simpleParser(stream);
                    self.emit("mail", parsed, seqno);
                    self.emit("headers", parsed.headers, seqno);
                    self.emit(
                      "body",
                      {
                        html: parsed.html,
                        text: parsed.text,
                        textAsHtml: parsed.textAsHtml,
                      },
                      seqno
                    );
  
                    let attachments: IMailAttachment[] = parsed.attachments;
                    if (attachments.length > 0) {
                      for (let att of attachments) {
                        if (
                          self.attachments &&
                          self.attachmentOptions.saveAttachments
                        ) {
                          fs.mkdir(
                            `${self.attachmentOptions.directory}`,
                            { recursive: true },
                            async (err: Error) => {
                              if (err) {
                                console.log(
                                  `Error on create path: ${self.attachmentOptions.directory}`
                                );
                                self.emit(
                                  "error",
                                  `Error on create path: ${self.attachmentOptions.directory}`
                                );
                              } else {
                                let fileExists = fs.existsSync(
                                  `${self.attachmentOptions.directory}${att.filename}`
                                );
  
                                if (fileExists) {
                                  console.log(
                                    `The file ${att.filename} already exists on path: ${self.attachmentOptions.directory}`
                                  );
                                  self.emit(
                                    "error",
                                    `The file ${att.filename} already exists on path: ${self.attachmentOptions.directory}`
                                  );
                                } else {
                                  await fs.writeFileSync(
                                    `${self.attachmentOptions.directory}${att.filename}`,
                                    att.content,
                                    (error: any) => {
                                      if (error) {
                                        console.log("Error on save attachment file: ", error);
                                        self.emit("error", error);
                                      } else console.log("The file was saved!");
                                    }
                                  );
                                  self.emit(
                                    "attachment",
                                    att,
                                    `${self.attachmentOptions.directory}${att.filename}`,
                                    seqno
                                  );
                                }
                              }
                            }
                          );
                        } else if (
                          self.attachments &&
                          self.attachmentOptions.stream
                        ) {
                          self.emit("attachment", att, null, seqno);
                        }
                      }
                    }
                  });
                });
                f.once("error", (error: any) => {
                  self.emit("error", error);
                });
              },
              (error: any) => {
                if (error) {
                  self.emit("error", error);
                }
              }
            );
          }
        } catch (error) {
          self.emit("error", error);
        }
      });
    }
  }