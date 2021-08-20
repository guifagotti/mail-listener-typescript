export interface IOptions {
  username: string;
  password: string;
  xoauth2?: string;
  host: string;
  port: number;
  tls: boolean;
  autotls?: string;
  connTimeout?: number;
  authTimeout?: number;
  socketTimeout?: number;
  debug?: any;
  tlsOptions: { rejectUnauthorized: boolean };
  mailbox: string;
  searchFilter: string[];
  markSeen: boolean;
  fetchUnreadOnStart: boolean;
  mailParserOptions?: { streamAttachments: boolean };
  attachments: boolean;
  attachmentOptions?: {
    saveAttachments: boolean;
    directory: string;
    stream: boolean;
  };
}
export interface IMailBox {
  name: string;
  flags: string[];
  readOnly: boolean;
  uidvalidity: number;
  uidnext: number;
  permFlags: string[];
  keywords: string[];
  newKeywords: boolean;
  persistentUIDs: boolean;
  nomodseq: boolean;
  messages: { total: number; new: number };
}

export interface IMailObject {
  headers: object[];
  subject: string;
  from: {
    value: [{ address: string; name: string }];
    html: string;
    text: string;
  };
  to: object;
  cc?: object;
  bcc?: object;
  date: string;
  messageId: string;
  inReplyTo: string;
  "reply-to": object;
  references: string[];
  html: string;
  text: string;
  textAsHtml: string;
  attachments: IMailAttachment[];
}

export interface IMailAttachment {
  type: string;
  content: Buffer;
  contentType: string;
  partId: string;
  release: any | null;
  contentDisposition: string;
  filename: string;
  contentId: string;
  cid: string;
  headers: any;
  checksum: string;
  size: number;
}
