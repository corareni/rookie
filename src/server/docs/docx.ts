import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import type { CvContent, LetterContent } from "@/lib/documents";

const FONT = "Times New Roman";
// A4 width minus 20 mm margins each side, as a right tab stop for locations and dates.
const RIGHT = convertMillimetersToTwip(170);

const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics });

const heading = (text: string) =>
  new Paragraph({
    spacing: { before: 160, after: 50 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
    children: [run(text.toUpperCase(), { bold: true, size: 22 })],
  });

const split = (left: TextRun[], right: string) =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT }],
    children: [...left, run(`\t${right}`, { bold: true })],
  });

const bullet = (children: TextRun[]) => new Paragraph({ numbering: { reference: "dots", level: 0 }, children });

const page = {
  page: {
    size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
    margin: {
      top: convertMillimetersToTwip(12),
      bottom: convertMillimetersToTwip(10),
      left: convertMillimetersToTwip(20),
      right: convertMillimetersToTwip(20),
    },
  },
};

const numbering = {
  config: [
    {
      reference: "dots",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } },
        },
      ],
    },
  ],
};

export async function cvDocx(cv: CvContent): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(cv.header.name.toUpperCase(), { bold: true, size: 29 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(cv.header.contact.join(" | "))] }),
  ];
  if (cv.header.note) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(cv.header.note, { italics: true })] }));
  children.push(heading("Summary"), new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [run(cv.summary)] }));

  for (const sec of cv.sections) {
    children.push(heading(sec.heading));
    if (sec.kind === "entries") {
      for (const e of sec.entries) {
        children.push(
          split([run(e.org.toUpperCase(), { bold: true }), ...(e.org_note ? [run(` - ${e.org_note}`, { bold: true, italics: true })] : [])], e.location),
          split([run(e.role, { bold: true }), ...(e.role_note ? [run(` (${e.role_note})`, { italics: true })] : [])], e.dates),
          ...e.bullets.filter((b) => b.trim()).map((b) => bullet([run(b)])),
        );
      }
    } else {
      children.push(...sec.lines.map((l) => bullet([run(`${l.label}: `, { bold: true }), run(l.text)])));
    }
  }

  const doc = new Document({ creator: cv.header.name, title: `${cv.header.name} - CV`, numbering, sections: [{ properties: page, children }] });
  return Packer.toBuffer(doc);
}

export async function letterDocx(l: LetterContent, contact: { name?: string; line: string }): Promise<Buffer> {
  const p = (runs: TextRun[], before = 0, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    new Paragraph({ spacing: { before }, alignment: align, children: runs });
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const children = [
    p([run((contact.name ?? "").toUpperCase(), { bold: true, size: 34 })], 0, AlignmentType.CENTER),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 4 } },
      children: [run(contact.line, { size: 19 })],
    }),
    p([run(date, { size: 21 })], 280),
    ...l.addressee.map((a, i) => p([run(a, { size: 21 })], i === 0 ? 200 : 0)),
    p([run(`Re: ${l.re}`, { bold: true, size: 21 })], 200),
    p([run(l.greeting, { size: 21 })], 200),
    ...l.paragraphs.map((x) => p([run(x, { size: 21 })], 140, AlignmentType.JUSTIFIED)),
    p([run(l.closing, { size: 21 })], 200),
    p([run(contact.name ?? "", { size: 21 })]),
  ];
  const doc = new Document({ creator: contact.name, title: "Cover letter", sections: [{ properties: page, children }] });
  return Packer.toBuffer(doc);
}
